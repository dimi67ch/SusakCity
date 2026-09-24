/**
 * iOS-Web-App vom Home-Bildschirm mit durchsichtiger Statusleiste: WebKit meldet
 * den Viewport um die Statusleistenhöhe zu kurz (unten bleibt ein schwarzer Streifen).
 * Dann erzwingen wir die volle Bildschirmhöhe über `--app-h` + Klasse `vh-fix`.
 * Im Browser und auf Android greift das nicht.
 */
export function fixStandaloneViewport() {
  if ((navigator as { standalone?: boolean }).standalone !== true) return;
  const root = document.documentElement;
  // Einmal hochkant erkannt, gilt der Fehler für das Gerät dauerhaft – so muss beim
  // Zurückdrehen nicht auf die (verzögerten) Maße von iOS gewartet werden
  let buggy = false;

  // Ausrichtung kommt über screen.orientation sofort, innerWidth/-Height erst verzögert
  const isPortrait = () =>
    screen.orientation?.type ? screen.orientation.type.startsWith('portrait') : innerHeight >= innerWidth;

  const apply = () => {
    const portrait = isPortrait();
    // iOS liefert screen.width/height immer hochkant – passend zur Ausrichtung wählen
    const full = portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const gap = full - innerHeight;
    // Messung nur trauen, wenn der Viewport schon zur Ausrichtung passt (nicht mitten im Drehen)
    const measured = portrait === (innerHeight >= innerWidth) && gap > 0 && gap <= 100;
    if (portrait && measured) buggy = true;
    const on = portrait ? buggy : measured;
    root.classList.toggle('vh-fix', on);
    if (on) root.style.setProperty('--app-h', `${full}px`);
    else root.style.removeProperty('--app-h');
  };

  // Querformat: iOS meldet die Maße erst verzögert richtig → dort noch nachmessen
  let timers: number[] = [];
  const settle = () => {
    apply();
    timers.forEach(clearTimeout);
    timers = [100, 300, 700, 1200].map((ms) => window.setTimeout(apply, ms));
  };

  apply();
  addEventListener('resize', settle);
  addEventListener('orientationchange', settle);
  screen.orientation?.addEventListener('change', settle);
}

/** Lage des Gesichts im Boss-Bild (Anteil der Bildhöhe): Stirn bzw. Kinn */
const FACE_TOP = 0.06;
const FACE_BOTTOM = 0.34;

/**
 * Handy-Layout: Boss (und Auto) so platzieren, dass das Gesicht genau in der Lücke
 * zwischen Schriftzug und Automat liegt – egal wie hoch Notch/Dynamic Island ist.
 * Setzt `--scene-top` und `--boss-h`, die nur das Handy-CSS verwendet.
 */
export function placeScene() {
  const root = document.documentElement;
  const logo = document.querySelector<HTMLElement>('.logo')!;
  const city = document.querySelector<HTMLElement>('.logo__city')!;
  const frame = document.querySelector<HTMLElement>('.frame')!;

  const apply = () => {
    const appH = root.clientHeight;
    const logoBottom = Math.max(logo.getBoundingClientRect().bottom, city.getBoundingClientRect().bottom);
    const frameTop = frame.getBoundingClientRect().top;
    const gap = frameTop - logoBottom - 12; // etwas Luft zu beiden Seiten
    // Wunschgröße 46 % der Höhe, aber Gesicht muss in die Lücke passen
    const h = Math.max(180, Math.min(appH * 0.46, gap / (FACE_BOTTOM - FACE_TOP)));
    const top = logoBottom + 6 - h * FACE_TOP;
    root.style.setProperty('--scene-top', `${Math.round(top)}px`);
    root.style.setProperty('--boss-h', `${Math.round(h)}px`);
  };

  apply();
  new ResizeObserver(apply).observe(root);
  new ResizeObserver(apply).observe(logo);
  document.fonts?.ready.then(apply);
}
