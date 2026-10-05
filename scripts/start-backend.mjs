import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
if (!process.env.ADMIN_PASSWORD) {
  console.error(
    "Скопируйте .env.example в .env и задайте ADMIN_PASSWORD (не меньше 4 символов).",
  );
  process.exit(1);
}
const child = spawn("go", ["run", "."], {
  cwd: path.join(root, "backend"),
  stdio: "inherit",
  env: {
    ...process.env,
    ADDR: process.env.ADDR || "127.0.0.1:8080",
    SITE_DIR: path.join(root, "dist"),
    ASSETS_DIR: path.join(root, "public", "assets"),
  },
});
child.on("error", () => {
  console.error("Не удалось запустить Go. Установите Go 1.26.4 или новее.");
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
