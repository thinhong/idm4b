// Fast, responsive Monte Carlo pi figures for sto/index.qmd.
//
// Two exports, both driven by d3 v7 + the shared slider helper:
//   montecarloPi(d3, ui, data)    one simulation: scatter (canvas) + running estimate
//   montecarloSims(d3, ui, data2) many simulations: averaged estimate vs iterations
//
// Why it stays smooth:
//   - the point cloud is drawn on a <canvas> (thousands of points at 60fps,
//     where one SVG node per point stutters);
//   - each curve is a single, downsampled SVG path;
//   - slider moves and resizes are coalesced with requestAnimationFrame;
//   - a ResizeObserver measures the real container width and lays panels out
//     at actual pixel sizes, so axis text stays crisp instead of being scaled
//     down into an unreadable viewBox on small screens.
//
// d3 and the helpers are passed in (OJS loads d3 via require; helpers need the
// document global), mirroring _entropy-anim.js.
//
// Usage inside a Quarto OJS chunk:
//   import { createSlider, injectStyle } from "../assets/js/_slider.js"
//   import { montecarloPi, montecarloSims } from "../assets/js/_montecarlo-pi.js"
//   f1 = { const d3 = await require("d3@7");
//     return montecarloPi(d3, { createSlider, injectStyle }, transpose(data)); }
//   f2 = { const d3 = await require("d3@7");
//     return montecarloSims(d3, { createSlider, injectStyle }, transpose(data2)); }

const RAF = (typeof requestAnimationFrame === "function")
  ? cb => requestAnimationFrame(cb)
  : cb => setTimeout(() => cb(Date.now()), 16);
const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';
const truthy = v => v === true || v === 1 || v === "TRUE" || v === "true";
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const C_IN = "#16A06B", C_OUT = "#E0574E", C_LINE = "#1B4DC7", C_REF = "#9A5B00";

// throttle a callback to one call per animation frame
function rafThrottle(fn) {
  let queued = false;
  return () => { if (queued) return; queued = true; RAF(() => { queued = false; fn(); }); };
}

// ---------------------------------------------------------------------------
// Shared responsive line chart (single SVG path). Rebuilds its axes on resize
// so 1 viewBox unit == 1 CSS pixel and fonts render at their real size.
// ---------------------------------------------------------------------------
function makeLineChart(d3, opts) {
  const { yDomain, xLabel, yLabel, refY, refLabel = "π", yFmt, xFmt } = opts;
  const clampY = v => clamp(v, yDomain[0], yDomain[1]);

  const box = document.createElement("div");
  box.style.cssText = "min-width:0;";
  const svg = d3.create("svg")
    .attr("role", "img").attr("aria-label", yLabel + " versus " + xLabel)
    .style("display", "block").style("width", "100%").style("height", "auto")
    .style("border", "1px solid #e3edf9").style("border-radius", "8px").style("background", "#fff");
  box.appendChild(svg.node());

  let x, y, gx, path, dot, innerW = 0, innerH = 0;
  const gen = d3.line().x(d => x(d[0])).y(d => y(clampY(d[1])));

  function resize(w, h) {
    svg.attr("viewBox", "0 0 " + w + " " + h);
    svg.selectAll("*").remove();
    const showY = w > 240;
    const m = { top: 12, right: 16, bottom: 40, left: showY ? 52 : 30 };
    innerW = Math.max(10, w - m.left - m.right);
    innerH = Math.max(10, h - m.top - m.bottom);
    const g = svg.append("g").attr("transform", "translate(" + m.left + "," + m.top + ")");
    x = d3.scaleLinear().range([0, innerW]);
    y = d3.scaleLinear().domain(yDomain).range([innerH, 0]);

    y.ticks(Math.max(3, Math.round(innerH / 42))).forEach(t => {
      g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(t)).attr("y2", y(t))
        .attr("stroke", "#e6f0fb").attr("stroke-width", 1);
      g.append("text").attr("x", -6).attr("y", y(t)).attr("text-anchor", "end").attr("dominant-baseline", "middle")
        .attr("font-family", MONO).attr("font-size", 12).attr("fill", "#647587").text(yFmt(t));
    });
    if (refY != null) {
      g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(refY)).attr("y2", y(refY))
        .attr("stroke", C_REF).attr("stroke-width", 1.5).attr("stroke-dasharray", "5,4");
      g.append("text").attr("x", innerW - 2).attr("y", y(refY) - 5).attr("text-anchor", "end")
        .attr("font-family", "system-ui").attr("font-size", 13).attr("font-weight", 600).attr("fill", C_REF).text(refLabel);
    }
    g.append("text").attr("x", innerW / 2).attr("y", innerH + 34).attr("text-anchor", "middle")
      .attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b").text(xLabel);
    if (showY) {
      g.append("text").attr("transform", "translate(" + (-44) + "," + (innerH / 2) + ") rotate(-90)")
        .attr("text-anchor", "middle").attr("font-family", "system-ui").attr("font-size", 13).attr("fill", "#42566b").text(yLabel);
    }
    gx = g.append("g").attr("transform", "translate(0," + innerH + ")");
    path = g.append("path").attr("fill", "none").attr("stroke", C_LINE).attr("stroke-width", 2)
      .attr("stroke-linejoin", "round").attr("stroke-linecap", "round");
    dot = g.append("circle").attr("r", 3.4).attr("fill", C_LINE).attr("stroke", "#fff").attr("stroke-width", 1.5);
  }

  function update(points, xDomain) {
    if (!x) return;
    x.domain(xDomain);
    path.attr("d", gen(points));
    const last = points[points.length - 1];
    if (last) dot.attr("cx", x(last[0])).attr("cy", y(clampY(last[1])));
    gx.call(d3.axisBottom(x).ticks(innerW < 220 ? 3 : 5).tickFormat(xFmt).tickSizeOuter(0));
    gx.selectAll("text").attr("font-family", MONO).attr("font-size", 12).attr("fill", "#647587");
    gx.selectAll("line").attr("stroke", "#cfe0f2");
    gx.select(".domain").attr("stroke", "#cfe0f2");
  }

  return { node: box, resize, update, innerWidth: () => innerW };
}

function shell(ui) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "font-family:system-ui,-apple-system,sans-serif;max-width:760px;margin:0 auto;touch-action:manipulation;";
  wrap.appendChild(ui.injectStyle());
  return wrap;
}
function sliderRow(sl) {
  const bx = document.createElement("div");
  bx.style.cssText = "margin-bottom:10px;";
  bx.appendChild(sl.el);
  return bx;
}
function readoutEl() {
  const r = document.createElement("div");
  r.style.cssText = "font-size:14px;color:#42566b;margin:0 0 12px 2px;font-variant-numeric:tabular-nums;line-height:1.4;";
  return r;
}

// ---------------------------------------------------------------------------
// Figure 1: one simulation. Scatter (canvas) + running estimate (line), side by
// side at any width. data: array of { xs, ys, in_circle }.
// ---------------------------------------------------------------------------
export function montecarloPi(d3, ui, data) {
  const { createSlider } = ui;
  const N = data.length;
  const xs = Float64Array.from(data, d => +d.xs);
  const ys = Float64Array.from(data, d => +d.ys);
  const inside = Uint8Array.from(data, d => truthy(d.in_circle) ? 1 : 0);
  const cumIn = new Int32Array(N);
  const piCum = new Float64Array(N);
  for (let i = 0, c = 0; i < N; i++) { c += inside[i]; cumIn[i] = c; piCum[i] = 4 * c / (i + 1); }
  const TAU = 6.283185307;

  const wrap = shell(ui);
  const sl = createSlider("Number of points", 10, N, 1, 1000, C_LINE, "blue");
  const readout = readoutEl();
  const panels = document.createElement("div");
  panels.style.cssText = "display:flex;gap:10px;align-items:flex-start;";

  const scatterBox = document.createElement("div");
  scatterBox.style.cssText = "flex:0 0 auto;";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;border:1px solid #e3edf9;border-radius:8px;background:#fff;";
  scatterBox.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const chart = makeLineChart(d3, {
    yDomain: [2, 3.28], xLabel: "number of points", yLabel: "π estimate",
    refY: Math.PI, yFmt: t => t.toFixed(1), xFmt: d3.format("~s")
  });

  panels.appendChild(scatterBox);
  panels.appendChild(chart.node);
  chart.node.style.flex = "1 1 auto";
  wrap.appendChild(sliderRow(sl));
  wrap.appendChild(readout);
  wrap.appendChild(panels);

  let S = 280, padS = 11, R = 2.2, curN = 1000;

  function drawScatter(n) {
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = "#e3edf9"; ctx.lineWidth = 1;
    ctx.strokeRect(padS, padS, S - 2 * padS, S - 2 * padS);
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, (S - 2 * padS) / 2, 0, TAU);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "#cfe0f2"; ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 0.82;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? C_OUT : C_IN;
      const want = pass ? 0 : 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (inside[i] !== want) continue;
        const cx = padS + (xs[i] + 1) / 2 * (S - 2 * padS);
        const cy = padS + (1 - (ys[i] + 1) / 2) * (S - 2 * padS);
        ctx.moveTo(cx + R, cy);
        ctx.arc(cx, cy, R, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function linePoints(n) {
    const budget = Math.max(2, Math.floor((chart.innerWidth() || 300) * 2));
    const step = Math.max(1, Math.ceil(n / budget));
    const pts = [];
    for (let i = 0; i < n; i += step) pts.push([i + 1, piCum[i]]);
    if (!pts.length || pts[pts.length - 1][0] !== n) pts.push([n, piCum[n - 1]]);
    return pts;
  }

  function draw(n) {
    n = clamp(n | 0, 1, N);
    drawScatter(n);
    chart.update(linePoints(n), [0, n]);
    const ins = cumIn[n - 1];
    readout.innerHTML =
      "π &approx; <b style=\"color:" + C_LINE + ";font-size:15px;\">" + (4 * ins / n).toFixed(4) + "</b>" +
      " from <b>" + n.toLocaleString() + "</b> points " +
      "(<b style=\"color:" + C_IN + "\">" + ins.toLocaleString() + " inside</b>, " +
      "<b style=\"color:" + C_OUT + "\">" + (n - ins).toLocaleString() + " outside</b>)";
  }

  function relayout() {
    const W = panels.clientWidth || wrap.clientWidth;
    if (!W) return;
    const gap = 10;
    S = clamp(Math.round(W * 0.42), 120, 260);
    padS = Math.max(6, Math.round(S * 0.04));
    R = clamp(S / 120, 1.5, 2.4);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + "px"; canvas.style.height = S + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scatterBox.style.flexBasis = S + "px";
    chart.resize(Math.max(150, W - S - gap), S);
    draw(curN);
  }

  sl.input.addEventListener("input", () => {
    sl.sync(); curN = Math.round(sl.val());
    scheduleDraw();
  });
  const scheduleDraw = rafThrottle(() => draw(curN));
  const relayoutT = rafThrottle(relayout);
  if (typeof ResizeObserver === "function") new ResizeObserver(relayoutT).observe(panels);
  RAF(relayout);
  return wrap;
}

// ---------------------------------------------------------------------------
// Figure 2: many simulations. Averaged estimate vs number of iterations, one
// line per chosen sample size. data2: array of { n_samples, n_sims, my_pi }.
// ---------------------------------------------------------------------------
export function montecarloSims(d3, ui, data2) {
  const { createSlider } = ui;
  const groups = new Map();
  let xMax = 0;
  for (const r of data2) {
    const k = +r.n_samples, ns = +r.n_sims;
    if (ns > xMax) xMax = ns;
    let arr = groups.get(k);
    if (!arr) { arr = []; groups.set(k, arr); }
    arr.push([ns, +r.my_pi]);
  }
  for (const arr of groups.values()) arr.sort((a, b) => a[0] - b[0]);
  const keys = [...groups.keys()].sort((a, b) => a - b);
  const minK = keys[0], maxK = keys[keys.length - 1];
  const stepK = keys.length > 1 ? keys[1] - keys[0] : 10;
  const snap = v => keys.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a, keys[0]);

  const wrap = shell(ui);
  const sl = createSlider("Points per simulation", minK, maxK, stepK, minK, C_LINE, "blue");
  const readout = readoutEl();
  const chart = makeLineChart(d3, {
    yDomain: [3.05, 3.235], xLabel: "iteration (simulations averaged)", yLabel: "π estimate",
    refY: 3.14159, yFmt: t => t.toFixed(2), xFmt: d3.format("~s")
  });
  chart.node.style.width = "100%";
  wrap.appendChild(sliderRow(sl));
  wrap.appendChild(readout);
  wrap.appendChild(chart.node);

  let curK = minK;
  function draw(k) {
    k = snap(k);
    const pts = groups.get(k);
    chart.update(pts, [pts[0][0], xMax]);
    const last = pts[pts.length - 1];
    readout.innerHTML =
      "π &approx; <b style=\"color:" + C_LINE + ";font-size:15px;\">" + last[1].toFixed(4) + "</b>" +
      " averaging <b>" + xMax.toLocaleString() + "</b> simulations of <b>" + k + "</b> points each";
  }
  function relayout() {
    const W = wrap.clientWidth;
    if (!W) return;
    chart.resize(W, clamp(Math.round(W * 0.5), 190, 300));
    draw(curK);
  }
  sl.input.addEventListener("input", () => { sl.sync(); curK = Math.round(sl.val()); scheduleDraw(); });
  const scheduleDraw = rafThrottle(() => draw(curK));
  const relayoutT = rafThrottle(relayout);
  if (typeof ResizeObserver === "function") new ResizeObserver(relayoutT).observe(wrap);
  RAF(relayout);
  return wrap;
}
