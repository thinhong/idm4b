# IDM4b Design System: implementation and restructure plan

Goal: ship the chosen look (Harbor colors, Source typography, Compact size) and, more importantly, change *how* design is done so every layer of the book (page chrome, static figures, interactive widgets) reads from one source and stays consistent forever.

---

## 1. The core problem

Right now the design lives in three places that do not talk to each other:

| Layer | Where | State today |
|---|---|---|
| Page chrome (HTML/CSS) | `assets/theme.scss`, `_quarto.yml` | Almost empty (only rounded buttons). Uses stock `cosmo`. No tokens. |
| Static figures (ggplot2) | ~26 inline theme calls across 48 `.qmd` | Inconsistent: `theme_minimal` x15, `theme_classic` x9, `theme_bw` x2. Fonts use `PT Sans Narrow` in 7 plots. Ad hoc `scale_*_manual`. |
| Interactive widgets (OJS + D3) | `assets/js/_slider.js`, `_entropy-anim.js`, `_montecarlo-pi.js`, `_vax-anim.js` | 50+ hardcoded hex values. Tailwind palette (`#3b82f6`, `#dc2626`, ...). Slider colors passed inline in every `.qmd`. |

The same idea (for example "infectious = red") is re-encoded with a different hex in every layer. Change one and the others drift. That is what we are fixing.

---

## 2. Target architecture: one source, three consumers

```
                 tokens (single source of truth)
        assets/_tokens.scss  +  :root CSS custom properties
                          |
        +-----------------+------------------+
        |                 |                  |
   CSS / Bootstrap    R / ggplot         OJS / D3
   theme.scss         R/idm-theme.R      assets/js/_tokens.js
   (page chrome)      (static figures)   (interactive widgets)
```

- The **SCSS token file** defines every color, font, size, radius, and motion value once.
- It also emits matching **`:root` CSS custom properties** (for example `--c-infectious`), so the browser holds the live values.
- **OJS/D3 widgets** read those same custom properties at runtime (`getComputedStyle`), so a widget can never disagree with the page.
- **R figures** read a small palette file that mirrors the exact same hex values, plus the same fonts, so a static plot matches a live one.

Rule after this: never write a raw hex or font name in a page, plot, or widget again. Use `var(--token)` in CSS, `token()` in JS, `idm_pal()` / `theme_idm()` in R.

---

## 3. The tokens (final spec)

Typography (Source, Compact):
- Headings: Source Serif 4, weight 600.
- Body / UI: Inter, 400/500/600/700.
- Code: JetBrains Mono.
- Base 15px, modular scale ratio 1.2: caption 12, body 15, lead 17, h3 18, h2 21, h1 clamp to ~26.
- Line height 1.62 body, 1.2 headings. Reading measure ~68ch.

Core color (Harbor on white):
- Oxford blue `#002147` (primary, headings), cobalt `#1B4DC7` (links, buttons, focus).
- Ink `#14263b` / `#42566b` / `#647587`. Surfaces `#f1f6fd` / `#e6f0fb`. Borders `#e3edf9` / `#cfe0f2`.
- Radius 14px, soft shadows, all as tokens.

Semantic + compartment palette (the piece that unifies plots and widgets). Each role gets an AA-safe text value and a brighter line value:

| Role | Token | Line/plot | Text/AA |
|---|---|---|---|
| Susceptible | `--c-s` | `#2A5CD6` | `#1B4DC7` |
| Infectious | `--c-i` | `#E0574E` | `#C1343F` |
| Recovered / Removed | `--c-r` | `#16A06B` | `#0E7A54` |
| Exposed | `--c-e` | `#E0960A` | `#9A5B00` |
| Vaccinated / other | `--c-v` | `#7E5AD6` | `#6742BE` |
| Auxiliary | `--c-aux` | `#0E9AAB` | `#0A6E7D` |

This intentionally matches the roles already implied by the sliders (blue=S, red=I, green=R, amber=E/beta, purple=noise), so behavior stays familiar while the hues move onto the Harbor system. Callouts map the same way: note=S blue, tip=R green, warning=E amber, important=I coral, plus a key-idea in Oxford blue.

Motion tokens (shared CSS + JS): duration fast 180ms / base 240ms / slow 340ms; easing `cubic-bezier(.22,.61,.36,1)`; all guarded by `prefers-reduced-motion`.

---

## 4. Phase 1: page chrome (CSS + Quarto)

Files: new `assets/_tokens.scss`, rewrite `assets/theme.scss`, edit `_quarto.yml`.

- Create `_tokens.scss`: all tokens as SCSS variables + a `:root { --... }` block for runtime access.
- `theme.scss` `scss:defaults`: map Bootstrap variables (`$primary`, `$body-color`, `$link-color`, `$font-family-sans-serif`, `$headings-font-family`, `$font-size-root: 15px`, `$border-radius`, `$blockquote-...`). Import Google Fonts (Inter, Source Serif 4, JetBrains Mono) with preconnect.
- `theme.scss` `scss:rules`: style the real Quarto components: sidebar + active state, TOC, navbar, search box, callouts (5 accents), code blocks + copy button, inline code, tables, blockquotes, figure captions, pagination, footnotes, buttons, links, focus rings.
- `_quarto.yml`: set `mainfont`/`monofont`, `fontsize`, `linkcolor`, keep `theme: [cosmo, assets/theme.scss]`, `code-copy: true`, `highlight-style` tuned to the palette, `fig-format: svg` (already set).
- Test: render `index`, one `det` page, one `stat` page.

Deliverable: the whole site looks like Harbor/Source/Compact, no plot or widget work yet.

## 5. Phase 2: static figures (R)

Files: new `R/idm-theme.R`, new root `_common.R`, small setup chunk added site-wide.

- `idm-theme.R`: `theme_idm()` (Inter body, Source Serif titles via `showtext`, neutral gridlines, Oxford titles, base_size tuned to 15px web), `idm_pal()` + `scale_color_idm()` / `scale_fill_idm()` (discrete = compartment palette, ordered S,I,R,E,V; plus sequential + diverging for continuous), and `theme_set(theme_idm())` with `options(ggplot2.discrete.colour = ...)`.
- `_common.R`: `library` loads, `showtext`/`sysfonts` to register Inter + Source Serif so static SVG text matches the web, `knitr::opts_chunk$set(dev="svg", fig.width, fig.height, fig.align, dpi)`.
- Wire-in: add one setup chunk (`source("_common.R")`) to each `.qmd`. This is scriptable across all 48 files, so it is a sweep, not manual edits.
- Sweep: remove the ~26 inline `theme_minimal/classic/bw()` and replace `PT Sans Narrow` and ad hoc `scale_*_manual` with the shared scales. Done file by file, rendering as we go.

Deliverable: every static figure shares one look, fonts, and compartment colors.

## 6. Phase 3: interactive widgets (OJS + D3)

Files: new `assets/js/_tokens.js`, refactor `_slider.js`, `_entropy-anim.js`, `_montecarlo-pi.js`, `_vax-anim.js`, and the slider call sites in `.qmd`.

- `_tokens.js`: exports `token(name)` that reads `:root` custom properties via `getComputedStyle`, plus a `COMPARTMENT` map and motion tokens. One import for every widget.
- Refactor `_slider.js`: `injectStyle` and `createSlider`/`createButton` pull colors, radius, and fonts from tokens (cobalt accents, Inter labels, 14px radius). Fix the Firefox thumb size (14px to 20px) for touch parity, keep 20px+ hit targets, add `prefers-reduced-motion`.
- Refactor the three animation modules to import `_tokens.js` and drop their local hex palettes onto the compartment map.
- Call sites: change `createSlider("β", ..., "#d97706", "amber")` to a semantic key (for example `"exposed"`), resolved centrally, so no `.qmd` carries a hex.

Deliverable: sliders, buttons, and animations match the page and the static figures, and adapt automatically if a token ever changes.

## 7. Phase 4: motion, responsive, performance

- Motion: unify durations/easing from tokens across CSS and JS; every animation respects reduced-motion; gestures work with mouse, touch, and keyboard (sliders are focusable, arrow-key steppable, thumbs are touch-sized).
- Responsive: figures scale to container (SVG, no fixed pixel widths), sliders wrap to columns on narrow screens, tables scroll, no layout shift on load.
- Performance: debounce/`requestAnimationFrame` on slider redraws, keep SVG output, avoid reflow in animation loops, lazy-init heavy widgets when scrolled into view.

## 8. Phase 5: documentation and governance

- `DESIGN.md` at repo root: the token reference, the compartment legend, and the one rule ("no raw hex or font names; use tokens"). How to add a new plot or widget correctly.
- Optional: a living style-guide page in the appendix that renders every component and the palette, so regressions are visible in one place.

## 9. Phase 6: verification

- Render the full book; spot-check a widget-heavy page (`det/sir`), a figure-heavy page (a `stat` chapter), and a table/callout page.
- Contrast pass (WCAG AA) on text and accents over white and over surfaces.
- Desktop + mobile screenshots; check slider drag on touch, no lag on animations.
- A final review pass (I can run a subagent to diff before/after and flag inconsistencies).

---

## 10. Rollout and risk

- Recommended: phased, in the order above. Phase 1 is safe and visible; Phases 2 and 3 touch many files but are mechanical sweeps done with continuous rendering, so regressions are caught early.
- `execute: freeze: auto` is already on, so unchanged computations will not re-run, keeping builds fast.
- Main risk is the static-plot font path (`showtext`) adding an R dependency and slightly changing figure rendering. If you would rather not, Phase 2 can use a close default font instead and still unify theme + colors.
- Everything is reversible: tokens are additive, and the old `theme.scss` is one file.

## 11. Open decisions

1. Rollout: phased starting with Phase 1 (recommended), or implement all phases in one pass.
2. Static-plot fidelity: full match with embedded Inter/Source via `showtext` (recommended), or lighter touch (shared theme + colors, default font).
3. Compartment hues: confirm the S/I/R/E/V mapping in section 3, or adjust any role.
