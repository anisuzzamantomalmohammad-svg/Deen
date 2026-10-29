// Design C colour palettes. Dark palettes put a cream arch on a deep ground;
// light palettes put a coloured arch on a pale ground. Every palette has the
// same keys so any screen works with any of them.
//
// bg      page background            bg2     pattern band behind the header
// ink     main text                  muted   secondary text
// card    arch / selected fill       cardInk text on `card`
// accent  gold-ish highlight         sun     the sun / moon dot
// line    hairlines and borders      soft    faint card fill
// sheet   bottom sheet background    ok      done / success green
// red     prohibited-time accent

const rgba = (hex, a) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
};

const dark = (id, name, bg, bg2, ink, accent, sun, sheet, ok) => ({
  id, name, isLight: false, bg, bg2, ink, card: ink, cardInk: bg, accent, sun, sheet, ok,
  muted: rgba(ink, 0.62), faint: rgba(ink, 0.4), line: rgba(ink, 0.16), soft: rgba(ink, 0.06), soft2: rgba(ink, 0.1),
  accentSoft: rgba(accent, 0.14), accentLine: rgba(accent, 0.5),
  arcAr: accent, // Arabic prayer name inside the arch
  red: '#F2766F', redSoft: 'rgba(242,118,111,0.16)', amber: '#E0A43A',
  occ: '#B9A4F2', sfc: '#43C793', wdc: '#D8B56E', note: '#F2766F',
  statusBar: 'light-content',
});

const light = (id, name, bg, bg2, ink, accent, sun, ok) => ({
  id, name, isLight: true, bg, bg2, ink, card: accent, cardInk: '#FFF8EE', accent, sun, sheet: '#FFFBF4', ok,
  muted: rgba(ink, 0.62), faint: rgba(ink, 0.4), line: rgba(ink, 0.14), soft: rgba(ink, 0.045), soft2: rgba(ink, 0.08),
  accentSoft: rgba(accent, 0.12), accentLine: rgba(accent, 0.45),
  arcAr: '#F6DFB2',
  red: '#C0392B', redSoft: 'rgba(192,57,43,0.12)', amber: '#C9851F',
  occ: '#7B61D9', sfc: '#1E9E6D', wdc: '#C9902E', note: '#C2552C',
  statusBar: 'dark-content',
});

export const DARK_PALETTES = [
  dark('emerald', 'Emerald', '#0F2E2A', '#123832', '#F1E6CC', '#C9A04E', '#F3D27A', '#133B35', '#3FB27F'),
  dark('lapis', 'Lapis', '#0E1A3A', '#13224A', '#EEE6D3', '#D9B46A', '#F3D27A', '#16264F', '#43C793'),
  dark('teal', 'Teal', '#0B2A33', '#0F3440', '#EFE4D6', '#D08A55', '#F0B27A', '#103844', '#4CC3A0'),
  dark('plum', 'Plum', '#2A1730', '#331C3A', '#F3E3DC', '#E3A68A', '#F6C7A8', '#34203B', '#5FCF9C'),
  dark('charcoal', 'Charcoal', '#151618', '#1C1D20', '#ECE7DD', '#C9A86A', '#E9CF94', '#1E1F23', '#4BBF8A'),
  dark('olive', 'Olive', '#262B1C', '#2E3422', '#F2EBD8', '#E0A43A', '#F2C86A', '#2F3524', '#7CC57A'),
];

export const LIGHT_PALETTES = [
  light('sandstone', 'Sandstone', '#F4ECDD', '#EFE3CE', '#3A2418', '#B5562F', '#E08A3C', '#2E8A5E'),
  light('ivory', 'Ivory', '#F7F3E8', '#EEE7D5', '#1C2340', '#2F4FA8', '#D9A441', '#2E8A5E'),
  light('mist', 'Mist', '#EEF3F3', '#E1EBEB', '#13343A', '#1F6E7A', '#E0A43A', '#2E8A5E'),
  light('blush', 'Blush', '#F8EEEE', '#F0E0E1', '#3A1A2E', '#8E4B7A', '#E29A6B', '#2E8A5E'),
  light('paper', 'Paper', '#F6F4EF', '#ECE8DF', '#222222', '#8A6A2E', '#D9A441', '#2E8A5E'),
  light('linen', 'Linen', '#F3EFE2', '#E8E2CF', '#2A2E1E', '#6B7F3A', '#D9A441', '#2E8A5E'),
];

// Prohibited (makruh) time: the whole app turns red.
const RED_DARK = {
  bg: '#2A1214', bg2: '#3A1618', ink: '#F6DCD6', card: '#F6DCD6', cardInk: '#5A1712', accent: '#F2766F', sun: '#F2A08F',
  sheet: '#33171A', muted: 'rgba(246,220,214,0.62)', faint: 'rgba(246,220,214,0.4)', line: 'rgba(246,220,214,0.16)',
  soft: 'rgba(246,220,214,0.06)', soft2: 'rgba(246,220,214,0.1)', accentSoft: 'rgba(242,118,111,0.16)', accentLine: 'rgba(242,118,111,0.55)', arcAr: '#B3261E',
};
const RED_LIGHT = {
  bg: '#FBECE8', bg2: '#F7DED8', ink: '#4A1712', card: '#C0392B', cardInk: '#FFF3EF', accent: '#C0392B', sun: '#E0604F',
  sheet: '#FFF6F3', muted: 'rgba(74,23,18,0.62)', faint: 'rgba(74,23,18,0.4)', line: 'rgba(74,23,18,0.14)',
  soft: 'rgba(192,57,43,0.05)', soft2: 'rgba(192,57,43,0.09)', accentSoft: 'rgba(192,57,43,0.12)', accentLine: 'rgba(192,57,43,0.45)', arcAr: '#FFD9CF',
};

// Dim red for the night (Tahajjud): low light, nothing bright or blue.
const NIGHT_RED = {
  ...dark('nightRed', 'Night red', '#0B0606', '#120909', '#C9786C', '#B5584B', '#9C4A3F', '#140A09', '#8A5A3A'),
  card: '#3A1613', cardInk: '#E3988B', arcAr: '#B5584B', statusBar: 'light-content', nightRed: true,
  red: '#B5584B', redSoft: 'rgba(181,88,75,0.14)', amber: '#A8683A', occ: '#9C6A8C', sfc: '#8A7A4A', wdc: '#A87A4A', note: '#B5584B',
};

// `daily` is the palette picked for this time of day (see theme/daily.js),
// already split into a dark and a light version. `night` turns on dim red.
export function resolveTheme({ mode, darkId, lightId, systemScheme, prohibited, daily, night }) {
  const useLight = mode === 'light' || (mode === 'auto' && systemScheme === 'light');
  if (night) return NIGHT_RED;
  let base;
  if (daily) base = useLight ? daily.light : daily.dark;
  else {
    base = useLight
      ? LIGHT_PALETTES.find((p) => p.id === lightId) || LIGHT_PALETTES[0]
      : DARK_PALETTES.find((p) => p.id === darkId) || DARK_PALETTES[0];
  }
  if (!prohibited) return base;
  return { ...base, ...(useLight ? RED_LIGHT : RED_DARK), id: `${base.id}-red`, prohibited: true, royal: false };
}

export { rgba, dark as darkPalette, light as lightPalette, NIGHT_RED };
