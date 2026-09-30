import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const root = process.cwd();
const temporary = mkdtempSync(path.join(os.tmpdir(), "zirva-test-"));
const executable = path.join(
  temporary,
  process.platform === "win32" ? "zirva.exe" : "zirva",
);
const build = spawnSync("go", ["build", "-o", executable, "."], {
  cwd: path.join(root, "backend"),
  encoding: "utf8",
});
assert.equal(build.status, 0, build.stderr);
const password = randomBytes(24).toString("hex");
const base = "http://localhost:8123";
let server;
let browser;
async function start() {
  server = spawn(executable, [], {
    env: {
      ...process.env,
      ADDR: "127.0.0.1:8123",
      ADMIN_PASSWORD: password,
      ADMIN_USERNAME: "admin",
      DATA_DIR: path.join(temporary, "data"),
      SITE_DIR: path.join(root, "dist"),
      COOKIE_SECURE: "false",
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Go backend did not start");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill();
  });
}
try {
  await start();
  browser = await chromium.launch({ headless: true });
  const site = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  site.on("pageerror", (error) => errors.push(error.message));
  await site.goto(base);
  await site.getByLabel("Ваше имя").fill("Клиент проверки");
  await site.getByLabel("Телефон", { exact: false }).fill("+992 900 00 00 00");
  await site
    .getByLabel("О вашем проекте")
    .fill("Проверка реальной заявки из браузера");
  await site.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(site.getByRole("status")).toContainText("Заявка отправлена");

  const admin = await browser.newPage();
  admin.on("pageerror", (error) => errors.push(error.message));
  await admin.goto(`${base}/admin/`);
  await admin.getByLabel("Пароль").fill(password);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "Содержание сайта" }),
  ).toBeVisible();
  await admin.getByRole("button", { name: /Заявки/ }).click();
  await expect(admin.locator(".lead")).toHaveCount(1);
  await expect(admin.locator(".lead")).toContainText("Клиент проверки");
  await admin.locator(".lead select").selectOption("progress");
  await expect(admin.locator("#notice")).toHaveText("Статус сохранён");
  await admin.getByRole("button", { name: "Тексты и фотографии" }).click();
  await admin.getByRole("button", { name: "О компании", exact: true }).click();
  const field = admin.getByLabel("Важные проекты.", { exact: true });
  await field.fill("Строим будущее вместе.");
  await admin.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(admin.locator("#notice")).toContainText("Изменения сохранены");
  await site.reload();
  await expect(site.locator("#about h2")).toContainText(
    "Строим будущее вместе.",
  );
  await field.fill("Несохранённая правка");
  const controls = admin
    .locator("label")
    .filter({ has: field })
    .locator("+ .text-history");
  await controls.getByRole("button", { name: "Отменить правку поля" }).click();
  await expect(field).toHaveValue("Строим будущее вместе.");
  await controls.locator("summary").click();
  await expect(controls.locator(".history-preview")).toHaveText(
    "Важные проекты.",
  );
  await controls.getByRole("button", { name: "Вернуть этот текст" }).click();
  await expect(field).toHaveValue("Важные проекты.");
  await site.reload();
  await expect(site.locator("#about h2")).toContainText(
    "Строим будущее вместе.",
  );
  await admin.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(admin.locator("#notice")).toContainText("Изменения сохранены");
  await site.reload();
  await expect(site.locator("#about h2")).toContainText("Важные проекты.");
  await controls.locator("summary").click();
  await controls.getByRole("button", { name: "Вернуть этот текст" }).click();
  await expect(field).toHaveValue("Строим будущее вместе.");
  await admin.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(admin.locator("#notice")).toContainText("Изменения сохранены");
  await admin
    .getByRole("button", { name: "Фотографии и логотип", exact: true })
    .click();
  await admin
    .getByLabel("Фоновая фотография главного экрана")
    .setInputFiles(path.join(root, "public/assets/image-804.jpeg"));
  await expect(admin.locator("#notice")).toContainText("Фотография загружена");
  await admin.getByRole("button", { name: "Сохранить изменения" }).click();
  await expect(admin.locator("#notice")).toContainText("Изменения сохранены");
  await site.reload();
  await expect
    .poll(() =>
      site.locator(".hero-photo").evaluate((el) => el.style.backgroundImage),
    )
    .toContain("/media/");
  for (const width of [1440, 960, 390, 320]) {
    await site.setViewportSize({ width, height: 900 });
    assert.ok(
      await site.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Site overflow ${width}`,
    );
  }
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Admin overflow",
  );
  mkdirSync("artifacts", { recursive: true });
  await admin.screenshot({
    path: "artifacts/admin-mobile.png",
    fullPage: true,
  });
  await admin.setViewportSize({ width: 1440, height: 1000 });
  await admin.getByRole("button", { name: /Заявки/ }).click();
  await admin.screenshot({ path: "artifacts/admin-leads.png", fullPage: true });

  // Недоступный API не должен показывать ложное сообщение об успешной отправке.
  await site.route("**/api/leads", (route) => route.abort());
  await site.getByLabel("Ваше имя").fill("Повторный клиент");
  await site.getByLabel("Телефон", { exact: false }).fill("+992 900 00 00 01");
  await site.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(site.getByRole("alert")).toContainText("Не удалось отправить");
  await expect(site.getByLabel("Ваше имя")).toHaveValue("Повторный клиент");
  await site.unroute("**/api/leads");
  await stop();
  await start();
  await site.reload();
  await expect(site.locator("#about h2")).toContainText(
    "Строим будущее вместе.",
  );
  await admin.reload();
  await admin.getByLabel("Пароль").fill(password);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await admin.getByRole("button", { name: /Заявки/ }).click();
  await expect(admin.locator(".lead select")).toHaveValue("progress");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: form → Go → admin; content and image editing; mobile layouts; failed request; restart persistence.",
  );
} finally {
  if (browser) await browser.close();
  await stop();
  rmSync(temporary, { recursive: true, force: true });
}
