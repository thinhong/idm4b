// Cute chibi baby + virus animation helpers for vax-mod.qmd
// Pure DOM SVG. Babies are static; only virus particles move.
//
// Public API:
//   import { injectVaxStyle, makeBaby, makeShieldBubble, launchVirus }
//     from "./_vax-anim.js"

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// ──────────────────────────────────────────────────────────────
// Stylesheet
// ──────────────────────────────────────────────────────────────
export function injectVaxStyle(prefix = "vx") {
  const s = document.createElement("style");
  s.textContent = `
    .${prefix}-wrap {
      width:100%; max-width:640px; margin:18px auto 24px;
      font-family: system-ui,-apple-system,sans-serif;
    }
    .${prefix}-stage {
      width:100%; display:block; touch-action:manipulation; user-select:none;
      -webkit-tap-highlight-color: transparent;
    }
    .${prefix}-caption {
      text-align:center; font-size:13px; color:#64748b;
      margin-top:10px; line-height:1.5;
    }
    .${prefix}-caption b { color:#0f766e; font-weight:700; }
    .${prefix}-caption i { color:#b91c1c; font-style:normal; font-weight:600; }
    @keyframes ${prefix}-shimmer { 0%,100% { opacity:0.65; } 50% { opacity:1; } }
  `;
  return s;
}

// ──────────────────────────────────────────────────────────────
// Palette
// ──────────────────────────────────────────────────────────────
const SKIN       = "#ffe4cc";
const SKIN_SHADE = "#e8b88c";
const LEAF       = "#3f7e3f";
const LEAF_HI    = "#86c386";
const STEM       = "#3f2410";
const CHEEK      = "#fb8c8c";
const INK        = "#1f2937";
const WING_FILL  = "#a01818";
const WING_DK    = "#4a0a0a";
const WING_HI    = "#fca5a5";

const OUTFITS = {
  pink:   { fill: "#fde0e7", shade: "#f7a8bb" },
  blue:   { fill: "#dbeefe", shade: "#a3cdf7" },
  mint:   { fill: "#d8f3e6", shade: "#9ddec1" },
  yellow: { fill: "#fef3c7", shade: "#fcd97f" }
};

// ──────────────────────────────────────────────────────────────
// makeBaby(cx, cy, scale, opts)
//   opts.state:  "cute" | "demon-happy" | "demon-angry"
//   opts.outfit: "pink" | "blue" | "mint" | "yellow"
// ──────────────────────────────────────────────────────────────
export function makeBaby(cx, cy, scale = 1, opts = {}) {
  const root = el("g", { transform: `translate(${cx} ${cy}) scale(${scale})` });
  const initState  = opts.state  || "cute";
  const outfitName = opts.outfit || "pink";
  const outfit     = OUTFITS[outfitName] || OUTFITS.pink;

  // ── Bat wings (back layer, demon only) ────────────────────
  // Smooth scalloped lobes with a sharp wing tip — classic bat-wing silhouette.
  // Anchored at the upper body so the wings clearly sprout from behind, not the ears.
  const wings = el("g");
  // Left wing — main membrane
  wings.appendChild(el("path", {
    d: "M -22 16 Q -55 -28 -78 -14 Q -68 -2 -62 2 Q -58 22 -48 16 Q -42 12 -38 14 Q -34 30 -24 24 Q -20 20 -22 16 Z",
    fill: WING_FILL, stroke: WING_DK, "stroke-width": 1.8, "stroke-linejoin": "round"
  }));
  // Left wing — leading-edge bone highlight
  wings.appendChild(el("path", {
    d: "M -28 12 Q -52 -14 -72 -10",
    fill: "none", stroke: WING_HI, "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0.7
  }));
  // Right wing — main membrane (mirror)
  wings.appendChild(el("path", {
    d: "M  22 16 Q  55 -28  78 -14 Q  68 -2  62 2 Q  58 22  48 16 Q  42 12  38 14 Q  34 30  24 24 Q  20 20  22 16 Z",
    fill: WING_FILL, stroke: WING_DK, "stroke-width": 1.8, "stroke-linejoin": "round"
  }));
  wings.appendChild(el("path", {
    d: "M  28 12 Q  52 -14  72 -10",
    fill: "none", stroke: WING_HI, "stroke-width": 1.6, "stroke-linecap": "round", opacity: 0.7
  }));
  wings.setAttribute("opacity", "0");
  root.appendChild(wings);

  // ── Swaddled body ─────────────────────────────────────────
  root.appendChild(el("path", {
    d: "M -22 22 Q -34 38 -30 60 Q -22 74 0 76 Q 22 74 30 60 Q 34 38 22 22 Z",
    fill: outfit.fill, stroke: outfit.shade, "stroke-width": 2.2, "stroke-linejoin": "round"
  }));

  // ── Head (big chibi oval) ─────────────────────────────────
  root.appendChild(el("ellipse", {
    cx: 0, cy: -10, rx: 38, ry: 38,
    fill: SKIN, stroke: SKIN_SHADE, "stroke-width": 2.2
  }));

  // ── Round ears ────────────────────────────────────────────
  root.appendChild(el("ellipse", { cx: -38, cy: -4, rx: 5, ry: 7, fill: SKIN, stroke: SKIN_SHADE, "stroke-width": 1.5 }));
  root.appendChild(el("ellipse", { cx:  38, cy: -4, rx: 5, ry: 7, fill: SKIN, stroke: SKIN_SHADE, "stroke-width": 1.5 }));
  root.appendChild(el("ellipse", { cx: -38, cy: -4, rx: 2, ry: 3.5, fill: CHEEK, opacity: 0.55 }));
  root.appendChild(el("ellipse", { cx:  38, cy: -4, rx: 2, ry: 3.5, fill: CHEEK, opacity: 0.55 }));

  // ── SIGNATURE LEAF — tilted naturally with a subtle asymmetry ──
  // Wrapped in a group rotated ~18° so it leans like a real leaf catching light.
  // The leaf body is slightly fuller on one side, with the vein curving with it.
  const leafG = el("g", { transform: "rotate(-18 0 -42)" });
  // Stem
  leafG.appendChild(el("path", {
    d: "M 0 -44 L 0 -38",
    stroke: STEM, "stroke-width": 2.4, "stroke-linecap": "round"
  }));
  // Leaf body — asymmetric for a natural look (right side slightly fuller)
  leafG.appendChild(el("path", {
    d: "M 2 -78 C 20 -72 18 -50 0 -44 C -16 -50 -22 -68 2 -78 Z",
    fill: LEAF, stroke: STEM, "stroke-width": 1.5, "stroke-linejoin": "round"
  }));
  // Central vein curves slightly with the leaf
  leafG.appendChild(el("path", {
    d: "M 0 -46 Q 1 -60 2 -76",
    fill: "none", stroke: STEM, "stroke-width": 1, "stroke-linecap": "round", opacity: 0.65
  }));
  // Side veins — subtle, asymmetric
  leafG.appendChild(el("path", {
    d: "M 1 -56 L -8 -52 M 1 -56 L 10 -58 M 2 -66 L -7 -64 M 2 -66 L 9 -68",
    fill: "none", stroke: STEM, "stroke-width": 0.8, "stroke-linecap": "round", opacity: 0.45
  }));
  // Highlight on the fuller right side — like sunlight catching it
  leafG.appendChild(el("path", {
    d: "M 8 -68 Q 11 -58 6 -50",
    fill: "none", stroke: LEAF_HI, "stroke-width": 1.2, "stroke-linecap": "round", opacity: 0.7
  }));
  root.appendChild(leafG);

  // ── Cheeks ────────────────────────────────────────────────
  const cheekL = el("ellipse", { cx: -22, cy: 4, rx: 8, ry: 5, fill: CHEEK, opacity: 0.55 });
  const cheekR = el("ellipse", { cx:  22, cy: 4, rx: 8, ry: 5, fill: CHEEK, opacity: 0.55 });
  root.appendChild(cheekL); root.appendChild(cheekR);

  // ── BIG anime eyes (with triple sparkle) ─────────────────
  root.appendChild(el("ellipse", { cx: -13, cy: -10, rx: 7, ry: 10, fill: INK }));
  root.appendChild(el("ellipse", { cx:  13, cy: -10, rx: 7, ry: 10, fill: INK }));
  root.appendChild(el("ellipse", { cx: -10, cy: -14, rx: 3, ry: 4, fill: "#fff" }));
  root.appendChild(el("ellipse", { cx:  16, cy: -14, rx: 3, ry: 4, fill: "#fff" }));
  root.appendChild(el("circle", { cx: -16, cy: -4, r: 1.6, fill: "#fff" }));
  root.appendChild(el("circle", { cx:  10, cy: -4, r: 1.6, fill: "#fff" }));
  root.appendChild(el("circle", { cx: -12, cy: -7, r: 0.9, fill: "#fff" }));
  root.appendChild(el("circle", { cx:  14, cy: -7, r: 0.9, fill: "#fff" }));

  // ── Eyebrows (V-shape, demon-angry only) ──────────────────
  const browL = el("path", {
    d: "M -22 -25 L -7 -21", fill: "none",
    stroke: INK, "stroke-width": 2.6, "stroke-linecap": "round"
  });
  const browR = el("path", {
    d: "M  22 -25 L  7 -21", fill: "none",
    stroke: INK, "stroke-width": 2.6, "stroke-linecap": "round"
  });
  browL.setAttribute("opacity", "0");
  browR.setAttribute("opacity", "0");
  root.appendChild(browL); root.appendChild(browR);

  root.appendChild(el("path", {
    d: "M -2 2 Q 0 4 2 2",
    fill: "none", stroke: SKIN_SHADE, "stroke-width": 1.2, "stroke-linecap": "round"
  }));

  const mouth = el("path", {
    d: "M -3 10 Q 0 13 3 10",
    fill: "none", stroke: INK, "stroke-width": 1.9, "stroke-linecap": "round"
  });
  root.appendChild(mouth);

  function setState(s) {
    if (s === "cute") {
      wings.setAttribute("opacity", "0");
      browL.setAttribute("opacity", "0");
      browR.setAttribute("opacity", "0");
      cheekL.setAttribute("opacity", "0.55");
      cheekR.setAttribute("opacity", "0.55");
      mouth.setAttribute("d", "M -3 10 Q 0 13 3 10");
    } else {
      wings.setAttribute("opacity", "1");
      cheekL.setAttribute("opacity", "0.85");
      cheekR.setAttribute("opacity", "0.85");
      if (s === "demon-angry") {
        browL.setAttribute("opacity", "1");
        browR.setAttribute("opacity", "1");
        mouth.setAttribute("d", "M -5 12 Q 0 7 5 12");
      } else {
        browL.setAttribute("opacity", "0");
        browR.setAttribute("opacity", "0");
        mouth.setAttribute("d", "M -3 10 Q 0 13 3 10");
      }
    }
  }
  setState(initState);
  return { g: root, setState };
}

// ──────────────────────────────────────────────────────────────
// makeShieldBubble — translucent protective bubble
// ──────────────────────────────────────────────────────────────
export function makeShieldBubble(cx, cy, r = 78, prefix = "vx") {
  const g = el("g", { transform: `translate(${cx} ${cy})` });
  g.appendChild(el("circle", {
    cx: 0, cy: 0, r: r + 5,
    fill: "#a5f3fc", "fill-opacity": 0.18
  }));
  g.appendChild(el("circle", {
    cx: 0, cy: 0, r: r,
    fill: "#67e8f9", "fill-opacity": 0.18,
    stroke: "#0d9488", "stroke-width": 2.8, "stroke-opacity": 0.78
  }));
  g.appendChild(el("path", {
    d: `M ${-r * 0.62} ${-r * 0.45} A ${r} ${r} 0 0 1 ${r * 0.30} ${-r * 0.88}`,
    fill: "none", stroke: "#fff",
    "stroke-width": 5, "stroke-opacity": 0.7, "stroke-linecap": "round"
  }));
  g.appendChild(el("path", {
    d: `M ${r * 0.55} ${r * 0.35} A ${r * 0.7} ${r * 0.7} 0 0 1 ${r * 0.05} ${r * 0.7}`,
    fill: "none", stroke: "#fff",
    "stroke-width": 2, "stroke-opacity": 0.45, "stroke-linecap": "round"
  }));
  [[-0.95, -0.35], [0.95, 0.10], [-0.6, 0.85]].forEach(p => {
    g.appendChild(el("circle", { cx: p[0] * (r + 8), cy: p[1] * (r + 8), r: 2, fill: "#22d3ee" }));
  });
  g.style.animation = `${prefix}-shimmer 3.2s ease-in-out infinite`;
  return g;
}

// ──────────────────────────────────────────────────────────────
// Virus
// ──────────────────────────────────────────────────────────────
function makeVirusElement(size = 11) {
  const g = el("g");
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const sx = Math.cos(ang) * size;
    const sy = Math.sin(ang) * size;
    const tx = Math.cos(ang) * (size + 6.5);
    const ty = Math.sin(ang) * (size + 6.5);
    g.appendChild(el("line", {
      x1: sx, y1: sy, x2: tx, y2: ty,
      stroke: "#7f1d1d", "stroke-width": 1.6, "stroke-linecap": "round"
    }));
    g.appendChild(el("circle", {
      cx: tx, cy: ty, r: 2.8,
      fill: "#dc2626", stroke: "#7f1d1d", "stroke-width": 1
    }));
  }
  g.appendChild(el("circle", {
    cx: 0, cy: 0, r: size,
    fill: "#ef4444", stroke: "#7f1d1d", "stroke-width": 1.5
  }));
  g.appendChild(el("ellipse", {
    cx: -size * 0.35, cy: -size * 0.35,
    rx: size * 0.38, ry: size * 0.22,
    fill: "#fff", "fill-opacity": 0.55
  }));
  g.appendChild(el("circle", { cx: -size * 0.32, cy: -size * 0.05, r: 1.5, fill: "#fff" }));
  g.appendChild(el("circle", { cx:  size * 0.32, cy: -size * 0.05, r: 1.5, fill: "#fff" }));
  g.appendChild(el("circle", { cx: -size * 0.32, cy: -size * 0.05, r: 0.8, fill: INK }));
  g.appendChild(el("circle", { cx:  size * 0.32, cy: -size * 0.05, r: 0.8, fill: INK }));
  g.appendChild(el("path", {
    d: `M ${-size * 0.32} ${size * 0.45} Q 0 ${size * 0.28} ${size * 0.32} ${size * 0.45}`,
    fill: "none", stroke: "#fff", "stroke-width": 1.3, "stroke-linecap": "round"
  }));
  return g;
}

export function launchVirus(svg, x1, y1, x2, y2, opts = {}) {
  const {
    blockAt = null, onArrive = null, onBlocked = null,
    duration = 1300, size = 11, absorb = true, arc = 50
  } = opts;

  const virus = makeVirusElement(size);
  svg.appendChild(virus);

  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - arc;

  const t0 = performance.now();
  let blocked = false;

  function step(now) {
    let t = (now - t0) / duration;
    if (t < 0) t = 0;
    if (blockAt != null && t >= blockAt && !blocked) {
      blocked = true;
      const u = 1 - blockAt;
      const x = u*u*x1 + 2*u*blockAt*mx + blockAt*blockAt*x2;
      const y = u*u*y1 + 2*u*blockAt*my + blockAt*blockAt*y2;
      burst(svg, x, y);
      if (virus.parentNode) virus.parentNode.removeChild(virus);
      if (onBlocked) onBlocked();
      return;
    }
    if (t >= 1) {
      if (absorb) absorbInto(svg, virus, x2, y2);
      else if (virus.parentNode) virus.parentNode.removeChild(virus);
      if (onArrive) onArrive();
      return;
    }
    const u = 1 - t;
    const x = u*u*x1 + 2*u*t*mx + t*t*x2;
    const y = u*u*y1 + 2*u*t*my + t*t*y2;
    const rot = (t * 270) % 360;
    virus.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)})`);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function burst(svg, x, y) {
  const g = el("g", { transform: `translate(${x} ${y})` });
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    g.appendChild(el("line", {
      x1: 0, y1: 0,
      x2: (14 * Math.cos(ang)).toFixed(2),
      y2: (14 * Math.sin(ang)).toFixed(2),
      stroke: "#dc2626", "stroke-width": 2.6, "stroke-linecap": "round"
    }));
  }
  g.appendChild(el("circle", { cx: 0, cy: 0, r: 7, fill: "#fef2f2", stroke: "#dc2626", "stroke-width": 1.2 }));
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 8;
    g.appendChild(el("circle", {
      cx: 9 * Math.cos(ang), cy: 9 * Math.sin(ang),
      r: 1.6, fill: "#7f1d1d"
    }));
  }
  svg.appendChild(g);
  const t0 = performance.now();
  function fade(now) {
    const t = (now - t0) / 420;
    if (t >= 1) { if (g.parentNode) g.parentNode.removeChild(g); return; }
    g.setAttribute("opacity", String(1 - t));
    g.setAttribute("transform", `translate(${x} ${y}) scale(${(1 + t * 0.9).toFixed(3)})`);
    requestAnimationFrame(fade);
  }
  requestAnimationFrame(fade);
}

function absorbInto(svg, virus, x, y) {
  const t0 = performance.now();
  function fade(now) {
    const t = (now - t0) / 240;
    if (t >= 1) { if (virus.parentNode) virus.parentNode.removeChild(virus); return; }
    const s = 1 - t;
    virus.setAttribute("opacity", String(1 - t));
    virus.setAttribute("transform", `translate(${x} ${y}) scale(${s.toFixed(3)})`);
    requestAnimationFrame(fade);
  }
  requestAnimationFrame(fade);
}
