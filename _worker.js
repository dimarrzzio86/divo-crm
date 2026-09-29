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
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
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

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};

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
  const p256dh = base64UrlDecode(p256dhBase64);   // 65 bytes (0x04 + 32 + 32)
  const auth = base64UrlDecode(authBase64);       // 16 bytes

  // Генерируем ключевую пару сервера (ECDH P-256)
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  // Импортируем публичный ключ пользователя
  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    serverKeyPair.privateKey,
    256
  );

  // Публичный ключ сервера (raw, 65 bytes)
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  // IKM = auth_secret || ecdh_secret  (RFC 8291, section 3.2)
  const ikm = new Uint8Array(16 + 32);
  ikm.set(auth, 0);
  ikm.set(new Uint8Array(sharedSecret), 16);

  // Случайная соль (16 bytes)
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  // PRK = HKDF-Extract(salt, IKM)
  const prk = await hkdfExtract(salt, ikm);

  // info для cek: "Content-Encoding: aes128gcm" + 0x00 (RFC 8188)
  // НО в RFC 8291 info должно включать контекст:
  //   "WebPush: info" + 0x00 + user_public_key + server_public_key
  // Однако для aes128gcm (RFC 8188) info = "Content-Encoding: aes128gcm" + 0x00
  // RFC 8291 использует упрощённый info для aes128gcm
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const cek = await hkdfExpand(prk, cekInfo, 16);
  const nonce = await hkdfExpand(prk, nonceInfo, 12);

  // Шифруем payload + padding (RFC 8188: padding = 0x02 как delimiter, затем 0x00 до rs-1)
  const plaintext = new TextEncoder().encode(payload);
  // padding: просто добавляем 0x02 (padding delimiter)
  // При AES-GCM WebCrypto сам добавляет auth tag (16 bytes)
  const paddedPayload = new Uint8Array(plaintext.length + 1);
  paddedPayload.set(plaintext, 0);
  paddedPayload[plaintext.length] = 0x02;  // padding delimiter

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']),
    paddedPayload
  );

  // Формируем заголовок RFC 8188 (aes128gcm):
  //   salt (16) + rs (4, big-endian) + idlen (1) + key (idlen)
  //   rs = record size = header + plaintext + 16 (auth tag) + 1 (padding)
  //       Но обычно rs = 4096 (максимальный размер записи)
  const idLen = 65;  // raw P-256 public key
  const headerSize = 16 + 4 + 1 + idLen;  // 86 bytes
  const header = new Uint8Array(headerSize);
  const dv = new DataView(header.buffer);

  header.set(salt, 0);                 // bytes 0-15: salt
  dv.setUint32(16, 4096);              // bytes 16-19: rs (record size) = 4096
  dv.setUint8(20, idLen);              // byte 20: idlen
  header.set(new Uint8Array(serverPublicKeyRaw), 21);  // bytes 21-85: server public key

  // Склеиваем header + encrypted
  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

// ============ HKDF (RFC 5869) ============

async function hkdfExtract(salt, ikm) {
  const key = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = await crypto.subtle.sign('HMAC', key, ikm);
  return new Uint8Array(result);
}

async function hkdfExpand(prk, info, length) {
  const key = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const blocks = [];
  let prev = new Uint8Array(0);
  let i = 0;

  while (blocks.reduce((a, b) => a + b.length, 0) < length) {
    const input = new Uint8Array(prev.length + info.length + 1);
    input.set(prev, 0);
    input.set(info, prev.length);
    input[input.length - 1] = ++i;

    const result = await crypto.subtle.sign('HMAC', key, input);
    prev = new Uint8Array(result);
    blocks.push(prev);
  }

  const output = new Uint8Array(blocks.reduce((a, b) => a + b.length, 0));
  let offset = 0;
  for (const block of blocks) {
    output.set(block, offset);
    offset += block.length;
  }

  return output.slice(0, length);
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
