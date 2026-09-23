import { registerSW } from 'virtual:pwa-register';

/**
 * App-Update: Liegt eine neue Version bereit, wird sie automatisch aktiviert –
 * aber nie mitten im Spiel, sonst gingen laufende Spins oder Bonus-Gewinne verloren.
 *  - Ladebildschirm noch sichtbar → sofort neu laden
 *  - sonst → neu laden, sobald die App verlassen wird (Tab/App-Wechsel) und nichts läuft
 * Beim Zurückkehren in die App wird zusätzlich nach Updates gesucht.
 */
export function setupPwaUpdate() {
  let ready = false;

  const idle = () =>
    !!document.getElementById('boot') ||
    (!document.body.classList.contains('is-busy') && !document.querySelector('.overlay'));

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      ready = true;
      if (document.getElementById('boot')) void updateSW(true);
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update();
      });
    },
  });

  document.addEventListener('visibilitychange', () => {
    if (ready && document.visibilityState === 'hidden' && idle()) void updateSW(true);
  });
}
