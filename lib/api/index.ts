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
