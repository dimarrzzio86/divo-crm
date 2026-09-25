// DIVO CRM — Cloudflare Pages Advanced Mode (_worker.js)
// Обрабатывает все запросы: статика + /api/* функции

const VAPID_PRIVATE_KEY = '1GywpgDoD_dhL65Zr7MJJLjDFid1ZAlTuIgUjsojDUo';
const VAPID_PUBLIC_KEY = 'BKzY2hG8ojeZSExtE8dR0HiY0yQ79c6MVIoBC-mCqulYb4vCO20mT5upQzFvfhjDjw5HRQbsOPgrQHlhfSre1Ek';
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

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // API endpoint: /api/send-push
    if (path === '/api/send-push' && request.method === 'POST') {
      return handleSendPush(request);
    }

    // Всё остальное — отдаём статику через Pages assets
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

    // Получаем подписки из Supabase
    const subsResponse = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });

    if (!subsResponse.ok) {
      throw new Error('Supabase error: ' + subsResponse.status);
    }

    const subscriptions = await subsResponse.json();

    if (!subscriptions.length) {
      return json({ sent: 0, message: 'Нет подписок' });
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
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
        failed++;
      }
    }

    return json({ sent, failed, total: subscriptions.length });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function sendWebPush(sub, payload) {
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth }
  };

  const audience = new URL(subscription.endpoint).origin;
  const expiry = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

  const header = { typ: 'JWT', alg: 'ES256' };
  const jwtPayload = { aud: audience, exp: expiry, sub: VAPID_SUBJECT };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
  const data = `${encHeader}.${encPayload}`;

  const key = await importVapidKey(VAPID_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(data)
  );

  const encSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${data}.${encSignature}`;

  const encrypted = await encryptPayload(payload, subscription.keys.p256dh, subscription.keys.auth);

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'TTL': '86400',
      'Content-Encoding': 'aes128gcm',
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY.replace(/=/g, '')}`
    },
    body: encrypted
  });

  if (!response.ok && response.status !== 201 && response.status !== 202) {
    throw new Error('Push failed: ' + response.status);
  }
}

async function importVapidKey(privateKeyBase64) {
  const keyData = base64UrlDecode(privateKeyBase64);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

async function encryptPayload(payload, p256dhBase64, authBase64) {
  const p256dh = base64UrlDecode(p256dhBase64);
  const auth = base64UrlDecode(authBase64);

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const userPublicKey = await crypto.subtle.importKey(
    'raw',
    p256dh,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicKey },
    serverKeyPair.privateKey,
    256
  );

  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const prkKey = await hkdfExtract(new Uint8Array(0), new Uint8Array(sharedSecret));
  const cek = await hkdfExpand(prkKey, cekInfo, 16);
  const nonce = await hkdfExpand(prkKey, nonceInfo, 12);

  const plaintext = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(plaintext.length + 1);
  paddedPayload.set(plaintext, 0);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']),
    paddedPayload
  );

  const headerSize = 21 + 65;
  const header = new Uint8Array(headerSize);
  const dv = new DataView(header.buffer);
  dv.setUint8(16, 65);
  header.set(new Uint8Array(serverPublicKeyRaw), 17);
  dv.setUint32(17 + 65, 4096);

  const result = new Uint8Array(header.length + encrypted.byteLength);
  result.set(header, 0);
  result.set(new Uint8Array(encrypted), header.length);

  return result;
}

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
