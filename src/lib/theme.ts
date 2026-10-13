const HEX = /^#[0-9a-fA-F]{6}$/;
export const estHex = (v: string) => HEX.test(v);

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export function hexVersHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [Math.round((h * 60 + 360) % 360), Math.round(s * 100), Math.round(l * 100)];
}

const hslChaine = ([h, s, l]: [number, number, number]) => `${h} ${s}% ${l}%`;

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs hexadécimales (1 à 21). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

export const CONTRASTE_MIN = 4.5;

/** Les couleurs de marque servent de fond à du texte blanc et de texte sur fond blanc : 4,5:1 minimum. */
export function verifierCouleurMarque(hex: string): string | null {
  if (!estHex(hex)) return "Couleur invalide (format #RRGGBB)";
  const c = contraste(hex, "#FFFFFF");
  return c >= CONTRASTE_MIN ? null : `Couleur trop claire : le texte blanc ne serait pas lisible (contraste ${c.toFixed(1).replace(".", ",")}:1, minimum 4,5:1)`;
}

const FOND_SOMBRE = "#111513";

/** En mode sombre, éclaircit la couleur jusqu'à un contraste suffisant avec le fond. */
function versSombre(hex: string): [number, number, number] {
  const [h, s, l0] = hexVersHsl(hex);
  for (let l = Math.max(l0, 40); l <= 90; l += 2) {
    const [r, g, b] = hslVersRgb(h, s, l);
    const test = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    if (contraste(test, FOND_SOMBRE) >= CONTRASTE_MIN) return [h, s, l];
  }
  return [h, s, 90];
}

function hslVersRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100, lum = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n: number) => Math.round(255 * (lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return [f(0), f(8), f(4)];
}

/** CSS des variables de thème. Ne produit rien si une couleur est invalide (aucune injection possible). */
export function cssTheme(principale: string, secondaire: string): string {
  if (verifierCouleurMarque(principale) || verifierCouleurMarque(secondaire)) return "";
  const clair = (hex: string) => hslChaine(hexVersHsl(hex));
  const sombre = (hex: string) => hslChaine(versSombre(hex));
  return (
    `:root{--primary:${clair(principale)};--ring:${clair(principale)};--secondary:${clair(secondaire)};}` +
    `.dark{--primary:${sombre(principale)};--ring:${sombre(principale)};--secondary:${sombre(secondaire)};}`
  );
}
