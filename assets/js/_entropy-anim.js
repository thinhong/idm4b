// Interactive build-up of Shannon entropy for dict.qmd
//
// Two small, mobile-friendly widgets driven by D3 v7 and the shared
// slider / button helpers in _slider.js.
//
// Usage inside a Quarto OJS chunk:
//   import { createSlider, createButton, injectStyle, styleMathLabel } from "./_slider.js"
//   import { coinSurprise, coinEntropy } from "./_entropy-anim.js"
//   d3 = require("d3@7")
//   ui = ({ createSlider, createButton, injectStyle, styleMathLabel })
//   coinSurprise(d3, ui)   // widget 1: surprise  -log2 p
//   coinEntropy(d3, ui)    // widget 2: binary entropy  H(p)
//
// d3 and the helpers are passed in (rather than imported here) because OJS
// loads d3 through require() and the helpers rely on the document global.

const LOG2 = Math.log(2);
const log2 = x => Math.log(x) / LOG2;

// raf helpers, wrapped so the global keeps its correct `this` (avoids
// "Illegal invocation" in some browsers) and falls back outside the browser
const RAF = (typeof requestAnimationFrame === "function")
  ? (cb => requestAnimationFrame(cb))
  : (cb => setTimeout(() => cb(Date.now()), 16));
const CAF = (typeof cancelAnimationFrame === "function")
  ? (id => cancelAnimationFrame(id))
  : (id => clearTimeout(id));

// ───────────────────────────────────────────────────────────────────────────
// Widget 1: surprise / information content   I(p) = -log2 p
// ───────────────────────────────────────────────────────────────────────────
export function coinSurprise(d3, ui) {
  const { createSlider, createButton, injectStyle, styleMathLabel } = ui;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:0 auto;touch-action:manipulation;";
  wrapper.appendChild(injectStyle());

  // ── Controls ──
  const SL_p = createSlider("p  (probability of the outcome)", 0.02, 1.0, 0.01, 0.5, "#7E5AD6", "purple");
  styleMathLabel(SL_p);
  const playBtn = createButton("▶  Sweep p", "go");

  const ctrlRow = document.createElement("div");
  ctrlRow.style.cssText = "display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 16px 0;";
  const btnBox = document.createElement("div");
  btnBox.style.cssText = "display:flex;flex:0 0 150px;min-width:130px;";
  btnBox.appendChild(playBtn.el);
  ctrlRow.appendChild(SL_p.el);
  ctrlRow.appendChild(btnBox);

  // ── SVG (redrawn at the container's real pixel width so text stays full size on phones) ──
  const margin = { top: 26, right: 24, bottom: 52, left: 62 };
  const PMIN = 0.02, YMAX = 6;

  const svg = d3.create("svg")
    .attr("width", "100%")
    .attr("role", "img")
    .attr("aria-label", "Surprise of an outcome, minus log base 2 of p, plotted against its probability p")
    .style("max-width", "720px")
    .style("height", "auto")
    .style("display", "block")
    .style("border", "1px solid #e3edf9")
    .style("border-radius", "8px")
    .style("background", "#fff");

  let x, y, innerW, innerH, cursorLine, cursorDot, readout;
  function layout(cw) {
    const W = Math.min(720, Math.max(280, Math.round(cw)));
    const H = Math.max(240, Math.min(420, Math.round(W * 0.58)));
    innerW = W - margin.left - margin.right;
    innerH = H - margin.top - margin.bottom;
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    svg.selectAll("g").remove();
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
    y = d3.scaleLinear().domain([0, YMAX]).range([innerH, 0]);

  // gridlines + ticks
  const grid = g.append("g");
  for (let b = 0; b <= YMAX; b++) {
    grid.append("line")
      .attr("x1", 0).attr("x2", innerW).attr("y1", y(b)).attr("y2", y(b))
      .attr("stroke", "#e6f0fb").attr("stroke-width", 1);
    grid.append("text")
      .attr("x", -10).attr("y", y(b)).attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587")
      .text(b);
  }
  for (let p = 0; p <= 1.0001; p += 0.25) {
    grid.append("line")
      .attr("x1", x(p)).attr("x2", x(p)).attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#e6f0fb");
    grid.append("text")
      .attr("x", x(p)).attr("y", innerH + 18).attr("text-anchor", "middle")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587")
      .text(p.toFixed(2));
  }

  // axis labels
  g.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 42).attr("text-anchor", "middle")
    .attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b")
    .text("probability  p");
  g.append("text")
    .attr("transform", `translate(${-46},${innerH / 2}) rotate(-90)`).attr("text-anchor", "middle")
    .attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b")
    .text("surprise  −log₂ p  (bits)");

  // the curve
  const curve = [];
  for (let p = PMIN; p <= 1.00001; p += 0.002) curve.push({ p, s: -log2(p) });
  const line = d3.line().x(d => x(d.p)).y(d => y(Math.min(YMAX, d.s)));
  g.append("path").datum(curve)
    .attr("fill", "none").attr("stroke", "#7E5AD6").attr("stroke-width", 2.5)
    .attr("d", line);

  // halving markers: p = 1, 1/2, 1/4, 1/8, 1/16, 1/32  ->  0,1,2,3,4,5 bits
  const halv = g.append("g");
  for (let k = 0; k <= 5; k++) {
    const p = Math.pow(0.5, k);
    if (p < PMIN) continue;
    const s = k; // -log2(2^-k) = k
    halv.append("line")
      .attr("x1", x(p)).attr("x2", x(p)).attr("y1", y(s)).attr("y2", innerH)
      .attr("stroke", "#cfe0f2").attr("stroke-dasharray", "2,4").attr("stroke-width", 1);
    halv.append("circle")
      .attr("cx", x(p)).attr("cy", y(s)).attr("r", 3.5)
      .attr("fill", "#fff").attr("stroke", "#7E5AD6").attr("stroke-width", 2);
    halv.append("text")
      .attr("x", x(p) + (k === 0 ? -7 : 7)).attr("y", y(s) - 7)
      .attr("text-anchor", k === 0 ? "end" : "start")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587")
      .text(k === 0 ? "0 bits" : `${k} bit${k > 1 ? "s" : ""}`);
  }

    // cursor
    cursorLine = g.append("line").attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "#647587").attr("stroke-width", 1).attr("stroke-dasharray", "3,3");
    cursorDot = g.append("circle").attr("r", 6)
      .attr("fill", "#7E5AD6").attr("stroke", "#fff").attr("stroke-width", 2);
    readout = g.append("text")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13)
      .attr("font-weight", 700).attr("fill", "#7E5AD6");
    render();
  }

  // interpretation line
  const interp = document.createElement("div");
  interp.style.cssText = "font-size:13px;color:#42566b;margin-top:12px;line-height:1.6;min-height:42px;";

  function render() {
    if (!x) return;
    const p = SL_p.val();
    const s = -log2(p);
    const sc = Math.min(YMAX, s);
    cursorLine.attr("x1", x(p)).attr("x2", x(p));
    cursorDot.attr("cx", x(p)).attr("cy", y(sc));

    const nearRight = x(p) > innerW - 130;
    readout
      .attr("x", x(p) + (nearRight ? -12 : 12))
      .attr("y", Math.max(14, y(sc) - 14))
      .attr("text-anchor", nearRight ? "end" : "start")
      .text(`−log₂(${p.toFixed(2)}) = ${s.toFixed(2)} bits`);

    let msg;
    if (p >= 0.98)
      msg = `<b>Almost certain.</b> You learn almost nothing when it happens. Surprise ≈ 0 bits.`;
    else if (Math.abs(p - 0.5) < 0.02)
      msg = `<b>A fair coin flip.</b> One yes / no question's worth of information: exactly 1 bit.`;
    else if (p <= 0.1)
      msg = `<b>Rare outcome.</b> Very surprising when it happens: ${s.toFixed(2)} bits.`;
    else
      msg = `An outcome with probability ${p.toFixed(2)} carries <b>${s.toFixed(2)} bits</b> of surprise.`;
    interp.innerHTML = msg;
  }

  // sweep animation (bounces between the ends until paused)
  let raf = null, dir = -1;
  function stop() { CAF(raf); raf = null; playBtn.setText("▶  Sweep p"); }
  function step() {
    let p = SL_p.val() + dir * 0.006;
    if (p <= PMIN) { p = PMIN; dir = 1; }
    else if (p >= 1) { p = 1; dir = -1; }
    SL_p.update(p);
    render();
    raf = RAF(step);
  }
  playBtn.el.addEventListener("click", () => {
    if (raf) { stop(); return; }
    dir = SL_p.val() <= PMIN + 0.01 ? 1 : -1;
    playBtn.setText("⏸  Pause");
    raf = RAF(step);
  });
  SL_p.input.addEventListener("input", () => { SL_p.sync(); render(); });

  wrapper.appendChild(ctrlRow);
  wrapper.appendChild(svg.node());
  wrapper.appendChild(interp);
  let lastW = 0;
  function relayout() {
    const cw = wrapper.clientWidth || 720;
    if (Math.abs(cw - lastW) < 1) return;
    lastW = cw;
    layout(cw);
  }
  if (typeof ResizeObserver === "function") new ResizeObserver(relayout).observe(wrapper);
  relayout();
  return wrapper;
}

// ───────────────────────────────────────────────────────────────────────────
// Widget 2: binary entropy   H(p) = -p log2 p - (1-p) log2 (1-p)
// ───────────────────────────────────────────────────────────────────────────
export function coinEntropy(d3, ui) {
  const { createSlider, createButton, injectStyle, styleMathLabel } = ui;

  // entropy of a coin with P(heads) = p, in bits (0 log 0 := 0)
  const term = q => (q <= 0 || q >= 1) ? 0 : -q * log2(q);
  const Hf = p => term(p) + term(1 - p);
  const fmt = v => v.toFixed(2);

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:0 auto;touch-action:manipulation;";
  wrapper.appendChild(injectStyle());

  // ── Controls ──
  const SL_p = createSlider("p  (probability of heads)", 0, 1, 0.01, 0.5, "#B45309", "amber");
  styleMathLabel(SL_p);
  const playBtn = createButton("▶  Sweep p", "go");

  const ctrlRow = document.createElement("div");
  ctrlRow.style.cssText = "display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 16px 0;";
  const btnBox = document.createElement("div");
  btnBox.style.cssText = "display:flex;flex:0 0 150px;min-width:130px;";
  btnBox.appendChild(playBtn.el);
  ctrlRow.appendChild(SL_p.el);
  ctrlRow.appendChild(btnBox);

  // ── Two panels that reflow on small screens ──
  const panels = document.createElement("div");
  panels.style.cssText = "display:flex;gap:18px;flex-wrap:wrap;align-items:stretch;";

  // Decomposition card (HTML, reflows naturally and stays crisp on mobile)
  const card = document.createElement("div");
  card.style.cssText =
    "flex:1 1 280px;min-width:260px;border:1px solid #e3edf9;border-radius:8px;padding:14px 16px;background:#fff;box-sizing:border-box;";

  function outcomeRow(coinChar, coinBg) {
    const r = document.createElement("div");
    r.style.cssText = "display:flex;align-items:center;gap:12px;margin:8px 0;";
    const coin = document.createElement("div");
    coin.style.cssText =
      `flex:0 0 34px;width:34px;height:34px;border-radius:50%;background:${coinBg};color:#fff;` +
      `font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px;` +
      `box-shadow:0 1px 4px rgba(0,0,0,0.18);`;
    coin.textContent = coinChar;
    const txt = document.createElement("div");
    txt.style.cssText = "font-size:13px;color:#42566b;line-height:1.55;";
    r.appendChild(coin); r.appendChild(txt);
    return { r, txt };
  }
  const headsRow = outcomeRow("H", "#B45309");
  const tailsRow = outcomeRow("T", "#647587");
  card.appendChild(headsRow.r);
  card.appendChild(tailsRow.r);

  // stacked bar: total length is H, split into the two weighted surprises
  const barLbl = document.createElement("div");
  barLbl.style.cssText = "font-size:13px;color:#647587;text-transform:uppercase;letter-spacing:0.4px;margin:12px 0 5px;";
  barLbl.textContent = "Entropy = sum of weighted surprises";
  const bar = document.createElement("div");
  bar.style.cssText = "position:relative;height:22px;border-radius:5px;background:#f1f5f9;overflow:hidden;display:flex;";
  const barH = document.createElement("div"); barH.style.cssText = "height:100%;background:#E5A800;transition:width 0.05s;";
  const barT = document.createElement("div"); barT.style.cssText = "height:100%;background:#647587;transition:width 0.05s;";
  bar.appendChild(barH); bar.appendChild(barT);
  card.appendChild(barLbl); card.appendChild(bar);

  const total = document.createElement("div");
  total.style.cssText = "font-size:14px;font-weight:700;color:#14263b;margin-top:9px;font-family:'SF Mono',Menlo,Consolas,monospace;";
  card.appendChild(total);

  // Curve panel (SVG)
  const W = 420, H = 300;
  const margin = { top: 22, right: 18, bottom: 44, left: 46 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  const svgBox = document.createElement("div");
  svgBox.style.cssText = "flex:1 1 360px;min-width:300px;";

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("width", "100%")
    .attr("role", "img")
    .attr("aria-label", "Binary entropy H of p, a dome peaking at one bit when p equals one half")
    .style("max-width", W + "px").style("height", "auto").style("display", "block")
    .style("border", "1px solid #e3edf9").style("border-radius", "8px").style("background", "#fff");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]);
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0]);

  const grid = g.append("g");
  for (const b of [0, 0.25, 0.5, 0.75, 1]) {
    grid.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(b)).attr("y2", y(b)).attr("stroke", "#e6f0fb");
    grid.append("text").attr("x", -8).attr("y", y(b)).attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587").text(b);
  }
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    grid.append("text").attr("x", x(p)).attr("y", innerH + 16).attr("text-anchor", "middle")
      .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587").text(p);
  }
  g.append("text").attr("x", innerW / 2).attr("y", innerH + 36).attr("text-anchor", "middle")
    .attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b").text("p = P(heads)");
  g.append("text").attr("transform", `translate(${-34},${innerH / 2}) rotate(-90)`).attr("text-anchor", "middle")
    .attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b").text("entropy  H(p)  (bits)");

  // entropy curve + soft fill
  const cdata = [];
  for (let p = 0; p <= 1.00001; p += 0.005) cdata.push({ p, h: Hf(p) });
  const area = d3.area().x(d => x(d.p)).y0(innerH).y1(d => y(d.h));
  const line = d3.line().x(d => x(d.p)).y(d => y(d.h));
  g.append("path").datum(cdata).attr("fill", "#fef3c7").attr("opacity", 0.7).attr("d", area);
  g.append("path").datum(cdata).attr("fill", "none").attr("stroke", "#B45309").attr("stroke-width", 2.5).attr("d", line);

  // max marker at p = 0.5
  g.append("line").attr("x1", x(0.5)).attr("x2", x(0.5)).attr("y1", y(1)).attr("y2", innerH)
    .attr("stroke", "#cfe0f2").attr("stroke-dasharray", "2,4");
  g.append("text").attr("x", x(0.5)).attr("y", y(1) - 6).attr("text-anchor", "middle")
    .attr("font-family", `"SF Mono",Menlo,Consolas,monospace`).attr("font-size", 13).attr("fill", "#647587").text("max = 1 bit");

  const cur = g.append("circle").attr("r", 6).attr("fill", "#B45309").attr("stroke", "#fff").attr("stroke-width", 2);

  const cap = document.createElement("div");
  cap.style.cssText = "font-size:13px;color:#647587;margin-top:8px;line-height:1.55;";

  svgBox.appendChild(svg.node());
  svgBox.appendChild(cap);
  panels.appendChild(card);
  panels.appendChild(svgBox);

  function render() {
    const p = SL_p.val();
    const q = 1 - p;
    const h = Hf(p);
    const sH = p <= 0 ? Infinity : -log2(p);
    const sT = q <= 0 ? Infinity : -log2(q);
    const cH = p <= 0 ? 0 : p * sH;   // = -p log2 p
    const cT = q <= 0 ? 0 : q * sT;   // = -(1-p) log2 (1-p)

    headsRow.txt.innerHTML = p <= 0
      ? `<b>Heads</b> never happens (p = 0), so it contributes 0 bits.`
      : `<b>Heads</b>: P = ${p.toFixed(2)}, surprise = ${fmt(sH)} bits<br>weight × surprise = ${p.toFixed(2)} × ${fmt(sH)} = <b>${fmt(cH)} bits</b>`;
    tailsRow.txt.innerHTML = q <= 0
      ? `<b>Tails</b> never happens (1−p = 0), so it contributes 0 bits.`
      : `<b>Tails</b>: P = ${q.toFixed(2)}, surprise = ${fmt(sT)} bits<br>weight × surprise = ${q.toFixed(2)} × ${fmt(sT)} = <b>${fmt(cT)} bits</b>`;

    barH.style.width = (Math.max(0, cH) * 100) + "%";
    barT.style.width = (Math.max(0, cT) * 100) + "%";
    total.innerHTML = `H(p) = ${fmt(cH)} + ${fmt(cT)} = ${fmt(h)} bits`;

    cur.attr("cx", x(p)).attr("cy", y(h));

    let msg;
    if (p <= 0.001 || p >= 0.999) msg = "The coin always lands the same way. No uncertainty: H = 0 bits.";
    else if (Math.abs(p - 0.5) < 0.01) msg = "A fair coin: maximum uncertainty, H = 1 bit.";
    else msg = `Biased coin: more predictable than fair, so H = ${fmt(h)} bits (less than 1).`;
    cap.textContent = msg;
  }

  // sweep animation (bounces between the ends until paused)
  let raf = null, dir = 1;
  function stop() { CAF(raf); raf = null; playBtn.setText("▶  Sweep p"); }
  function step() {
    let p = SL_p.val() + dir * 0.005;
    if (p >= 1) { p = 1; dir = -1; }
    else if (p <= 0) { p = 0; dir = 1; }
    SL_p.update(p);
    render();
    raf = RAF(step);
  }
  playBtn.el.addEventListener("click", () => {
    if (raf) { stop(); return; }
    dir = SL_p.val() >= 0.99 ? -1 : 1;
    playBtn.setText("⏸  Pause");
    raf = RAF(step);
  });
  SL_p.input.addEventListener("input", () => { SL_p.sync(); render(); });

  wrapper.appendChild(ctrlRow);
  wrapper.appendChild(panels);
  render();
  return wrapper;
}
