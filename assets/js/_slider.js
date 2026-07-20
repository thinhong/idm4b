// Reusable slider + button components for Quarto OJS pages
//
// Colors come from the IDM4b token palette (mirrors assets/tokens.css
// and assets/js/_tokens.js). The `cls` name a caller passes (e.g.
// "amber") now resolves to the token color, so existing call sites do
// not need to change and every slider matches the plots and page.
//
// Usage in any .qmd file:
//   import { createSlider, createButton, injectStyle } from "./_slider.js"
//   wrapper.appendChild(injectStyle());
//   const SL = {};
//   SL.n = createSlider("n (trials)", 1, 100, 1, 20, "#1B4DC7", "blue");
//   wrapper.appendChild(SL.n.el);
//   const btn = createButton("▶  Start", "go");
//   wrapper.appendChild(btn.el);

// Token colors (AA-safe on white; keep in sync with assets/tokens.css).
const SL_COL = {
  blue:   "#1B4DC7", // susceptible
  red:    "#C1343F", // infectious
  green:  "#0E7A54", // recovered
  amber:  "#9A5B00", // exposed
  purple: "#6742BE", // vaccinated / noise
  teal:   "#0A6E7D", // auxiliary
  dark:   "#14263b",
  gray:   "#42566b",
};

export function injectStyle(prefix = "sl") {
  const style = document.createElement("style");

  // ── Slider base ──
  style.textContent = `
    .${prefix}-slider{position:relative;height:8px;border-radius:4px;background:#e6f0fb;}
    .${prefix}-slider-fill{position:absolute;left:0;top:0;height:100%;border-radius:4px;transition:width 0.04s;}
    .${prefix}-slider input[type=range]{
      position:absolute;top:0;left:0;width:100%;height:100%;
      -webkit-appearance:none;appearance:none;background:transparent;
      cursor:pointer;margin:0;padding:0;
    }
    .${prefix}-slider input[type=range]::-webkit-slider-thumb{
      -webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;
      border:3px solid #fff;box-shadow:0 1px 5px rgba(2,33,71,0.28);
      cursor:pointer;margin-top:-6px;background:#1B4DC7;
    }
    .${prefix}-slider input[type=range]::-moz-range-thumb{
      width:20px;height:20px;border-radius:50%;border:3px solid #fff;
      box-shadow:0 1px 5px rgba(2,33,71,0.28);cursor:pointer;background:#1B4DC7;
    }
    .${prefix}-slider input[type=range]::-webkit-slider-runnable-track{height:8px;background:transparent;}
    .${prefix}-slider input[type=range]::-moz-range-track{height:8px;background:transparent;}
  `;

  // ── Slider color variants (token palette) ──
  for (const [name, hex] of Object.entries(SL_COL)) {
    style.textContent += `
      .${prefix}-slider-${name} input[type=range]::-webkit-slider-thumb{background:${hex};}
      .${prefix}-slider-${name} input[type=range]::-moz-range-thumb{background:${hex};}
    `;
  }

  // ── Button base + variants ──
  style.textContent += `
    .${prefix}-btn{
      padding:8px 0;border-radius:10px;border:1px solid #cfe0f2;
      background:#fff;color:#42566b;font-size:13px;font-weight:600;
      cursor:pointer;transition:background 0.1s;font-family:inherit;
      text-align:center;flex:1;
    }
    .${prefix}-btn:hover{background:#f1f6fd;}
    .${prefix}-btn-go{background:#1B4DC7;color:#fff;border-color:#143aa6;}
    .${prefix}-btn-go:hover{background:#143aa6;color:#fff;}
    .${prefix}-btn-step{background:#1B4DC7;color:#fff;border-color:#143aa6;}
    .${prefix}-btn-step:hover{background:#143aa6;color:#fff;}
    .${prefix}-btn-auto{background:#0E7A54;color:#fff;border-color:#0a5c3f;}
    .${prefix}-btn-auto:hover{background:#0a5c3f;color:#fff;}
    .${prefix}-btn-pause{background:#fff;color:#42566b;border-color:#cfe0f2;}
    .${prefix}-btn-pause:hover{background:#f1f6fd;color:#42566b;}
    .${prefix}-btn-reset{background:#fdecec;color:#C1343F;border-color:#f3c4c4;}
    .${prefix}-btn-reset:hover{background:#fbdcdc;color:#C1343F;}
  `;

  return style;
}

export function createSlider(label, min, max, step, val, color, cls, prefix = "sl") {
  // Resolve the color from the token palette by cls name (falls back
  // to the passed hex for any unknown name).
  color = SL_COL[cls] || color;

  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-direction:column;flex:1;min-width:120px;";

  const head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;";

  const lbl = document.createElement("span");
  lbl.style.cssText = "font-size:12px;font-weight:600;color:#647587;letter-spacing:0.3px;text-transform:uppercase;";
  lbl.textContent = label;

  const valSpan = document.createElement("span");
  valSpan.style.cssText = `font-size:18px;font-weight:800;color:${color};font-variant-numeric:tabular-nums;font-family:"JetBrains Mono","SF Mono",SFMono-Regular,Menlo,Consolas,monospace;`;

  const fmt = v => step < 0.1 ? v.toFixed(3) : step < 1 ? v.toFixed(2) : String(v);
  valSpan.textContent = fmt(val);

  head.appendChild(lbl); head.appendChild(valSpan);

  const track = document.createElement("div");
  track.className = `${prefix}-slider ${prefix}-slider-${cls}`;

  const fill = document.createElement("div");
  fill.className = `${prefix}-slider-fill`;
  fill.style.background = color;
  fill.style.width = ((val - min) / (max - min)) * 100 + "%";
  track.appendChild(fill);

  const input = document.createElement("input");
  input.type = "range"; input.min = min; input.max = max;
  input.step = step; input.value = val;
  track.appendChild(input);

  row.appendChild(head); row.appendChild(track);

  return {
    el: row, input, valSpan, fill,
    val() { return +input.value; },
    sync() {
      const v = +input.value;
      valSpan.textContent = fmt(v);
      const pct = ((v - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
      fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
    },
    update(v, lo, hi) {
      if (lo != null) input.min = lo;
      if (hi != null) input.max = hi;
      input.value = v;
      valSpan.textContent = fmt(v);
      const pct = ((v - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
      fill.style.width = Math.max(0, Math.min(100, pct)) + "%";
    }
  };
}

export function createButton(text, variant = "pause", prefix = "sl") {
  const btn = document.createElement("button");
  btn.className = `${prefix}-btn ${prefix}-btn-${variant}`;
  btn.textContent = text;
  return { el: btn, setText(t) { btn.textContent = t; } };
}

// Re-style a slider's label as italic math (instead of uppercase tracked sans).
// Handy for Greek symbols — CSS `text-transform:uppercase` renders β/σ/γ as Β/Σ/Γ,
// which is almost never what you want when the label is a parameter name. Pass one
// or more slider objects returned by createSlider().
export function styleMathLabel(...sliders) {
  for (const sl of sliders) {
    const lbl = sl && sl.el && sl.el.querySelector("span");
    if (!lbl) continue;
    lbl.style.textTransform = "none";
    lbl.style.letterSpacing = "0";
    lbl.style.fontFamily    = '"Latin Modern Math","STIX Two Math","Cambria Math","Times New Roman",serif';
    lbl.style.fontStyle     = "italic";
    lbl.style.fontWeight    = "500";
    lbl.style.fontSize      = "18px";
    lbl.style.color         = "#42566b";
  }
}
