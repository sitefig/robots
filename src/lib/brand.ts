// The sus.bot logo files, built from the identity guide (claude.ai/design
// "sus.bot Identity"): the bracket-and-eye mark on a 48 x 48 grid, strokes
// 3.4 with square caps, and the wordmark as outlines (src/lib/wordmark.json,
// Space Grotesk Bold shaped with HarfBuzz), so no file depends on an
// installed font. tools/brand.ts writes them, with PNG renders and a zip,
// into src/site/press/files/.

import wordmark from './wordmark.json' with { type: 'json' };

export const INK = '#111418';
export const SURFACE = '#121316';
export const PAPER = '#f2f3f5';
export const ACCENT = '#ffd60a';
/** The guide's darker yellow for the eye on light grounds. */
export const ACCENT_ON_LIGHT = '#d9ab00';

interface Colours {
  brackets: string;
  eye: string;
  word: string;
}

const THEMES: Record<string, Colours> = {
  'dark-bg': { brackets: PAPER, eye: ACCENT, word: PAPER },
  'light-bg': { brackets: INK, eye: INK, word: INK },
  'light-bg-yellow': { brackets: INK, eye: ACCENT_ON_LIGHT, word: INK },
  'mono-black': { brackets: '#000000', eye: '#000000', word: '#000000' },
  'mono-white': { brackets: '#ffffff', eye: '#ffffff', word: '#ffffff' },
};

function mark(c: Colours, transform = ''): string {
  const g = transform ? `<g transform="${transform}">` : '';
  return `${g}<path d="M17 7 H8 V41 H17" stroke="${c.brackets}" stroke-width="3.4" stroke-linecap="square"/><path d="M31 7 H40 V41 H31" stroke="${c.brackets}" stroke-width="3.4" stroke-linecap="square"/><circle cx="24" cy="24" r="7.5" stroke="${c.eye}" stroke-width="3.4"/><circle cx="24" cy="24" r="2" fill="${c.eye}"/>${g ? '</g>' : ''}`;
}

const svg = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="sus.bot">${body}</svg>\n`;

export function markSvg(theme: keyof typeof THEMES): string {
  return svg(48, 48, mark(THEMES[theme]));
}

export function horizontalSvg(theme: keyof typeof THEMES): string {
  const c = THEMES[theme];
  return svg(208, 48, `${mark(c)}<path d="${wordmark.horizontal}" fill="${c.word}"/>`);
}

export function stackedSvg(theme: keyof typeof THEMES): string {
  const c = THEMES[theme];
  return svg(160, 104, `${mark(c, 'translate(56 0)')}<path d="${wordmark.stacked}" fill="${c.word}"/>`);
}

/** The small-size cut: thicker brackets, solid pupil, on a rounded dark square. */
export function faviconSvg(): string {
  return svg(48, 48, `<rect width="48" height="48" rx="10" fill="${SURFACE}"/><path d="M16 11 H9 V37 H16" stroke="${PAPER}" stroke-width="4.4" stroke-linecap="square"/><path d="M32 11 H39 V37 H32" stroke="${PAPER}" stroke-width="4.4" stroke-linecap="square"/><circle cx="24" cy="24" r="6" fill="${ACCENT}"/>`);
}

/** App icon: the full mark on a rounded dark square (square corners for iOS, which rounds itself). */
export function appIconSvg(rounded = true): string {
  return svg(512, 512, `<rect width="512" height="512"${rounded ? ' rx="112"' : ''} fill="${SURFACE}"/>${mark(THEMES['dark-bg'], 'translate(96 96) scale(6.6667)')}`);
}

export interface BrandFile {
  /** Path under press/files/. */
  file: string;
  svg?: string;
  /** PNG: the SVG it is rendered from and the output width in pixels. */
  png?: { from: string; width: number };
}

const png = (name: string, from: string, widths: number[]): BrandFile[] => widths.map((width) => ({ file: `png/${name}-${width}.png`, png: { from, width } }));

/** Every file in the kit, in the order of the guide's file index. */
export function brandFiles(): BrandFile[] {
  return [
    ...(['dark-bg', 'light-bg', 'light-bg-yellow', 'mono-black', 'mono-white'] as const).map((t) => ({ file: `mark/susbot-mark-${t}.svg`, svg: markSvg(t) })),
    ...(['dark-bg', 'light-bg', 'mono-black', 'mono-white'] as const).map((t) => ({ file: `lockup-horizontal/susbot-h-${t}.svg`, svg: horizontalSvg(t) })),
    ...(['dark-bg', 'light-bg'] as const).map((t) => ({ file: `lockup-stacked/susbot-v-${t}.svg`, svg: stackedSvg(t) })),
    { file: 'favicon/susbot-favicon.svg', svg: faviconSvg() },
    { file: 'favicon/susbot-app-icon-512.svg', svg: appIconSvg() },
    ...png('susbot-h-dark-bg', 'lockup-horizontal/susbot-h-dark-bg.svg', [416, 832, 1664]),
    ...png('susbot-h-light-bg', 'lockup-horizontal/susbot-h-light-bg.svg', [416, 832, 1664]),
    ...png('susbot-mark-dark-bg', 'mark/susbot-mark-dark-bg.svg', [128, 512]),
    ...png('susbot-mark-light-bg', 'mark/susbot-mark-light-bg.svg', [128, 512]),
    ...png('susbot-app-icon', 'favicon/susbot-app-icon-512.svg', [180, 512, 1024]),
    ...png('susbot-favicon', 'favicon/susbot-favicon.svg', [32, 64]),
  ];
}

export const ZIP_NAME = 'susbot-press-kit.zip';

export const README = `sus.bot logo files
==================

mark/                icon only (48 x 48 grid)
lockup-horizontal/   icon and wordmark side by side, the default
lockup-stacked/      icon above wordmark, for square spaces
favicon/             rounded-square favicon and 512 px app icon
png/                 raster exports

Picking a file
  Dark background   *-dark-bg     white brackets, yellow eye
  Light background  *-light-bg    all ${INK}
  One ink only      *-mono-black, *-mono-white
  Never place the dark-bg version on a light ground.

Colour
  Ink ${INK}  Surface ${SURFACE}  Panel #1b1c20  Border #383b42
  Paper ${PAPER}  Accent ${ACCENT} (the eye, never text on light)
  Allow #86e0aa  Disallow #ffa198

Type
  The wordmark is Space Grotesk Bold at -4.5% tracking. In these files it
  is already converted to outlines, so no font is needed.

Clear space and size
  Keep clear space equal to the mark's height on all four sides.
  Horizontal lockup at least 104 px (28 mm) wide; mark at least 16 px.
  Below 16 px use the favicon file.

Don't
  Colour the brackets yellow, rotate, outline, add shadows or gradients,
  rebuild the wordmark in another typeface, stretch, or change the gap
  between icon and wordmark.

https://sus.bot/press/
`;
