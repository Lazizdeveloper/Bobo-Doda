/**
 * Frontend API boundary.
 *
 * UI modules import only from this package. The current implementation delegates
 * to the in-browser mock adapter; a real backend replaces `client.ts` without
 * requiring page/component rewrites.
 */
export * from "./contracts";
export * from "./errors";
export * from "./state-machines";
export * from "./client";

// Compatibility exports keep existing screens stable during the adapter migration.
// New code should prefer the domain service objects exported from `client.ts`.
export * from "@/lib/mock-api";
