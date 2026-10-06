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
      ASSETS_DIR: path.join(root, "public", "assets"),
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

  const admin = await browser.newPage({ reducedMotion: "reduce" });
  admin.on("pageerror", (error) => errors.push(error.message));
  await admin.goto(`${base}/admin/`);
  await admin.locator("#login").getByLabel("Пароль", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(
    admin.getByRole("heading", { name: "Содержание сайта" }),
  ).toBeVisible();
  await admin.getByRole("button", { name: /Заявки/ }).click();
  await expect(admin.locator(".lead")).toHaveCount(1);
  await expect(admin.locator(".lead")).toContainText("Клиент проверки");
  await admin.locator(".lead .lead-status").selectOption("progress");
  await expect(admin.locator("#notice")).toHaveText("Статус сохранён");
  await expect(admin.locator(".stat-total strong")).toHaveText("1");
  await expect(admin.locator(".stat-progress strong")).toHaveText("1");
  await admin.locator("#status-filter").selectOption("new");
  await expect(admin.locator(".lead")).toHaveCount(0);
  await expect(admin.locator("#results-count")).toHaveText("Показано 0 из 1");
  await admin.locator("#status-filter").selectOption("");
  await admin.locator("#search").fill("Клиент проверки");
  await expect(admin.locator(".lead")).toHaveCount(1);
  await admin.locator("#search").fill("несуществующий клиент");
  await expect(admin.locator(".lead")).toHaveCount(0);
  await admin.locator("#search").fill("");
  await admin
    .getByRole("button", { name: "Главный экран", exact: true })
    .click();
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
      site
        .locator(".hero-photo")
        .evaluate((el) => getComputedStyle(el).backgroundImage),
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
  await expect(admin.locator("#leads-tab")).toHaveCSS("background-color", "rgb(40, 100, 237)");
  await expect(admin.locator("#groups .active")).toHaveCount(0);
  await admin.screenshot({ path: "artifacts/admin-leads.png", fullPage: true });
  for (const width of [960, 390, 320]) {
    await admin.setViewportSize({ width, height: 844 });
    assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Leads overflow ${width}`);
  }
  await admin.screenshot({ path: "artifacts/admin-leads-mobile.png", fullPage: true });

  // Ошибка сервера должна объяснять причину и сохранять введённые данные.
  await site.route("**/api/leads", route => route.fulfill({
    status: 429, contentType: "application/json",
    body: JSON.stringify({error:"Слишком много заявок. Повторите через 10 минут"}),
  }));
  await site.getByLabel("Ваше имя").fill("Проверка лимита");
  await site.getByLabel("Телефон", {exact:false}).fill("+992900000003");
  await site.getByRole("button", {name:"Отправить заявку"}).click();
  await expect(site.getByRole("alert")).toHaveText("Слишком много заявок. Повторите через 10 минут");
  await expect(site.getByLabel("Ваше имя")).toHaveValue("Проверка лимита");
  await site.unroute("**/api/leads");

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
  await admin.locator("#login").getByLabel("Пароль", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await admin.getByRole("button", { name: /Заявки/ }).click();
  await expect(admin.locator(".lead .lead-status")).toHaveValue("progress");
  const extra = await admin.request.post(`${base}/api/leads`, {data:{name:"Вторая заявка",phone:"+992900000002",message:"Проверка сортировки"}});
  assert.equal(extra.status(), 201);
  await admin.getByRole("button",{name:"Обновить",exact:true}).click();
  await expect(admin.locator(".lead").first()).toContainText("Вторая заявка");
  const newer = admin.locator(".lead").filter({hasText:"Вторая заявка"});
  await newer.locator(".lead-action").selectOption("draft");
  await expect(admin.locator(".lead").last()).toContainText("Вторая заявка");
  await newer.locator(".lead-action").selectOption("active");
  await expect(admin.locator(".lead").first()).toContainText("Вторая заявка");
  await newer.locator(".lead-action").selectOption("deleted");
  await expect(admin.locator(".lead").last()).toContainText("Вторая заявка");
  await expect(newer.locator(".lead-status")).toHaveValue("new");
  await admin.reload();
  await admin.getByRole("button",{name:/Заявки/}).click();
  await expect(admin.locator(".lead").last().locator(".lead-action")).toHaveValue("deleted");
  await expect(admin.locator("#groups button").last()).toHaveText("Логин и пароль");
  await admin.getByRole("button", { name: "Логин и пароль", exact: true }).click();
  const account = admin.locator("#account-form");
  await expect(account.getByLabel("Новый логин", {exact: true})).toHaveValue("admin");
  const updatedPassword = randomBytes(2).toString("hex");
  await account.getByLabel("Новый логин", {exact: true}).fill("new-admin");
  await account.getByLabel("Текущий пароль", {exact: true}).fill(password);
  await account.getByLabel("Новый пароль", {exact: true}).fill(updatedPassword);
  await account.getByLabel("Повторите новый пароль", {exact: true}).fill(updatedPassword + "x");
  await account.getByRole("button").click();
  await expect(admin.locator("#account-error")).toHaveText("Новые пароли не совпадают.");
  await account.getByLabel("Повторите новый пароль", {exact: true}).fill(updatedPassword);
  await admin.setViewportSize({width:390,height:844});
  assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Account overflow");
  await admin.screenshot({path:"artifacts/admin-account-mobile.png",fullPage:true});
  await account.getByRole("button").click();
  await expect(admin.locator("#login")).toBeVisible();
  await expect(admin.locator("#login").getByLabel("Логин", {exact: true})).toHaveValue("new-admin");
  await admin.locator("#login").getByLabel("Пароль", {exact: true}).fill(updatedPassword);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(admin.locator("#workspace")).toBeVisible();
  await stop();
  await start();
  await admin.reload();
  await admin.locator("#login").getByLabel("Логин", {exact: true}).fill("new-admin");
  await admin.locator("#login").getByLabel("Пароль", {exact: true}).fill(updatedPassword);
  await admin.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(admin.locator("#workspace")).toBeVisible();
  await admin.getByRole("button", {name:"Логин и пароль", exact:true}).click();
  await admin.setViewportSize({width:1440,height:1000});
  await admin.screenshot({path:"artifacts/admin-account.png",fullPage:true});
  assert.deepEqual(errors, []);
  console.log(
    "PASS: form → Go → admin; content and image editing; mobile layouts; failed request; restart persistence.",
  );
} finally {
  if (browser) await browser.close();
  await stop();
  rmSync(temporary, { recursive: true, force: true });
}
