// Reusable slider + button components for Quarto OJS pages
//
// Usage in any .qmd file:
//   import { createSlider, createButton, injectStyle } from "./_slider.js"
//
//   wrapper.appendChild(injectStyle());
//
//   const SL = {};
//   SL.n = createSlider("n (trials)", 1, 100, 1, 20, "#1e293b", "dark");
//   wrapper.appendChild(SL.n.el);
//
//   const btn = createButton("▶  Start", "go");
//   wrapper.appendChild(btn.el);

export function injectStyle(prefix = "sl") {
  const style = document.createElement("style");

  // ── Slider base ──
  style.textContent = `
    .${prefix}-slider{position:relative;height:8px;border-radius:4px;background:#e2e8f0;}
    .${prefix}-slider-fill{position:absolute;left:0;top:0;height:100%;border-radius:4px;transition:width 0.04s;}
    .${prefix}-slider input[type=range]{
      position:absolute;top:0;left:0;width:100%;height:100%;
      -webkit-appearance:none;appearance:none;background:transparent;
      cursor:pointer;margin:0;padding:0;
    }
    .${prefix}-slider input[type=range]::-webkit-slider-thumb{
      -webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;
      border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.28);
      cursor:pointer;margin-top:-6px;background:#475569;
    }
    .${prefix}-slider input[type=range]::-moz-range-thumb{
      width:14px;height:14px;border-radius:50%;border:3px solid #fff;
      box-shadow:0 1px 5px rgba(0,0,0,0.28);cursor:pointer;background:#475569;
    }
    .${prefix}-slider input[type=range]::-webkit-slider-runnable-track{height:8px;background:transparent;}
    .${prefix}-slider input[type=range]::-moz-range-track{height:8px;background:transparent;}
  `;

  // ── Slider color variants ──
  const colors = {
    dark: "#1e293b",
    blue: "#3b82f6",
    red: "#dc2626",
    green: "#16a34a",
    amber: "#d97706",
    purple: "#7c3aed",
    teal: "#0891b2",
    gray: "#475569"
  };
  for (const [name, hex] of Object.entries(colors)) {
    style.textContent += `
      .${prefix}-slider-${name} input[type=range]::-webkit-slider-thumb{background:${hex};}
      .${prefix}-slider-${name} input[type=range]::-moz-range-thumb{background:${hex};}
    `;
  }

  // ── Button base + variants ──
  style.textContent += `
    .${prefix}-btn{
      padding:8px 0;border-radius:8px;border:1px solid #d1d5db;
      background:#fff;color:#374151;font-size:13px;font-weight:600;
      cursor:pointer;transition:background 0.1s;font-family:inherit;
      text-align:center;flex:1;
    }
    .${prefix}-btn:hover{background:#f3f4f6;}
    .${prefix}-btn-go{background:#3b82f6;color:#fff;border-color:#2563eb;}
    .${prefix}-btn-go:hover{background:#2563eb;color:#fff;}
    .${prefix}-btn-step{background:#3b82f6;color:#fff;border-color:#2563eb;}
    .${prefix}-btn-step:hover{background:#2563eb;color:#fff;}
    .${prefix}-btn-auto{background:#16a34a;color:#fff;border-color:#15803d;}
    .${prefix}-btn-auto:hover{background:#15803d;color:#fff;}
    .${prefix}-btn-pause{background:#fff;color:#374151;border-color:#d1d5db;}
    .${prefix}-btn-pause:hover{background:#f3f4f6;color:#374151;}
    .${prefix}-btn-reset{background:#fef2f2;color:#dc2626;border-color:#fecaca;}
    .${prefix}-btn-reset:hover{background:#fee2e2;color:#dc2626;}
  `;

  return style;
}

export function createSlider(label, min, max, step, val, color, cls, prefix = "sl") {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-direction:column;flex:1;min-width:120px;";

  const head = document.createElement("div");
  head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;";

  const lbl = document.createElement("span");
  lbl.style.cssText = "font-size:12px;font-weight:600;color:#64748b;letter-spacing:0.3px;text-transform:uppercase;";
  lbl.textContent = label;

  const valSpan = document.createElement("span");
  valSpan.style.cssText = `font-size:18px;font-weight:800;color:${color};font-variant-numeric:tabular-nums;font-family:"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;`;

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
//
// The font stack mirrors KaTeX/MathJax so labels visually match inline equations.
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
    lbl.style.color         = "#334155";
  }
}