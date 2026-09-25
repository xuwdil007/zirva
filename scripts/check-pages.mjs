import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// Проверяем именно production-сборку, опубликованную внутри /zirva/.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const failedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('http://localhost:4173/zirva/', { waitUntil: 'networkidle' });
  assert.equal(await page.title(), 'Zirva');
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Направления' }).click();
  await page.waitForURL('**/zirva/#expertise');
  await page.getByRole('button', { name: 'Подробнее о направлении' }).first().click();
  await page.locator('#service-01').waitFor();
  await page.locator('.footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  const background = await page.locator('.hero-photo').evaluate(e => getComputedStyle(e).backgroundImage);
  assert.ok(background.includes('/zirva/assets/'), background);
  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  assert.ok(icon.startsWith('/zirva/'));
  await page.getByRole('link', { name: 'Вернуться наверх' }).click();
  await page.waitForURL('**/zirva/#home');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('navigation', { name: 'Основная навигация' }).getByRole('link', { name: 'Контакты' }).click();
  await page.waitForURL('**/zirva/#contacts');
  assert.equal(await page.getByRole('button', { name: 'Открыть меню' }).getAttribute('aria-expanded'), 'false');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  console.log('PASS: production under /zirva/, images, CSS background, fonts, favicon, anchor navigation, accordion, mobile menu.');
} finally {
  await browser.close();
}
