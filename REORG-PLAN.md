# idm4b: cleanup and speed plan

A critique of the current project plus a phased plan to make it light, fast to render, and fast to load. Written 2026-07-08.

## TL;DR

Your folder is 248 MB, but only about 70 MB is actual content, and even that is inflated. The rest is cache and git bloat:

- `.git` = 89 MB (bloated by committing the rendered `docs/` folder on every render)
- `.quarto` = 88 MB (local cache, already gitignored, safe to delete anytime)
- `docs` = 33 MB (the rendered site, committed to the repo)
- `img` = 15 MB (three SVGs alone are 7.4 MB)
- `data` = 13 MB (one 12 MB `.rds` file)

Three separate problems, three separate fixes. They do not overlap the way you think:

1. Slow render -> fix with `freeze` (this is the correct tool, and it does NOT slow your website).
2. Slow website load -> fix by removing embedded OJS data, shrinking giant SVGs, and trimming Plotly.
3. Scary, heavy folder -> fix with a clean folder layout and by getting `docs/` out of your main branch.

## The freeze myth (important)

You removed `freeze` because you believed it made the live website slow. It cannot do that.

`freeze` only decides whether R code is re-run at render time. It stores results in a `_freeze/` folder and reuses them so you do not re-execute every chapter on every render. The HTML that ships to the browser is byte-for-byte identical whether it came from a fresh run or from a frozen result. `_freeze/` is never uploaded to the website.

So what did you actually see? Almost certainly one of these:

- When freeze was on, the `_freeze/` folder got committed, your repo grew, and git or the deploy felt slow. That is repo weight, not page load.
- Coincidence: the real load problem (below) was there the whole time.

Bottom line: turn `freeze` back on. It is the right fix for slow renders and has zero effect on how fast the site loads.

## What actually makes the website slow

The real load problem is heavy payloads baked into individual pages:

1. Embedded OJS data. `ojs_define()` dumps R data straight into the HTML as one giant JSON blob. `sto.html` is 2.6 MB, and 2.2 MB of that is a single line of embedded data. `mod-fit.html` was once 12 MB for the same reason. This is the number one load killer.
2. Giant SVGs. `prv-mix.svg` (2.9 MB), `prv-dis.svg` (2.8 MB), `he-mod.svg` (1.7 MB). These download in full on the pages that use them.
3. Plotly. The Plotly library is 3.5 MB and loads on any page that uses it. Only `vax-perf.qmd` needs it, and that page is 1.2 MB.
4. `search.json` is 796 KB and grows with every chapter.

## What makes the folder feel scary and heavy

- Flat root. Around 50 `.qmd` files plus JS, images, data, bib, and logos are all dumped in the top folder. Nothing tells you where a new file should go, so every addition feels risky.
- `docs/` is committed. GitHub Pages serves from it, but every render rewrites hundreds of files and git keeps a full copy of each version forever. That is why `.git` is 89 MB.
- Big binaries live in git history permanently: a 12 MB `.rds`, a 12 MB HTML committed 3 times, a 2.9 MB SVG committed twice.
- Monolithic chapters. `rt.qmd` is 123 KB, `mod-sel.qmd` 81 KB, `pmcmc.qmd` 74 KB. Huge single files are slow to render and intimidating to edit.

## The plan

Ordered by payoff for effort. You can stop after any phase.

### Phase 0: instant, zero risk (5 minutes)

- Delete `.quarto/`. It is cache and regenerates on the next render. Folder drops from 248 MB to about 160 MB immediately. Command: `rm -rf .quarto` (or let the next render rebuild it).
- Commit or stash your current work first. There are 72 uncommitted changes right now, so lock in a known-good state before anything else.

### Phase 1: fast renders with freeze (15 minutes)

- Add to `_quarto.yml`:

  ```yaml
  execute:
    freeze: auto
  ```

- Render once to build the `_freeze/` cache. After that, only chapters you actually change get re-executed. Heavy chapters (pmcmc, mcmc, mod-sel) stop re-running every time.
- Decide how to handle `_freeze/`:
  - Rendering only on your own machine: add `_freeze/` to `.gitignore`.
  - Rendering on GitHub Actions or more than one machine: commit `_freeze/` so the build reuses results. It never reaches the website either way.

### Phase 2: fast website load (1 to 2 hours)

- Kill embedded OJS data. Instead of `ojs_define(x = big_data)`, write the data to a small file and load it in OJS:

  ```r
  # R chunk
  jsonlite::write_json(big_data, "data/sto-sim.json")
  ```
  ```js
  // ojs chunk
  data = FileAttachment("data/sto-sim.json").json()
  ```

  This pulls megabytes out of the HTML, lets the browser cache the data separately, and stops it blocking first paint. Also downsample: round numbers and thin out time points the eye cannot see. Target `sto.qmd` and `mod-fit.qmd` first.
- Shrink the giant SVGs. Run them through SVGO (`npx svgo img/vax/prv-mix.svg`). These usually shrink 60 to 90 percent. If a file is mostly raster data, export it as WebP instead. Expected saving: around 6 to 7 MB.
- Contain Plotly. It only serves `vax-perf.qmd`. Either accept that one page pays the 3.5 MB, or rebuild that chart as a static SVG or a lightweight OJS plot so no page loads Plotly at all.

### Phase 3: clean structure so adding things is easy (2 to 3 hours)

Proposed layout:

```
idm4b/
  _quarto.yml
  index.qmd
  chapters/
    det/    sir-det.qmd  seir-det.qmd  het-det.qmd  tsir.qmd  det.qmd
    sto/    ar.qmd  sir-sto.qmd  seir-sto.qmd  branch-proc.qmd  sto.qmd
    fit/    lse.qmd  lik.qmd  mle.qmd  mcmc.qmd  pmcmc.qmd  mod-fit.qmd
    rnum/   gen-int.qmd  r0.qmd  rt.qmd  rt-prac.qmd  rnum.qmd
    intv/   ftc.qmd  vax.qmd  vax-perf.qmd  vax-mod.qmd  vax-measles.qmd
    stat/   stat-glm.qmd  stat-gam.qmd  ...
  assets/
    js/     _slider.js  _entropy-anim.js  _epi-threshold-anim.js  _vax-anim.js
    scss/   theme.scss
    logo/   logo.svg  logo-icon.svg
  data/
  img/
  refs/   references.bib  apa.csl
  _freeze/            # cache, committed or ignored per Phase 1
```

This means updating paths in `_quarto.yml`, the OJS `import "./_slider.js"` lines, and relative image and data paths. It is mechanical but touches many files, so it should be done in one careful pass with a render check after. I can do this for you.

Also split the monolith chapters. Break `rt.qmd` into sections with `{{< include sections/rt-intro.qmd >}}`. Each piece stays small and editable, and with freeze, unchanged pieces do not re-run.

### Phase 4: stop bloating git (30 minutes, optional but recommended)

- Take `docs/` off your main branch. Deploy with `quarto publish gh-pages`, which renders and pushes the site to a separate `gh-pages` branch. Your main branch then holds only source, and `.git` stops growing every render. Add `docs/` to `.gitignore` after switching.
- Purge the old bloat from history. The big blobs (old `docs/`, the 12 MB rds, huge SVGs) still sit in git history. `git filter-repo` can strip them, then a force-push shrinks `.git` from 89 MB to a few MB. This rewrites history, so do it deliberately, after everything else is committed, and only if you are comfortable force-pushing.

## Suggested order

Phase 0 and 1 today: instant lightness and fast renders. Then Phase 2 for load speed. Phase 3 and 4 when you have a calm afternoon. Each phase is independent and safe to stop after.
