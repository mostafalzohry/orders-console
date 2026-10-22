import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = process.platform === "win32";

for (const project of ["backend", "frontend"]) {
  const cwd = join(root, project);
  const envFile = join(cwd, ".env");

  if (existsSync(envFile)) {
    console.log(`${project}/.env already exists, keeping it`);
  } else {
    copyFileSync(join(cwd, ".env.example"), envFile);
    console.log(`created ${project}/.env`);
  }

  console.log(`installing ${project}...`);
  const result = spawnSync("npm", ["install"], { cwd, stdio: "inherit", shell });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nSetup done. Next: npm run seed, then npm run dev");
