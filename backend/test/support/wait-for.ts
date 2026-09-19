/** BullMQ (Redis) orqali asinxron ishlov beriladigan narsani (masalan OTP SMS job) kutish uchun. */
export async function waitFor(
  check: () => boolean,
  opts: { timeoutMs?: number; intervalMs?: number; label?: string } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const intervalMs = opts.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timeout${opts.label ? ` (${opts.label})` : ''}`);
}
