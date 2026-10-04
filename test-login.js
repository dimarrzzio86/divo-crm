const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();

  // Mobile viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  // Собираю console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Собираю ошибки страниц
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(`[PAGE ERROR] ${error.message}\n${error.stack || ''}`);
  });

  // Собираю все network запросы со статусами
  const networkRequests = [];
  page.on('requestfinished', async req => {
    const url = req.url();
    if (url.includes('yandexcloud') || url.includes('functions.yandex') || url.includes('divo-crm')) {
      try {
        const resp = req.response();
        if (resp) {
          const status = resp.status();
          networkRequests.push(`${req.method()} ${url.substring(0, 120)} → ${status}`);
        }
      } catch (e) {}
    }
  });

  // Собираю failed requests
  page.on('requestfailed', req => {
    const url = req.url();
    if (url.includes('yandexcloud') || url.includes('functions.yandex')) {
      const failure = req.failure();
      networkRequests.push(`FAILED ${req.method()} ${url.substring(0, 120)} → ${failure ? failure.errorText : 'unknown'}`);
    }
  });

  console.log('=== Открываю divo-crm.website.yandexcloud.net ===');
  // Принудительно сбрасываем кеш
  await page.setCacheEnabled(false);
  await page.goto('https://divo-crm.website.yandexcloud.net/index.html?v=261&cb=' + Date.now(), {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Жду загрузки формы
  await new Promise(r => setTimeout(r, 3000));

  // Скриншот
  await page.screenshot({ path: '/tmp/page_before_login.png', fullPage: true });
  console.log('Скриншот: /tmp/page_before_login.png');

  // Проверяю что есть форма логина
  const loginInput = await page.$('#divoAuthLogin');
  const passInput = await page.$('#divoAuthPassword');
  const loginBtn = await page.$('#divoAuthBtn');

  console.log('=== Форма логина ===');
  console.log('Login input:', !!loginInput);
  console.log('Password input:', !!passInput);
  console.log('Login button:', !!loginBtn);

  if (!loginInput || !passInput || !loginBtn) {
    console.log('❌ Форма логина не найдена!');
    console.log('=== HTML body (первые 2000 символов) ===');
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log(html.substring(0, 2000));
  } else {
    // Ввожу логин/пароль
    console.log('\n=== Ввожу admin / adminadmin ===');
    await loginInput.type('admin');
    await passInput.type('adminadmin');

    // Скриншот после ввода
    await page.screenshot({ path: '/tmp/page_after_input.png' });

    // Нажимаю кнопку
    console.log('Нажимаю кнопку Войти...');
    await loginBtn.click();

    // Жду 5 секунд
    await new Promise(r => setTimeout(r, 5000));

    // Скриншот после клика
    await page.screenshot({ path: '/tmp/page_after_login.png' });

    // Проверяю статус
    const status = await page.evaluate(() => {
      const el = document.getElementById('divoAuthStatus');
      return el ? el.textContent : 'NO STATUS ELEMENT';
    });
    console.log('Статус:', status);

    // Проверяю localStorage
    const auth = await page.evaluate(() => localStorage.getItem('divo_auth'));
    console.log('localStorage divo_auth:', auth);
  }

  console.log('\n=== Network requests ===');
  networkRequests.forEach(r => console.log(r));

  console.log('\n=== Console logs ===');
  consoleLogs.forEach(l => console.log(l));

  console.log('\n=== Page errors ===');
  pageErrors.forEach(e => console.log(e));

  await browser.close();
})();
