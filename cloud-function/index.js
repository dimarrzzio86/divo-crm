// DIVO CRM — Yandex Cloud Function (Node.js 18+)
// Прокси к Supabase: обходит блокировку supabase.co в РФ
// Эндпоинты: /rest/v1/*, /realtime/*, /auth/*, /send-push
//
// ВАЖНО: НЕ устанавливаем CORS-заголовки сами!
// Yandex Cloud gateway автоматически добавляет:
//   Access-Control-Allow-Origin: <origin>
//   Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
//   Access-Control-Allow-Headers: *
// Если мы добавим свои — будет дубль → браузер заблокирует

const SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

// CORS заголовки которые Yandex gateway добавляет сам — НЕ возвращаем из функции
const CORS_HEADER_NAMES = [
  'access-control-allow-origin',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age'
];

function isCorsHeader(name) {
  return CORS_HEADER_NAMES.indexOf((name || '').toLowerCase()) !== -1;
}

module.exports.handler = async (event, context) => {
  // CORS preflight — Yandex gateway обработает сам, просто возвращаем 200
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: {}, body: '' };
  }

  try {
    // Путь может быть в event.path или в queryStringParameters.path
    let path = event.params?.path || event.path || '';
    // Очищаем путь от префикса /api/ если есть
    path = path.replace(/^\/api\//, '/');
    if (!path.startsWith('/')) path = '/' + path;
    // Защита от выхода за пределы
    if (path.includes('..')) {
      return { statusCode: 400, headers: {}, body: JSON.stringify({ error: 'Invalid path' }) };
    }

    // Query параметры
    const query = event.multiQueryStringParameters || event.queryStringParameters || {};
    // Удаляем наш параметр path если он есть
    delete query.path;
    const queryString = new URLSearchParams(query).toString();
    const supabaseUrl = queryString
      ? `${SUPABASE_URL}${path}?${queryString}`
      : `${SUPABASE_URL}${path}`;

    // Заголовки
    const headers = { ...(event.headers || {}) };
    // Удаляем хост и служебные
    delete headers['host'];
    delete headers['Host'];
    delete headers['x-yc-api-key'];
    delete headers['x-function'];
    // Удаляем apikey/Authorization от клиента — подставим свой
    delete headers['apikey'];
    delete headers['Apikey'];
    delete headers['Authorization'];
    delete headers['authorization'];
    // Добавляем Supabase ключи
    headers['apikey'] = SUPABASE_KEY;
    headers['Authorization'] = 'Bearer ' + SUPABASE_KEY;

    // Тело запроса
    let body = event.body || null;
    if (event.isBase64Encoded) {
      body = Buffer.from(body, 'base64');
    }

    const fetchOptions = {
      method: event.httpMethod,
      headers,
      redirect: 'manual',
    };
    if (body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
      fetchOptions.body = body;
    }

    const response = await fetch(supabaseUrl, fetchOptions);
    
    // Собираем заголовки от Supabase, но НЕ дублируем CORS-заголовки
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      if (!isCorsHeader(key)) {
        responseHeaders[key] = value;
      }
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: text,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {},
      body: JSON.stringify({ error: 'Proxy error', message: error.message })
    };
  }
};
