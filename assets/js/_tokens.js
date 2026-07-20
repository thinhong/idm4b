// ============================================================
//  IDM4b widget design tokens (shared by OJS/D3 widgets)
//  Mirrors assets/tokens.css and assets/_tokens.scss. Prefer the
//  live CSS custom properties so widgets track the page theme;
//  fall back to these literals if the stylesheet is not ready.
//  Each role has [line, ink]: line = vivid (strokes/fills),
//  ink = AA-safe on white (text/labels).
// ============================================================

export function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) {
    return fallback;
  }
}

export const TOKENS = {
  oxBlue: "#002147", cobalt: "#1B4DC7", cobalt2: "#143aa6",
  ink: "#14263b", ink2: "#42566b", ink3: "#647587",
  surface: "#f1f6fd", surface2: "#e6f0fb",
  border: "#e3edf9", borderStrong: "#cfe0f2", white: "#ffffff",

  // compartments / semantic roles: [line, ink]
  s:   ["#2A5CD6", "#1B4DC7"], // Susceptible  (blue)
  i:   ["#E0574E", "#C1343F"], // Infectious   (red)
  r:   ["#16A06B", "#0E7A54"], // Recovered    (green)
  e:   ["#E0960A", "#9A5B00"], // Exposed      (amber)
  v:   ["#7E5AD6", "#6742BE"], // Vaccinated   (violet)
  aux: ["#0E9AAB", "#0A6E7D"], // Auxiliary    (teal)
};

// Convenience: role -> vivid line color and readable ink color.
export const LINE = {
  s: TOKENS.s[0], i: TOKENS.i[0], r: TOKENS.r[0],
  e: TOKENS.e[0], v: TOKENS.v[0], aux: TOKENS.aux[0],
};
export const INK = {
  s: TOKENS.s[1], i: TOKENS.i[1], r: TOKENS.r[1],
  e: TOKENS.e[1], v: TOKENS.v[1], aux: TOKENS.aux[1],
};

// Named aliases used by slider/anim call sites (cls -> [line, ink]).
export const NAMED = {
  blue: TOKENS.s, red: TOKENS.i, green: TOKENS.r,
  amber: TOKENS.e, purple: TOKENS.v, teal: TOKENS.aux,
  dark: [TOKENS.ink, TOKENS.ink], gray: [TOKENS.ink2, TOKENS.ink2],
};

export const MOTION = {
  fast: 180, base: 240, slow: 340,
  ease: "cubic-bezier(.22,.61,.36,1)",
};

export const FONT = {
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
};

// ---- Widget type scale (px) ----
// Use these for ALL widget text so sizes stay consistent across modules.
// Draw SVG widgets at their real container width (1 viewBox unit == 1 CSS
// pixel, e.g. via a ResizeObserver) so these are the true on-screen sizes.
// Floor is 12px so text stays legible on phones.
export const TYPE = {
  axis:    12, // axis ticks (smallest)
  caption: 13, // captions, secondary labels
  label:   14, // axis titles, series labels
  body:    15, // readouts, body copy
  title:   16, // panel headers
  value:   20, // emphasized numbers
  display: 26, // hero numbers
};

// Responsive font-size for HTML widget text (CSS string). Never below the
// floor, grows gently with viewport, caps at px. e.g. el.style.fontSize = fs(15).
export function fs(px, floor) {
  const lo = floor || Math.max(12, Math.round(px * 0.86));
  return `clamp(${lo}px, calc(${px - 2}px + 0.3vw), ${px}px)`;
}

// True when the reader asked the OS to reduce motion. Guard any
// auto-playing animation with this so it can be skipped or shortened.
export function reduceMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
}
