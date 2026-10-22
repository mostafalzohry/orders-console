import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = process.platform === "win32";

const services = [
  { name: "api", cwd: join(root, "backend"), args: ["run", "start:dev"] },
  { name: "web", cwd: join(root, "frontend"), args: ["run", "dev"] },
];

function stopAll(code) {
  for (const child of children) {
    child.kill();
  }
  process.exit(code);
}

const children = services.map(({ name, cwd, args }) => {
  const child = spawn("npm", args, {
    cwd,
    shell,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on("line", (line) =>
      console.log(`[${name}] ${line}`),
    );
  }

  child.on("exit", (code) => {
    console.log(`[${name}] stopped with code ${code ?? "none"}, stopping the other service`);
    stopAll(code ?? 1);
  });

  return child;
});

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
