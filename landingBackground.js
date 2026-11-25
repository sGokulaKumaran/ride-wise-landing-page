/**
 * RIDEWISE LANDING PAGE — ANTIGRAVITY CARTOGRAPHIC PHYSICS ENGINE
 * Zero-dependency HTML5 Canvas 2D engine:
 *  1. Procedural 2D fBm Iso-Contours via Marching Squares + Cursor Gravity-Well & Click Sonar Warp
 *  2. Antigravity Magnetic Particle Swarm (directional micro-dashes & dots + constellation tethers)
 *  3. Click Sonar Shockwave (expanding telemetry ring + contour ripple + particle impulse)
 *  4. Silky Decaying GPS Breadcrumb Cursor Trail (500ms tapered stroke)
 *  5. Coordinate Crosshair Matrix (+ ticks with smooth cursor radar spotlight)
 *  6. Live Vector Route Telemetry (cubic-Bézier margin routes + tapered pulses + waypoint pings)
 *  7. Smooth 300ms RGBA Theme Morph driven by [data-theme="dark" | "light"]
 */
(() => {
  'use strict';

  const PALETTES = {
    dark: {
      contourMinor: [148, 163, 184, 0.065],
      contourIndex: [226, 232, 240, 0.12],
      crosshair: [148, 163, 184, 0.115],
      routeLine: [148, 163, 184, 0.08],
      pulsePrimary: [0, 242, 254, 0.45],
      pulseSecondary: [59, 130, 246, 0.38],
      radarTint: [0, 242, 254, 0.08],
      particleBase: [148, 163, 184, 0.24]
    },
    light: {
      contourMinor: [15, 23, 42, 0.058],
      contourIndex: [15, 23, 42, 0.10],
      crosshair: [15, 23, 42, 0.105],
      routeLine: [15, 23, 42, 0.072],
      pulsePrimary: [2, 132, 199, 0.42],
      pulseSecondary: [37, 99, 235, 0.36],
      radarTint: [2, 132, 199, 0.06],
      particleBase: [15, 23, 42, 0.22]
    }
  };

  const CONTOUR_LEVELS = [0.24, 0.33, 0.42, 0.51, 0.60, 0.69, 0.78];

  function clonePalette(p) {
    const out = {};
    for (const k of Object.keys(p)) {
      out[k] = p[k].slice();
    }
    return out;
  }

  function rgba(arr, alphaOverride) {
    const a = Math.max(0, Math.min(1, alphaOverride !== undefined ? alphaOverride : arr[3]));
    return `rgba(${Math.round(arr[0])},${Math.round(arr[1])},${Math.round(arr[2])},${a.toFixed(4)})`;
  }

  function mixRgba(a, b, t, alphaOverride) {
    const r = Math.round(a[0] + (b[0] - a[0]) * t);
    const g = Math.round(a[1] + (b[1] - a[1]) * t);
    const bl = Math.round(a[2] + (b[2] - a[2]) * t);
    const al = Math.max(0, Math.min(1, alphaOverride !== undefined ? alphaOverride : a[3] + (b[3] - a[3]) * t));
    return `rgba(${r},${g},${bl},${al.toFixed(4)})`;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  // Deterministic 2D hash in [0, 1]
  function hash2D(ix, iy) {
    let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function valueNoise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = smoothstep(x - ix);
    const fy = smoothstep(y - iy);

    const v00 = hash2D(ix, iy);
    const v10 = hash2D(ix + 1, iy);
    const v01 = hash2D(ix, iy + 1);
    const v11 = hash2D(ix + 1, iy + 1);

    return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
  }

  // 2-octave fBm returning value in [0, 1]
  function fbm2D(x, y) {
    const o1 = valueNoise2D(x, y);
    const o2 = valueNoise2D(x * 2.07 + 13.7, y * 2.07 - 9.3);
    return o1 * 0.68 + o2 * 0.32;
  }

  // Cubic Bézier evaluation
  function evalBezier(r, t) {
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    const uuu = uu * u;
    const ttt = tt * t;
    const x = uuu * r.p0[0] + 3 * uu * t * r.p1[0] + 3 * u * tt * r.p2[0] + ttt * r.p3[0];
    const y = uuu * r.p0[1] + 3 * uu * t * r.p1[1] + 3 * u * tt * r.p2[1] + ttt * r.p3[1];
    return [x, y];
  }

  function interpEdge(a, b, va, vb, level) {
    const denom = vb - va;
    const t = Math.abs(denom) < 1e-6 ? 0.5 : (level - va) / denom;
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  const CartographicBgEngine = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    isMobile: false,
    reducedMotion: false,

    // Grid buffers for Marching Squares
    cellSize: 28,
    cols: 0,
    rows: 0,
    field: null,

    // Scroll & pointer state
    scrollY: 0,
    smoothScrollY: 0,
    lastScrollY: 0,
    scrollVel: 0,
    pointer: { x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false },

    // Interactive physics state
    particles: [],
    sonars: [],
    trail: [],

    // Routes & waypoint pings
    routes: [],
    pings: [],

    // Theme morphing state
    currentPalette: null,
    fromPalette: null,
    targetPalette: null,
    themeMorphStart: 0,
    themeMorphDuration: 300,
    isMorphing: false,

    // Animation loop state
    rafId: null,
    lastTime: 0,
    elapsed: 0,
    resizeTimer: null,
    themeObserver: null,
    reducedMotionQuery: null,

    init() {
      this.canvas = document.getElementById('rwBgCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      if (!this.ctx) return;

      this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.reducedMotionQuery.matches;

      const initialTheme = this.getActiveTheme();
      this.currentPalette = clonePalette(PALETTES[initialTheme]);
      this.fromPalette = clonePalette(PALETTES[initialTheme]);
      this.targetPalette = PALETTES[initialTheme];

      this.scrollY = window.scrollY || 0;
      this.smoothScrollY = this.scrollY;
      this.lastScrollY = this.scrollY;

      this.resize();
      this.bindEvents();

      if (this.reducedMotion) {
        this.renderFrame();
      } else {
        this.startLoop();
      }
    },

    getActiveTheme() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    },

    bindEvents() {
      window.addEventListener('scroll', () => {
        this.scrollY = window.scrollY || 0;
      }, { passive: true });

      window.addEventListener('pointermove', (e) => {
        if (this.isMobile || this.reducedMotion) return;
        const px = e.clientX;
        const py = e.clientY;
        this.pointer.targetX = px;
        this.pointer.targetY = py;
        if (!this.pointer.active) {
          this.pointer.x = px;
          this.pointer.y = py;
          this.pointer.active = true;
        }

        // Push to decaying GPS breadcrumb trail when moved >= 5px
        const last = this.trail[this.trail.length - 1];
        if (!last || Math.hypot(px - last.x, py - last.y) >= 5) {
          this.trail.push({ x: px, y: py, age: 0 });
          if (this.trail.length > 22) {
            this.trail.shift();
          }
        }
      }, { passive: true });

      window.addEventListener('pointerdown', (e) => {
        if (this.isMobile || this.reducedMotion) return;
        this.sonars.push({
          x: e.clientX,
          y: e.clientY,
          age: 0,
          maxAge: 0.9,
          maxRadius: 320,
          radius: 1
        });
        if (this.sonars.length > 4) {
          this.sonars.shift();
        }
      }, { passive: true });

      window.addEventListener('pointerleave', () => {
        this.pointer.active = false;
      }, { passive: true });

      window.addEventListener('resize', () => {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => {
          this.resize();
          if (this.reducedMotion) this.renderFrame();
        }, 120);
      }, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopLoop();
        } else if (!this.reducedMotion) {
          this.lastTime = performance.now();
          this.startLoop();
        }
      });

      this.reducedMotionQuery.addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        if (this.reducedMotion) {
          this.stopLoop();
          this.renderFrame();
        } else {
          this.lastTime = performance.now();
          this.startLoop();
        }
      });

      this.themeObserver = new MutationObserver(() => {
        const nextTheme = this.getActiveTheme();
        this.startThemeMorph(nextTheme);
      });
      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    },

    startThemeMorph(themeName) {
      const target = PALETTES[themeName] || PALETTES.dark;
      this.fromPalette = clonePalette(this.currentPalette);
      this.targetPalette = target;
      this.themeMorphStart = performance.now();
      this.isMorphing = true;

      if (this.reducedMotion) {
        this.currentPalette = clonePalette(target);
        this.isMorphing = false;
        this.renderFrame();
      }
    },

    updateThemeMorph(now) {
      if (!this.isMorphing) return;
      const t = Math.min((now - this.themeMorphStart) / this.themeMorphDuration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      for (const k of Object.keys(this.targetPalette)) {
        const from = this.fromPalette[k];
        const to = this.targetPalette[k];
        const cur = this.currentPalette[k];
        for (let i = 0; i < 4; i++) {
          cur[i] = lerp(from[i], to[i], ease);
        }
      }

      if (t >= 1) {
        this.isMorphing = false;
      }
    },

    resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.width = w;
      this.height = h;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.isMobile = w <= 640;
      this.cellSize = this.isMobile ? 38 : 28;

      this.canvas.width = Math.round(w * this.dpr);
      this.canvas.height = Math.round(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      this.cols = Math.ceil(w / this.cellSize) + 2;
      this.rows = Math.ceil(h / this.cellSize) + 2;
      this.field = new Float32Array(this.cols * this.rows);

      this.buildRoutes();
      this.buildParticles();
    },

    buildParticles() {
      const count = this.isMobile ? 28 : 96;
      const W = this.width;
      const H = this.height;
      this.particles = [];

      for (let i = 0; i < count; i++) {
        // Golden-ratio quasi-random spread across the viewport
        const u = hash2D(i * 7 + 3, 19);
        const v = hash2D(31, i * 11 + 5);
        const hx = u * W;
        const hy = v * H;

        this.particles.push({
          hx,
          hy,
          x: hx,
          y: hy,
          vx: 0,
          vy: 0,
          size: 1.15 + hash2D(i, 97) * 1.15,
          isDash: hash2D(i, 53) > 0.45,
          primary: i % 2 === 0,
          phase: hash2D(i, 71) * Math.PI * 2,
          energy: 0
        });
      }
    },

    buildRoutes() {
      const W = this.width;
      const H = this.height;
      this.routes = [];
      this.pings = [];

      if (this.isMobile) {
        const specs = [
          {
            p0: [W * 0.04, -H * 0.05],
            p1: [W * 0.16, H * 0.28],
            p2: [W * 0.02, H * 0.62],
            p3: [W * 0.14, H * 1.06],
            speed: 0.055,
            t: 0.15,
            primary: true
          },
          {
            p0: [W * 0.96, H * 1.05],
            p1: [W * 0.84, H * 0.72],
            p2: [W * 0.98, H * 0.36],
            p3: [W * 0.85, -H * 0.05],
            speed: 0.048,
            t: 0.58,
            primary: false
          },
          {
            p0: [-W * 0.05, H * 0.78],
            p1: [W * 0.28, H * 0.64],
            p2: [W * 0.72, H * 0.84],
            p3: [W * 1.05, H * 0.68],
            speed: 0.042,
            t: 0.38,
            primary: true
          }
        ];
        for (const s of specs) {
          this.routes.push({ ...s, pingFired: false });
        }
        return;
      }

      const leftMarginMax = Math.max(W * 0.22, W * 0.5 - 400);
      const rightMarginMin = Math.min(W * 0.78, W * 0.5 + 400);

      const specs = [
        {
          p0: [leftMarginMax * 0.12, -H * 0.06],
          p1: [leftMarginMax * 0.86, H * 0.26],
          p2: [leftMarginMax * 0.08, H * 0.66],
          p3: [leftMarginMax * 0.74, H * 1.08],
          speed: 0.058,
          t: 0.18,
          primary: true
        },
        {
          p0: [-20, H * 0.22],
          p1: [leftMarginMax * 0.62, H * 0.34],
          p2: [leftMarginMax * 0.95, H * 0.58],
          p3: [leftMarginMax * 0.28, H * 1.06],
          speed: 0.046,
          t: 0.64,
          primary: false
        },
        {
          p0: [leftMarginMax * 0.52, H * 1.06],
          p1: [leftMarginMax * 0.18, H * 0.72],
          p2: [leftMarginMax * 0.72, H * 0.42],
          p3: [-24, H * 0.12],
          speed: 0.052,
          t: 0.42,
          primary: true
        },
        {
          p0: [rightMarginMin + (W - rightMarginMin) * 0.82, -H * 0.06],
          p1: [rightMarginMin + (W - rightMarginMin) * 0.16, H * 0.30],
          p2: [rightMarginMin + (W - rightMarginMin) * 0.90, H * 0.68],
          p3: [rightMarginMin + (W - rightMarginMin) * 0.28, H * 1.08],
          speed: 0.054,
          t: 0.72,
          primary: true
        },
        {
          p0: [W + 20, H * 0.18],
          p1: [rightMarginMin + (W - rightMarginMin) * 0.24, H * 0.36],
          p2: [rightMarginMin + (W - rightMarginMin) * 0.08, H * 0.64],
          p3: [rightMarginMin + (W - rightMarginMin) * 0.75, H * 1.06],
          speed: 0.044,
          t: 0.29,
          primary: false
        },
        {
          p0: [rightMarginMin + (W - rightMarginMin) * 0.45, H * 1.05],
          p1: [rightMarginMin + (W - rightMarginMin) * 0.86, H * 0.72],
          p2: [rightMarginMin + (W - rightMarginMin) * 0.28, H * 0.38],
          p3: [W + 24, H * 0.08],
          speed: 0.050,
          t: 0.06,
          primary: false
        }
      ];

      for (const s of specs) {
        this.routes.push({ ...s, pingFired: false });
      }
    },

    startLoop() {
      if (this.rafId !== null) return;
      this.lastTime = performance.now();
      const tick = (now) => {
        const dt = Math.max(0, Math.min((now - this.lastTime) / 1000, 0.05));
        this.lastTime = now;
        this.elapsed += dt;

        this.updateState(now, dt);
        this.renderFrame();

        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    },

    stopLoop() {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    updateState(now, dt) {
      this.updateThemeMorph(now);

      // Smooth scroll & velocity calculation
      const dy = this.scrollY - this.lastScrollY;
      this.lastScrollY = this.scrollY;
      this.smoothScrollY += (this.scrollY - this.smoothScrollY) * Math.min(1, dt * 10);

      const instantVel = Math.min(Math.abs(dy) / Math.max(dt, 0.008), 2400);
      this.scrollVel = this.scrollVel * Math.exp(-dt * 6) + instantVel * (1 - Math.exp(-dt * 6));

      // Smooth cursor radar
      if (this.pointer.active) {
        const k = Math.min(1, dt * 12);
        this.pointer.x += (this.pointer.targetX - this.pointer.x) * k;
        this.pointer.y += (this.pointer.targetY - this.pointer.y) * k;
      }

      // Advance click sonars
      for (let i = this.sonars.length - 1; i >= 0; i--) {
        const s = this.sonars[i];
        s.age += dt;
        const p = Math.max(0, Math.min(1, s.age / s.maxAge));
        const easeOut = 1 - Math.pow(1 - p, 3);
        s.radius = Math.max(1, easeOut * s.maxRadius);
        if (s.age >= s.maxAge) {
          this.sonars.splice(i, 1);
        }
      }

      // Age & prune decaying GPS cursor trail (500ms)
      for (let i = this.trail.length - 1; i >= 0; i--) {
        this.trail[i].age += dt;
        if (this.trail[i].age >= 0.5) {
          this.trail.splice(i, 1);
        }
      }

      // Update antigravity particle physics
      this.updateParticles(dt);

      // Advance live route pulses
      const speedBoost = 1 + Math.min(this.scrollVel / 550, 2.2);
      for (const r of this.routes) {
        const prevT = r.t;
        r.t = (r.t + r.speed * speedBoost * dt) % 1;
        if (r.t < prevT) {
          r.pingFired = false;
        }
        if (!r.pingFired && r.t >= 0.5) {
          r.pingFired = true;
          const [px, py] = evalBezier(r, 0.5);
          this.pings.push({
            x: px,
            y: py,
            age: 0,
            maxAge: 1.45,
            primary: r.primary
          });
        }
      }

      // Update waypoint pings
      for (let i = this.pings.length - 1; i >= 0; i--) {
        this.pings[i].age += dt;
        if (this.pings[i].age >= this.pings[i].maxAge) {
          this.pings.splice(i, 1);
        }
      }
    },

    updateParticles(dt) {
      const springK = 14;
      const damping = Math.exp(-dt * 5.5);
      const repulseR = 195;
      const repulseR2 = repulseR * repulseR;
      const scrollParallax = -((this.smoothScrollY * 0.14) % this.height);
      const H = this.height;

      for (const pt of this.particles) {
        // Gentle floating orbital drift around wrapped home position
        const targetX = pt.hx + Math.sin(this.elapsed * 0.65 + pt.phase) * 9;
        let targetY = (pt.hy + scrollParallax + Math.cos(this.elapsed * 0.55 + pt.phase) * 9) % H;
        if (targetY < 0) targetY += H;

        // Avoid huge spring snap when wrapping vertically across viewport edge
        if (Math.abs(targetY - pt.y) > H * 0.5) {
          pt.y = targetY;
          pt.vy = 0;
        }

        // Spring pull back toward ambient home
        pt.vx += (targetX - pt.x) * springK * dt;
        pt.vy += (targetY - pt.y) * springK * dt;

        let targetEnergy = 0;

        // Magnetic cursor repulsion + subtle orbital swirl (desktop only)
        if (!this.isMobile && this.pointer.active) {
          const dx = pt.x - this.pointer.x;
          const dy = pt.y - this.pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < repulseR2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const falloff = 1 - d / repulseR;
            const nx = dx / d;
            const ny = dy / d;
            const force = falloff * falloff * 1800 * dt;
            // Radial push + tangential orbital swirl
            pt.vx += nx * force - ny * force * 0.42;
            pt.vy += ny * force + nx * force * 0.42;
            targetEnergy = Math.max(targetEnergy, falloff);
          }
        }

        // Click sonar radial impulse
        for (const s of this.sonars) {
          const dx = pt.x - s.x;
          const dy = pt.y - s.y;
          const d = Math.hypot(dx, dy);
          const band = Math.abs(d - s.radius);
          if (band < 48 && d > 0.01) {
            const wave = (1 - band / 48) * (1 - s.age / s.maxAge);
            const push = wave * 950 * dt;
            pt.vx += (dx / d) * push;
            pt.vy += (dy / d) * push;
            targetEnergy = Math.max(targetEnergy, wave);
          }
        }

        pt.vx *= damping;
        pt.vy *= damping;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;

        pt.energy += (targetEnergy - pt.energy) * Math.min(1, dt * 8);
      }
    },

    renderFrame() {
      const ctx = this.ctx;
      const W = this.width;
      const H = this.height;
      const pal = this.currentPalette;

      ctx.clearRect(0, 0, W, H);

      // 1. Subtle Cursor Radar Radial Glow (desktop only)
      if (!this.isMobile && this.pointer.active) {
        const px = this.pointer.x;
        const py = this.pointer.y;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 240);
        grad.addColorStop(0, rgba(pal.radarTint));
        grad.addColorStop(1, rgba(pal.radarTint, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(px - 240, py - 240, 480, 480);
      }

      // 2. Procedural Topographic Iso-Contours (with Cursor & Sonar Elevation Warp)
      this.drawContours(ctx, pal);

      // 3. Coordinate Crosshair Matrix
      this.drawCrosshairs(ctx, pal);

      // 4. Live Vector Route Telemetry
      this.drawRoutes(ctx, pal);

      // 5. Antigravity Particle Swarm & Constellation Tethers
      this.drawParticles(ctx, pal);

      // 6. Silky GPS Breadcrumb Cursor Trail & Click Sonar Shockwaves
      if (!this.isMobile) {
        this.drawTrailAndSonars(ctx, pal);
      }
    },

    drawContours(ctx, pal) {
      const cols = this.cols;
      const rows = this.rows;
      const step = this.cellSize;
      const field = this.field;

      const scale = 0.0026;
      const driftX = this.elapsed * 0.012;
      const driftY = this.elapsed * 0.008;
      const scrollOffset = this.smoothScrollY * 0.16 * scale;

      const hasPointer = !this.isMobile && this.pointer.active;
      const px = this.pointer.x;
      const py = this.pointer.y;
      const warpRadius = 240;
      const warpR2 = warpRadius * warpRadius;
      const invTwoSigma2 = 1 / (2 * 105 * 105);
      const hasSonars = !this.isMobile && this.sonars.length > 0;

      for (let r = 0; r < rows; r++) {
        const sy = r * step;
        const wy = sy * scale + scrollOffset + driftY;
        const rowOffset = r * cols;
        for (let c = 0; c < cols; c++) {
          const sx = c * step;
          const wx = sx * scale + driftX;
          let hVal = fbm2D(wx, wy);

          // Gaussian gravity-well displacement around cursor
          if (hasPointer) {
            const dx = sx - px;
            const dy = sy - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < warpR2) {
              hVal += Math.exp(-d2 * invTwoSigma2) * 0.22;
            }
          }

          // Click sonar wave ripple through elevation heightfield
          if (hasSonars) {
            for (let si = 0; si < this.sonars.length; si++) {
              const s = this.sonars[si];
              const dx = sx - s.x;
              const dy = sy - s.y;
              const dist = Math.hypot(dx, dy);
              const band = dist - s.radius;
              if (Math.abs(band) < 90) {
                const decay = 1 - Math.min(1, s.age / s.maxAge);
                hVal += Math.exp(-(band * band) / 1444) * decay * 0.24;
              }
            }
          }

          field[rowOffset + c] = hVal;
        }
      }

      const minorColor = rgba(pal.contourMinor);
      const indexColor = rgba(pal.contourIndex);

      ctx.lineCap = 'round';

      for (let li = 0; li < CONTOUR_LEVELS.length; li++) {
        const level = CONTOUR_LEVELS[li];
        const isIndex = li % 3 === 1;
        ctx.strokeStyle = isIndex ? indexColor : minorColor;
        ctx.lineWidth = isIndex ? 1.1 : 0.75;
        ctx.beginPath();

        for (let r = 0; r < rows - 1; r++) {
          const r0 = r * cols;
          const r1 = (r + 1) * cols;
          const y0 = r * step;
          const y1 = y0 + step;

          for (let c = 0; c < cols - 1; c++) {
            const v0 = field[r0 + c];
            const v1 = field[r0 + c + 1];
            const v2 = field[r1 + c + 1];
            const v3 = field[r1 + c];

            let mask = 0;
            if (v0 >= level) mask |= 8;
            if (v1 >= level) mask |= 4;
            if (v2 >= level) mask |= 2;
            if (v3 >= level) mask |= 1;

            if (mask === 0 || mask === 15) continue;

            const x0 = c * step;
            const x1 = x0 + step;

            const topX = () => interpEdge(x0, x1, v0, v1, level);
            const rightY = () => interpEdge(y0, y1, v1, v2, level);
            const bottomX = () => interpEdge(x0, x1, v3, v2, level);
            const leftY = () => interpEdge(y0, y1, v0, v3, level);

            const seg = (ax, ay, bx, by) => {
              ctx.moveTo(ax, ay);
              ctx.lineTo(bx, by);
            };

            switch (mask) {
              case 1:
              case 14:
                seg(x0, leftY(), bottomX(), y1);
                break;
              case 2:
              case 13:
                seg(bottomX(), y1, x1, rightY());
                break;
              case 3:
              case 12:
                seg(x0, leftY(), x1, rightY());
                break;
              case 4:
              case 11:
                seg(topX(), y0, x1, rightY());
                break;
              case 5: {
                const center = (v0 + v1 + v2 + v3) * 0.25;
                if (center >= level) {
                  seg(x0, leftY(), topX(), y0);
                  seg(bottomX(), y1, x1, rightY());
                } else {
                  seg(x0, leftY(), bottomX(), y1);
                  seg(topX(), y0, x1, rightY());
                }
                break;
              }
              case 6:
              case 9:
                seg(topX(), y0, bottomX(), y1);
                break;
              case 7:
              case 8:
                seg(x0, leftY(), topX(), y0);
                break;
              case 10: {
                const center = (v0 + v1 + v2 + v3) * 0.25;
                if (center >= level) {
                  seg(x0, leftY(), bottomX(), y1);
                  seg(topX(), y0, x1, rightY());
                } else {
                  seg(x0, leftY(), topX(), y0);
                  seg(bottomX(), y1, x1, rightY());
                }
                break;
              }
            }
          }
        }
        ctx.stroke();
      }
    },

    drawCrosshairs(ctx, pal) {
      const spacing = this.isMobile ? 112 : 96;
      const W = this.width;
      const H = this.height;
      const offsetY = -((this.smoothScrollY * 0.11) % spacing);
      const startX = (W % spacing) * 0.5;
      const arm = 2.6;

      ctx.strokeStyle = rgba(pal.crosshair);
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let x = startX; x < W; x += spacing) {
        for (let y = offsetY; y < H + spacing; y += spacing) {
          if (y < -4) continue;
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
        }
      }
      ctx.stroke();

      if (!this.isMobile && this.pointer.active) {
        const px = this.pointer.x;
        const py = this.pointer.y;
        const radius = 220;
        const r2 = radius * radius;
        let closestDist2 = r2;
        let closestX = 0;
        let closestY = 0;
        let hasClosest = false;

        ctx.lineWidth = 1.1;
        for (let x = startX; x < W; x += spacing) {
          if (Math.abs(x - px) > radius) continue;
          for (let y = offsetY; y < H + spacing; y += spacing) {
            if (y < -4 || Math.abs(y - py) > radius) continue;
            const dx = x - px;
            const dy = y - py;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
              const falloff = 1 - Math.sqrt(d2) / radius;
              const boostAlpha = pal.crosshair[3] + falloff * 0.12;
              ctx.strokeStyle = rgba(pal.crosshair, boostAlpha);
              ctx.beginPath();
              ctx.moveTo(x - arm * 1.2, y);
              ctx.lineTo(x + arm * 1.2, y);
              ctx.moveTo(x, y - arm * 1.2);
              ctx.lineTo(x, y + arm * 1.2);
              ctx.stroke();

              if (d2 < closestDist2) {
                closestDist2 = d2;
                closestX = x;
                closestY = y;
                hasClosest = true;
              }
            }
          }
        }

        if (hasClosest) {
          const closeness = 1 - Math.sqrt(closestDist2) / radius;
          ctx.strokeStyle = rgba(pal.pulsePrimary, 0.14 + closeness * 0.18);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(closestX, closestY, 6.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },

    drawRoutes(ctx, pal) {
      const routeScrollShift = -((this.smoothScrollY * 0.08) % (this.height * 0.35));

      ctx.save();
      ctx.translate(0, routeScrollShift);

      ctx.strokeStyle = rgba(pal.routeLine);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const r of this.routes) {
        ctx.moveTo(r.p0[0], r.p0[1]);
        ctx.bezierCurveTo(r.p1[0], r.p1[1], r.p2[0], r.p2[1], r.p3[0], r.p3[1]);
      }
      ctx.stroke();

      const tailSegments = 18;
      const tailSpan = 0.095;

      for (const r of this.routes) {
        const baseColor = r.primary ? pal.pulsePrimary : pal.pulseSecondary;
        const headT = r.t;

        ctx.lineCap = 'round';
        for (let s = 0; s < tailSegments; s++) {
          const f0 = s / tailSegments;
          const f1 = (s + 1) / tailSegments;
          const t0 = headT - tailSpan * (1 - f0);
          const t1 = headT - tailSpan * (1 - f1);
          if (t1 < 0) continue;

          const clampedT0 = Math.max(0, t0);
          const [x0, y0] = evalBezier(r, clampedT0);
          const [x1, y1] = evalBezier(r, t1);

          const segAlpha = baseColor[3] * (f1 * f1) * 0.85;
          ctx.strokeStyle = rgba(baseColor, segAlpha);
          ctx.lineWidth = 0.9 + f1 * 1.4;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }

        const [hx, hy] = evalBezier(r, headT);
        const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        halo.addColorStop(0, rgba(baseColor, baseColor[3] * 0.85));
        halo.addColorStop(1, rgba(baseColor, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = rgba(baseColor, Math.min(1, baseColor[3] * 2.1));
        ctx.beginPath();
        ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const p of this.pings) {
        const progress = Math.max(0, Math.min(1, p.age / p.maxAge));
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const radius = Math.max(0.5, 3 + easeOut * 16);
        const color = p.primary ? pal.pulsePrimary : pal.pulseSecondary;
        const alpha = color[3] * (1 - progress) * 0.85;

        ctx.strokeStyle = rgba(color, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    },

    drawParticles(ctx, pal) {
      const pts = this.particles;
      const n = pts.length;

      // Constellation tethers between energized nodes (desktop only)
      if (!this.isMobile) {
        const tetherR = 115;
        const tetherR2 = tetherR * tetherR;
        ctx.lineWidth = 0.8;

        for (let i = 0; i < n; i++) {
          const a = pts[i];
          if (a.energy < 0.16) continue;
          for (let j = i + 1; j < n; j++) {
            const b = pts[j];
            if (b.energy < 0.16) continue;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < tetherR2) {
              const linkStrength = (1 - Math.sqrt(d2) / tetherR) * Math.min(a.energy, b.energy);
              const accent = a.primary ? pal.pulsePrimary : pal.pulseSecondary;
              ctx.strokeStyle = rgba(accent, linkStrength * 0.42);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }

      // Draw each directional dash or crisp dot
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const pt = pts[i];
        const accent = pt.primary ? pal.pulsePrimary : pal.pulseSecondary;
        const e = Math.max(0, Math.min(1, pt.energy));
        const alpha = lerp(pal.particleBase[3], Math.min(0.9, accent[3] * 1.7), e);
        const color = mixRgba(pal.particleBase, accent, e, alpha);

        const speed = Math.hypot(pt.vx, pt.vy);
        if (pt.isDash || speed > 28) {
          const angle = speed > 4 ? Math.atan2(pt.vy, pt.vx) : pt.phase;
          const halfLen = 2 + Math.min(speed * 0.025, 5.5) + e * 2;
          const cx = Math.cos(angle) * halfLen;
          const cy = Math.sin(angle) * halfLen;

          ctx.strokeStyle = color;
          ctx.lineWidth = pt.size * (0.95 + e * 0.45);
          ctx.beginPath();
          ctx.moveTo(pt.x - cx, pt.y - cy);
          ctx.lineTo(pt.x + cx, pt.y + cy);
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size + e * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    drawTrailAndSonars(ctx, pal) {
      // Decaying GPS breadcrumb cursor trail (500ms)
      if (this.trail.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < this.trail.length; i++) {
          const p0 = this.trail[i - 1];
          const p1 = this.trail[i];
          const life = Math.max(0, 1 - p1.age / 0.5);
          const frac = i / this.trail.length;
          ctx.strokeStyle = rgba(pal.pulsePrimary, life * frac * 0.52);
          ctx.lineWidth = 0.8 + frac * 1.8;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }

      // Click sonar shockwaves
      for (const s of this.sonars) {
        const progress = Math.max(0, Math.min(1, s.age / s.maxAge));
        const alpha = (1 - progress) * 0.55;
        const outerR = Math.max(0.5, s.radius);
        ctx.strokeStyle = rgba(pal.pulsePrimary, alpha);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, outerR, 0, Math.PI * 2);
        ctx.stroke();

        if (outerR > 24) {
          const innerR = Math.max(0.5, outerR * 0.74);
          ctx.strokeStyle = rgba(pal.pulseSecondary, alpha * 0.55);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.y, innerR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    CartographicBgEngine.init();
  });
})();
