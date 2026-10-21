const seen = new Set<string>();

/** Development-only console warning, printed once per message. Silent in production builds. */
export function warnOnce(message: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  if (seen.has(message)) return;
  seen.add(message);
  console.warn(`[@mourya10104/forecast-charts] ${message}`);
}
