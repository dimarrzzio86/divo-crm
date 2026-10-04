// DIVO CRM — Yandex Cloud Function (Node.js 18+)
// Прокси к Supabase: обходит блокировку supabase.co в РФ
// Эндпоинты: /rest/v1/*, /realtime/*, /auth/*, /send-push

const SUPABASE_URL = 'https://jnbqzngsglnjzzpsvvgn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYnF6bmdzZ2xuanp6cHN2dmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzIwOTEsImV4cCI6MjEwNDgwODA5MX0.uHVMUKBtO0326KB3bAHQ8rywBvBms7WvfaxPrhm3_Y0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

module.exports.handler = async (event, context) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsResponse(200, '');
  }

  try {
    // Путь может быть в event.path или в queryStringParameters.path
    let path = event.params?.path || event.path || '';
    // Очищаем путь от префикса /api/ если есть
    path = path.replace(/^\/api\//, '/');
    if (!path.startsWith('/')) path = '/' + path;
    // Защита от выхода за пределы
    if (path.includes('..')) {
      return corsResponse(400, { error: 'Invalid path' });
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
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: { ...responseHeaders, ...CORS_HEADERS },
      body: text,
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return corsResponse(500, {
      error: 'Proxy error',
      message: error.message,
    });
  }
};
