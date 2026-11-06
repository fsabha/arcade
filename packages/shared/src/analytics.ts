/**
 * Vercel Web Analytics without an npm dependency: the script Vercel serves at
 * /_vercel/insights/script.js records a page view (per iframe page too, so each game
 * opened in the hub shows up as /games/<name>/). Skipped on local hosts, where the
 * endpoint does not exist.
 */
export function installAnalytics(): void {
  if (typeof document === 'undefined') return;
  const host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return;
  if (document.querySelector('script[data-arcade-analytics]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  s.dataset.arcadeAnalytics = '1';
  document.head.appendChild(s);
}

/** Custom event for Vercel Web Analytics (queued until the script loads; no-op locally). */
export function trackEvent(name: string, data?: Record<string, string | number>): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { va?: (...args: unknown[]) => void; vaq?: unknown[][] };
  if (!w.va) w.va = (...args: unknown[]) => { (w.vaq = w.vaq ?? []).push(args); };
  try { w.va('event', { name, data }); } catch { /* ignore */ }
}
