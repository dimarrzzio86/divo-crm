// DIVO CRM — Cloudflare Pages Advanced Mode (_worker.js)
// Web Push по RFC 8291 (aes128gcm) + VAPID (RFC 8292)

const VAPID_PRIVATE_JWK = {
  kty: 'EC', crv: 'P-256',
  d: 'kEoDJEkzy7UJRWxYgxcMjg9wstv8VivWh4KvHdIjPpw',
  x: 'GbvATwZ4yUe2pDdWJLkyWUjYp1AVhyd9U40NsNkn-Ws',
  y: 'OJKKEV9vIdsbC8XCMMi-mZNJ1AU2fIa2HXc7VLDHZ3g',
  ext: true
};
const VAPID_PUBLIC_KEY = 'BBm7wE8GeMlHtqQ3ViS5MllI2KdQFYcnfVONDbDZJ_lrOJKKEV9vIdsbC8XCMMi-mZNJ1AU2fIa2HXc7VLDHZ3g';
const VAPID_SUBJECT = 'mailto:admin@divo-crm.pages.dev';

const SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

const PUSH_SECRET = 'divo-push-2026-secret';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers': '*'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    if (path === '/api/send-push' && request.method === 'POST') {
      return handleSendPush(request);
    }

    // === ПРОКСИ К SUPABASE — обходит блокировку supabase.co в РФ ===
    if (path.startsWith('/api/rest/') || path.startsWith('/api/realtime/') || path.startsWith('/api/auth/')) {
      return handleSupabaseProxy(request, path, url);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};

// === ПРОКСИ К SUPABASE ===
// Запросы /api/rest/v1/... → https://jnbqzngsglnjzzpsvvgn.supabase.co/rest/v1/...
async function handleSupabaseProxy(request, path, url) {
  const SUPABASE_HOST = 'jnbqzngsglnjzzpsvvgn.supabase.co';
  
  // Заменяем /api/rest/ на /rest/, /api/realtime/ на /realtime/ и т.д.
  const supaPath = path.replace(/^\/api\//, '/');
  const supaUrl = 'https://' + SUPABASE_HOST + supaPath + url.search;

  // Копируем заголовки, меняем Host на supabase.co
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('Host', SUPABASE_HOST);

  const newRequest = new Request(supaUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  const response = await fetch(newRequest);

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

async function handleSendPush(request) {
  try {
    const data = await request.json();

    if (data.secret !== PUSH_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { title, body, url: clickUrl } = data;

    // Берём все подписки, отсортированные по дате (новые первыми)
    const subsResponse = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });

    if (!subsResponse.ok) {
      throw new Error('Supabase error: ' + subsResponse.status);
    }

    const allSubs = await subsResponse.json();

    if (!allSubs.length) {
      return json({ sent: 0, message: 'Нет подписок' });
    }

    // Дедупликация: только последняя подписка каждого пользователя
    const seenUsers = new Set();
    const uniqueSubs = [];
    for (const sub of allSubs) {
      const key = sub.user_email || sub.endpoint;
      if (!seenUsers.has(key)) {
        seenUsers.add(key);
        uniqueSubs.push(sub);
      }
    }

    let sent = 0;
    let failed = 0;
    let errors = [];

    for (const sub of uniqueSubs) {
      try {
        const payload = JSON.stringify({
          title: title || 'DIVO CRM',
          body: body || 'Новое уведомление',
          url: clickUrl || '/tasks.html'
        });

        await sendWebPush(sub, payload);
        sent++;
      } catch (e) {
        console.error('Push failed for', sub.user_email, e.message);
        errors.push({ user: sub.user_email, error: e.message });
        failed++;
      }
    }

    return json({ sent, failed, total: uniqueSubs.length, duplicates: allSubs.length - uniqueSubs.length, errors: errors.slice(0, 3) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// ============ Web Push по RFC 8291 + VAPID ============

async function sendWebPush(sub, payload) {
  const endpoint = sub.endpoint;
  const p256dh = sub.p256dh;
  const auth = sub.auth;

  // 1. JWT для VAPID
  const audience = new URL(endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const jwtPayload = { aud: audience, exp: expiry, sub: VAPID_SUBJECT };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
  const data = `${encHeader}.${encPayload}`;

  const key = await importVapidKey();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(data)
  );
  const encSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${data}.${encSignature}`;

  // 2. Шифруем payload (RFC 8291)
  const encrypted = await encryptPayload(payload, p256dh, auth);

  // 3. Отправляем
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Urgency': 'high',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY.replace(/=/g, '')}`
    },
    body: encrypted
  });

  if (!response.ok && response.status !== 201 && response.status !== 202) {
    const errText = await response.text().catch(() => '');
    throw new Error('Push failed: ' + response.status + ' ' + errText.substring(0, 200));
  }
}

async function importVapidKey() {
  return crypto.subtle.importKey(
    'jwk',
    VAPID_PRIVATE_JWK,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// ============ Шифрование payload (RFC 8291) ============

async function encryptPayload(payload, p256dhBase64, authBase64) {
  const uaPublicKey = base64UrlDecode(p256dhBase64);  // 65 bytes (0x04 + 32 + 32)
  const authSecret = base64UrlDecode(authBase64);     // 16 bytes

  // 1. Генерируем ключевую пару сервера (ECDH P-256)
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // 2. Импортируем публичный ключ пользователя (UA public key)
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // 3. ECDH shared secret (ecdh_secret)
  const ecdhSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    serverKeyPair.privateKey,
    256
  );

  // 4. AS public key (raw, 65 bytes)
  const asPublicKey = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  // 5. PRK_key = HMAC-SHA-256(auth_secret, ecdh_secret)  [RFC 8291 §3.3]
  //    Это HKDF-Extract с salt=auth_secret, IKM=ecdh_secret
  const prkKey = await hmacSha256(authSecret, new Uint8Array(ecdhSecret));

  // 6. key_info = "WebPush: info" || 0x00 || ua_public || as_public  [RFC 8291 §3.3]
  const keyInfoBase = new TextEncoder().encode('WebPush: info\0');
  const keyInfo = new Uint8Array(keyInfoBase.length + uaPublicKey.length + asPublicKey.byteLength);
  keyInfo.set(keyInfoBase, 0);
  keyInfo.set(uaPublicKey, keyInfoBase.length);
  keyInfo.set(new Uint8Array(asPublicKey), keyInfoBase.length + uaPublicKey.length);

  // 7. IKM = HMAC-SHA-256(PRK_key, key_info || 0x01)  → HKDF-Expand(PRK_key, key_info, 32)
  const ikm = await hmacSha256(prkKey, keyInfo, 0x01);

  // 8. Случайная соль (16 bytes)
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // 9. PRK = HMAC-SHA-256(salt, IKM)  → HKDF-Extract(salt, IKM)
  const prk = await hmacSha256(salt, ikm);

  // 10. cek_info = "Content-Encoding: aes128gcm" || 0x00  [RFC 8188]
  //     CEK = HKDF-Expand(PRK, cek_info, 16)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const cek = (await hmacSha256(prk, cekInfo, 0x01)).slice(0, 16);

  // 11. nonce_info = "Content-Encoding: nonce" || 0x00
  //     NONCE = HKDF-Expand(PRK, nonce_info, 12)
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');
  const nonce = (await hmacSha256(prk, nonceInfo, 0x01)).slice(0, 12);

  // 12. Шифруем payload + padding (RFC 8188: padding delimiter = 0x02)
  const plaintext = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(plaintext.length + 1);
  paddedPayload.set(plaintext, 0);
  paddedPayload[plaintext.length] = 0x02;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']),
    paddedPayload
  );

  // 13. Формируем заголовок RFC 8188 (aes128gcm):
  //     salt (16) + rs (4, big-endian) + idlen (1) + as_public_key (65)
  const idLen = 65;
  const headerSize = 16 + 4 + 1 + idLen;  // 86 bytes
  const header = new Uint8Array(headerSize);
  const dv = new DataView(header.buffer);

  header.set(salt, 0);                          // bytes 0-15: salt
  dv.setUint32(16, 4096);                       // bytes 16-19: rs (record size) = 4096
  dv.setUint8(20, idLen);                       // byte 20: idlen
  header.set(new Uint8Array(asPublicKey), 21);  // bytes 21-85: AS public key

  // 14. Склеиваем header + encrypted (ciphertext + auth tag)
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

// HMAC-SHA-256 с опциональным suffix-байтом (как в RFC 8291: info || 0x01)
async function hmacSha256(keyBytes, dataBytes, suffixByte) {
  const data = suffixByte !== undefined
    ? new Uint8Array(dataBytes.length + 1)
    : dataBytes;
  if (suffixByte !== undefined) {
    data.set(dataBytes, 0);
    data[dataBytes.length] = suffixByte;
  }
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = await crypto.subtle.sign('HMAC', key, data);
  return new Uint8Array(result);
}

// ============ Base64URL ============

function base64UrlEncode(bytes) {
  const arr = new Uint8Array(bytes);
  let str = '';
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str) {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}
