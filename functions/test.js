// Тестовая функция — проверка что Pages Functions работают
export async function onRequest(context) {
  return new Response(JSON.stringify({ 
    ok: true, 
    message: 'Pages Function works!',
    time: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
