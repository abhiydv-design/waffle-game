/**
 * True on phones and tablets. Touchscreen laptops still count as computers because their
 * main pointer is a mouse or trackpad.
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile) return true;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return true;
  // iPadOS reports itself as a Mac; real Macs have no touch points.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  // Touch-only device with no mouse or trackpad at all.
  const touchOnly = window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia?.('(any-pointer: fine)').matches;
  return Boolean(touchOnly);
}
