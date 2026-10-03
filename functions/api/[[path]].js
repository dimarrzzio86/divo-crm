// Cloudflare Pages Function — прокси к Supabase
// Обходит блокировку: запросы идут через divo-crm.pages.dev/api/...
// а не напрямую к jnbqzngsglnjzzpsvvgn.supabase.co

const SUPABASE_HOST = 'jnbqzngsglnjzzpsvvgn.supabase.co';

export async function onRequest(context) {
  const { request, params } = context;

  // params.path — массив сегментов пути, например ['rest','v1','orders']
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

  // Собираем новый URL
  const url = new URL(request.url);
  const supaUrl = 'https://' + SUPABASE_HOST + '/' + path + url.search;

  // Копируем все заголовки, кроме host (иначе Supabase отклонит)
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('Host', SUPABASE_HOST);

  // Создаём новый запрос
  const newRequest = new Request(supaUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'manual'
  });

  // Выполняем запрос к Supabase
  const response = await fetch(newRequest);

  // Возвращаем ответ с правильными заголовками
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Access-Control-Allow-Origin', '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*');

  // Обработка preflight запроса
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: newHeaders
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
