#!/usr/bin/env node
/* Bobo&Doda dev serveri.
 *
 * Ilgari bu skript IKKI Next.js dev serverini ko'tarardi: asosiy ilova (:3000)
 * va admin panel (:3001, alohida `.next-admin` papkasi bilan). Admin panel
 * `admin-panel` branch'iga chiqarilgandan keyin ikkinchi server kerak emas —
 * shu bilan birga diskda 287 MB joy egallagan `.next-admin` ham. */
import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", "-p", "3000"], { stdio: "inherit" });

function shutdown() {
  child.kill("SIGINT");
  setTimeout(() => process.exit(0), 300);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
child.on("exit", (code) => process.exit(code ?? 0));
