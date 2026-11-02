// Corrects for a wrong device clock (FR-04) using the Date header of our own server.

export const SKEW_THRESHOLD_MS = 2000;

/**
 * Milliseconds to add to the device clock, or 0 if it is close enough.
 * The HTTP Date header is truncated to whole seconds, so we assume the middle
 * of that second, and we assume the server stamped it half-way through the request.
 */
export function clockOffset({ sentAt, receivedAt, serverDate }) {
  const server = Date.parse(serverDate);
  if (!Number.isFinite(server)) return 0;
  const serverNow = server + 500 + (receivedAt - sentAt) / 2;
  const offset = serverNow - receivedAt;
  return Math.abs(offset) > SKEW_THRESHOLD_MS ? Math.round(offset) : 0;
}

/** Ask the server for its time once. Never throws: any failure means "no correction". */
export async function measureOffset(fetchFn, url, now = Date.now) {
  try {
    const sentAt = now();
    const res = await fetchFn(url, { method: 'HEAD', cache: 'no-store' });
    const receivedAt = now();
    return clockOffset({ sentAt, receivedAt, serverDate: res.headers.get('date') });
  } catch {
    return 0;
  }
}
