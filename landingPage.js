/**
 * RIDEWISE LANDING PAGE — SCRIPT
 * 1. ThemeController : 3-way theme switch (System | Light | Dark)
 * 2. TopbarController: slim-on-scroll + route progress line
 */

/* ==========================================================================
   1. THEME CONTROLLER
   ========================================================================== */
const ThemeController = {
  STORAGE_KEY: 'ridewise_theme_choice',
  CHOICES: ['system', 'light', 'dark'],   // same order as the buttons

  init() {
    // 1. Get saved choice (system, light, or dark), default to 'system'
    const savedChoice = localStorage.getItem(this.STORAGE_KEY) || 'system';
    this.setChoice(savedChoice);

    // 2. Add click listeners to the 3 buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setChoice(btn.getAttribute('data-theme-choice'));
      });
    });

    // 3. Listen to live OS system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentChoice = localStorage.getItem(this.STORAGE_KEY) || 'system';
      if (currentChoice === 'system') {
        this.applySystemTheme();
      }
    });
  },

  setChoice(choice) {
    if (!this.CHOICES.includes(choice)) choice = 'system';
    localStorage.setItem(this.STORAGE_KEY, choice);

    // Update active state on the 3 buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-theme-choice') === choice;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive);
    });

    // Slide the highlight thumb to the active button
    const segment = document.getElementById('themeSegment');
    if (segment) segment.style.setProperty('--i', this.CHOICES.indexOf(choice));

    // Apply the actual theme
    if (choice === 'system') {
      this.applySystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', choice);
    }
  },

  applySystemTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
};

/* ==========================================================================
   2. ZIPPER LAUNCH TRANSITION
   Sequence:
     1. DROP    : the tyre leaves the button and lands on the zipper line
                  (bottom edge of the top bar) with a small bounce.
     2. UNZIP   : the tyre rolls left → right. Behind it the teeth separate
                  into a real "eye" shaped opening (zipped at the start stop,
                  widest in the middle, closed again at the slider).
     3. RELEASE : once the slider leaves the screen, both halves fall open.
     4. LAUNCH  : the RideWise portal appears, then the app opens.
   ========================================================================== */
const LaunchTransitionController = {
  TARGET_URL: 'https://ride-wise.pages.dev',
  TYRE_RADIUS: 11,          // px (slider is 22px) → used for real rolling rotation
  SAMPLES: 48,              // points per edge curve (smoothness)
  isLaunching: false,

  init() {
    this.btn = document.getElementById('btnTryRideWise');
    if (!this.btn) return;

    this.btn.addEventListener('click', (e) => {
      // Let Ctrl/Cmd/Shift/middle-click open a new tab as normal
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      this.launch();
    });

    // If the user comes back with the browser Back button, reset the page
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) this.reset();
    });
  },
  

  /* ---------- Helpers ---------- */
  tween(duration, ease, onUpdate) {
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const p = Math.min((now - start) / duration, 1);
        onUpdate(ease(p));
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
  },

  wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  },

  ease: {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
  },

  setSlider(x, y, angleRad, scale = 1) {
    const r = this.TYRE_RADIUS;
    this.el.slider.style.transform =
      `translate(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px) rotate(${angleRad.toFixed(3)}rad) scale(${scale.toFixed(3)})`;
  },

  toPoints(pts, dy = 0) {
    return pts.map(([x, y]) => `${x.toFixed(1)},${(y + dy).toFixed(1)}`).join(' ');
  },

  /* ---------- Draw one frame of the zipper ----------
     sx      : slider x position
     release : 0 → 1 (halves falling fully open at the end) */
  render(sx, release = 0) {
    const { W, H, y0, stopX } = this.geo;
    const L = Math.max(sx - stopX, 1);         // length of the open part
    const fromX = stopX * (1 - release);        // on release, the stop opens too
    const toX = Math.min(sx, W);

    const top = [];
    const bottom = [];

    for (let i = 0; i <= this.SAMPLES; i++) {
      const x = fromX + (toX - fromX) * (i / this.SAMPLES);
      const a = Math.max(x - stopX, 0);       // distance from the start stop
      const b = Math.max(sx - x, 0);          // distance behind the slider
      const eye = (a * b) / L;                // 0 at both ends, max in the middle

      let up = Math.min(y0, eye * 0.5);       // top half lifts (limited by screen top)
      let down = eye * 1.25;                  // bottom half drops further (gravity)

      // Release: both halves fall completely open
      up += (y0 + 20 - up) * release;
      down += (H * 1.3 - down) * release;

      top.push([x, y0 - up]);
      bottom.push([x, y0 + down]);
    }

    // Portal is visible only inside the opening
    const poly = [...top, ...bottom.slice().reverse()]
      .map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`)
      .join(',');
    this.el.portal.style.clipPath = `polygon(${poly})`;

    // Teeth sit on the fabric side of each edge
    this.el.teethTop.setAttribute('points', this.toPoints(top, -3));
    this.el.teethBottom.setAttribute('points', this.toPoints(bottom, 3));
    this.el.tapeTop.setAttribute('points', this.toPoints(top, -7));
    this.el.tapeBottom.setAttribute('points', this.toPoints(bottom, 7));

    // Shadows fall into the opening
    this.el.shadowTop.setAttribute('points', this.toPoints(top, 6));
    this.el.shadowBottom.setAttribute('points', this.toPoints(bottom, -6));

    // Still-closed, interlocked teeth: [0 → stop] and [slider → right edge]
    const segs = [];
    if (release === 0 && stopX > 0) segs.push([0, stopX]);
    if (sx < W) segs.push([Math.max(sx, 0), W]);
    const path = (dy) => segs.map(([x1, x2]) => `M${x1.toFixed(1)} ${y0 + dy} L${x2.toFixed(1)} ${y0 + dy}`).join(' ');
    this.el.closedA.setAttribute('d', path(-2));
    this.el.closedB.setAttribute('d', path(2));

    // Teeth fade away as the halves fall open
    this.el.svg.style.opacity = String(1 - release);
  },

  /* ---------- Main sequence ---------- */
  async launch() {
    if (this.isLaunching) return;
    this.isLaunching = true;

    const $ = (id) => document.getElementById(id);
    this.el = {
      overlay: $('zipOverlay'),
      portal: $('zipPortal'),
      svg: $('zipSvg'),
      slider: $('zipSlider'),
      teethTop: $('zipTeethTop'),
      teethBottom: $('zipTeethBottom'),
      tapeTop: $('zipTapeTop'),
      tapeBottom: $('zipTapeBottom'),
      shadowTop: $('zipShadowTop'),
      shadowBottom: $('zipShadowBottom'),
      closedA: $('zipClosedA'),
      closedB: $('zipClosedB'),
      btnTyre: $('btnTyreIcon'),
      topbar: $('topbar')
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !this.el.overlay) {
      window.location.href = this.TARGET_URL;
      return;
    }

    // Safety net: always navigate even if the tab gets throttled
    this.safety = setTimeout(() => { window.location.href = this.TARGET_URL; }, 4000);

    // Geometry
    const tyreRect = (this.el.btnTyre || this.btn).getBoundingClientRect();
    const startX = tyreRect.left + tyreRect.width / 2;
    const startY = tyreRect.top + tyreRect.height / 2;
    this.geo = {
      W: window.innerWidth,
      H: window.innerHeight,
      y0: this.el.topbar ? this.el.topbar.getBoundingClientRect().bottom : 70,  // zipper line
      stopX: startX                                                            // zipper start stop
    };
    const { W, y0 } = this.geo;
    const endX = W + 60;
    const r = this.TYRE_RADIUS;

    // Show overlay, hide the button's own tyre (the slider replaces it)
    if (this.el.btnTyre) this.el.btnTyre.style.visibility = 'hidden';
    this.el.overlay.classList.add('active');
    this.render(startX, 0);
    this.setSlider(startX, startY, 0, 0.68);

    // 1. DROP onto the zipper line
    await this.tween(280, this.ease.outBack, (p) => {
      this.setSlider(startX, startY + (y0 - startY) * p, 0, 0.68 + 0.32 * Math.min(p, 1));
    });

    // 2. UNZIP: roll left → right (rotation = distance / radius → true rolling)
    await this.tween(950, this.ease.inOutCubic, (p) => {
      const sx = startX + (endX - startX) * p;
      this.render(sx, 0);
      this.setSlider(sx, y0, (sx - startX) / r);
    });

    // 3. RELEASE: both halves fall open
    await this.tween(380, this.ease.outCubic, (p) => this.render(endX, p));
    this.el.portal.style.clipPath = 'none';

    // 4. LAUNCH: portal content appears, then open the app
    this.el.portal.classList.add('revealed');
    await this.wait(600);
    clearTimeout(this.safety);
    window.location.href = this.TARGET_URL;
  },

  /* Restore the page (used when returning with the Back button) */
  reset() {
    this.isLaunching = false;
    clearTimeout(this.safety);
    if (!this.el) return;
    this.el.overlay.classList.remove('active');
    this.el.portal.classList.remove('revealed');
    this.el.portal.style.clipPath = '';
    this.el.svg.style.opacity = '';
    if (this.el.btnTyre) this.el.btnTyre.style.visibility = '';
  }
};

/* ==========================================================================
   START
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  ThemeController.init();
  LaunchTransitionController.init();
});
