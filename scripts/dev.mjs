#!/usr/bin/env node
/* ── Bobo&Doda: ikki portli dev ──────────────────────────────────────
 * Bitta buyruq (`npm run dev`) ikkita Next.js dev serverini birga ishga tushiradi:
 *     asosiy ilova → http://localhost:3000        (build papka: .next)
 *     admin panel  → http://localhost:3001/admin  (build papka: .next-admin)
 *
 * Nega alohida build papka: ikkala `next dev` bitta ".next" ga yozsa, kesh
 * to'qnashadi/buziladi. NEXT_DIST_DIR (next.config.mjs o'qiydi) buni ajratadi.
 * Ishlab chiqarishga (build/start) tegilmaydi — ular NEXT_DIST_DIR qo'ymaydi.
 *
 * Yangi npm-paket kerak emas — faqat node:child_process. */
import { spawn } from "node:child_process";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const servers = [
  { name: "app", port: 3000, distDir: ".next", color: "\x1b[33m", url: "http://localhost:3000" },
  { name: "admin", port: 3001, distDir: ".next-admin", color: "\x1b[36m", url: "http://localhost:3001/admin" },
];

const procs = servers.map((s) => {
  const child = spawn("npx", ["next", "dev", "-p", String(s.port)], {
    env: { ...process.env, NEXT_DIST_DIR: s.distDir },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tag = `${s.color}[${s.name}]${RESET} `;
  const relay = (stream, out) =>
    stream.on("data", (buf) =>
      buf
        .toString()
        .replace(/\n$/, "")
        .split("\n")
        .forEach((line) => out.write(`${tag}${line}\n`))
    );
  relay(child.stdout, process.stdout);
  relay(child.stderr, process.stderr);
  return child;
});

/* Ikkala server ko'tarilgach — manzillarni bir joyda aniq ko'rsatish */
setTimeout(() => {
  process.stdout.write(`\n  ${BOLD}Bobo&Doda dev serverlar tayyor:${RESET}\n`);
  for (const s of servers) {
    process.stdout.write(`   ${s.color}${s.name.padEnd(5)}${RESET} →  ${s.url}\n`);
  }
  process.stdout.write("\n");
}, 4500);

/* Toza to'xtatish: Ctrl+C yoki biri o'lsa — ikkalasini ham to'xtat */
let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  for (const p of procs) p.kill("SIGINT");
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
for (const p of procs) p.on("exit", shutdown);
