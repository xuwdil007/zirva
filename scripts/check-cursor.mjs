import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.mouse.move(800, 250);
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.helmet-cursor.is-visible').count(), 0);
  assert.notEqual(await page.locator('html').evaluate(e => getComputedStyle(e).cursor), 'none');
  await page.getByRole('link', { name: 'Обсудить проект', exact: true }).hover();
  assert.equal(await page.locator('.helmet-cursor.is-interactive.is-nodding').count(), 1);
  await page.screenshot({path:'artifacts/helmet-cursor.png'});
  // Динамическая кнопка не требует повторного подключения обработчиков.
  await page.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'dynamic-cursor-test';
    button.textContent = 'Динамическая кнопка';
    button.style.cssText = 'position:fixed;left:600px;top:200px;z-index:99999';
    document.body.appendChild(button);
  });
  await page.locator('#dynamic-cursor-test').hover();
  assert.equal(await page.locator('.helmet-cursor.is-interactive').count(), 1);
  await page.locator('#dynamic-cursor-test').evaluate(e => e.remove());
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.helmet-cursor.is-interactive').count(), 0);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('html.helmet-cursor-active').count(), 0);
  assert.deepEqual(errors, []);
  const touch = await browser.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true });
  await touch.goto('http://localhost:5173');
  await touch.mouse.move(100, 200);
  assert.equal(await touch.locator('.helmet-cursor').evaluate(e => getComputedStyle(e).display),'none');
  assert.equal(await touch.locator('html.helmet-cursor-active').count(),0);
  console.log('PASS: desktop, interactive/dynamic hover, keyboard, touch disabled, no React errors.');
} finally { await browser.close(); }
