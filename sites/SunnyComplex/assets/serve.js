/* A page opened straight from the folder (file://) can't save reservations or reach the admin.
   If the site's server (start.bat) is running, move to the same page on it. */
(() => {
  if (location.protocol !== 'file:') return;
  const route = document.currentScript.dataset.route || '/';
  const base = 'http://localhost:5173';
  fetch(`${base}/assets/tables.js`, { mode: 'no-cors', cache: 'no-store' })
    .then(() => location.replace(base + route + location.hash))
    .catch(() => {});
})();

/* No zooming on phones. The viewport tag and touch-action stop it on Android; iPhone Safari ignores
   both for pinching, so its gesture events and two-finger moves are cancelled here. */
(() => {
  const stop = e => e.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, stop, { passive: false }));
  document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
})();
