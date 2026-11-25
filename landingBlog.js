/**
 * RIDEWISE INTERACTIVE GIS BLOG — CONTROLLER
 * 1. Sticky GIS Telemetry Ribbon (active chapter coordinates + scroll progress)
 * 2. Live Metric / Imperial (km <-> mi, km/h <-> mph) Unit Toggle
 * 3. Interactive 4-Mindset Stage (tab switching + viewport-triggered .mp4 playback)
 * 4. Annotated GIS Screenshot Hotspots + Zoom Lightbox
 * 5. Copyable Quick Start Commands
 */
(() => {
  'use strict';

  const MINDSETS = {
    solo: {
      kicker: 'TURN-BY-TURN · VOICE GUIDANCE',
      title: 'Solo Riders',
      copy: 'Plan routes with live alternatives, spoken maneuver prompts, and segment-projected off-route recovery across 6 open map styles — with Screen Wake Lock and zero API lock-in.',
      km: 14.2,
      kmh: 46,
      bullets: [
        '6 map styles: Auto, Standard, Dark, Satellite, Terrain, Cycling',
        'Accuracy-scaled off-route hysteresis prevents noisy reroutes',
        '4 adaptive UI themes + persistent ride history'
      ],
      clip: 'assets/clip-solo.mp4',
      poster: 'assets/shot-solo.png',
      hud: 'NAV ENGINE · ACTIVE'
    },
    group: {
      kicker: '/WS/RIDES · LIVE CONVOY SYNC',
      title: 'Group Rides',
      copy: 'Stay in lockstep across shifting city corridors. Opt-in location streaming, live Off-route rider status, and a dedicated purple rejoin path ahead keep every rider synced.',
      km: 28.6,
      kmh: 48,
      bullets: [
        'Real-time group positions over raw JSON WebSockets (/ws/rides)',
        'Smart forward purple rejoin path instead of awkward U-turns',
        'Zero account friction for friends joining an invite link'
      ],
      clip: 'assets/clip-group.mp4',
      poster: 'assets/shot-group-rejoin.png',
      hud: '/ws/rides · LIVE SYNC'
    },
    campus: {
      kicker: 'PASSENGER TRANSIT · PROXIMITY ALERTS',
      title: 'Passengers & Campus',
      copy: 'Browse public transit or unlock private campus organizations with an access code. Watch stop-by-stop ETAs, live crowd badges, and trigger proximity alerts before the bus arrives.',
      km: 9.8,
      kmh: 34,
      bullets: [
        'Stop-by-stop timeline showing passed vs. upcoming stops',
        'Live crowd status: Seats free, Filling up, or Full',
        'One-tap "Tell me when it\'s near" proximity alerts'
      ],
      clip: 'assets/clip-college.mp4',
      poster: 'assets/shot-passenger.jpg',
      hud: 'ORG ACCESS · RW-CAMPUS'
    },
    fleet: {
      kicker: '/WS/FLEET · 9-TAB OPERATIONS SUITE',
      title: 'Fleet Admins',
      copy: 'Dispatch buses, shuttles, and city vehicles from one unified console. Atomic DB locks prevent double-booking while trip GPS replays and CSV exports keep operations auditable.',
      km: 164.5,
      kmh: 52,
      bullets: [
        '9-tab console: Overview, Live Map, Vehicles, Routes, Trips & Stats',
        '3-tap driver trip start with speed alerts & one-tap SOS',
        'Thinned GPS trip replay & CSV export with 5s DB persistence'
      ],
      clip: 'assets/clip-fleet.mp4',
      poster: 'assets/shot-fleet-travels.png',
      hud: '/ws/fleet · 12 VEHICLES'
    }
  };

  const KM_TO_MI = 0.621371;

  const BlogInteractiveController = {
    unit: 'km',
    userPaused: false,
    videoInView: false,
    reducedMotion: false,

    init() {
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.initRibbonAndChapters();
      this.initUnitToggle();
      this.initMindsetStage();
      this.initHotspots();
      this.initLightbox();
      this.initQuickstartCopy();
      this.initEmailCopy();
    },

    /* ---------- 1. GIS Telemetry Ribbon & Reading Progress ---------- */
    initRibbonAndChapters() {
      const coordsEl = document.getElementById('gisCoords');
      const progressEl = document.getElementById('gisProgressBar');
      const links = Array.from(document.querySelectorAll('.gis-ch-link'));
      const chapters = Array.from(document.querySelectorAll('.blog-chapter'));

      const updateProgress = () => {
        if (!progressEl) return;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
        progressEl.style.width = `${pct.toFixed(2)}%`;
      };

      window.addEventListener('scroll', updateProgress, { passive: true });
      window.addEventListener('resize', updateProgress, { passive: true });
      updateProgress();

      if ('IntersectionObserver' in window && chapters.length) {
        const observer = new IntersectionObserver((entries) => {
          let best = null;
          for (const entry of entries) {
            if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
              best = entry;
            }
          }
          if (!best) return;
          const id = best.target.id;
          const coords = best.target.getAttribute('data-coords');
          if (coords && coordsEl) coordsEl.textContent = coords;
          links.forEach((l) => l.classList.toggle('active', l.getAttribute('data-ch') === id));
        }, {
          rootMargin: '-25% 0px -45% 0px',
          threshold: [0.1, 0.35, 0.6]
        });

        chapters.forEach((ch) => observer.observe(ch));
      }
    },

    /* ---------- 2. Live km <-> mi Unit Toggle ---------- */
    initUnitToggle() {
      const toggle = document.getElementById('gisUnitToggle');
      if (!toggle) return;

      toggle.addEventListener('click', () => {
        this.unit = this.unit === 'km' ? 'mi' : 'km';
        toggle.querySelectorAll('.unit-opt').forEach((opt) => {
          opt.classList.toggle('active', opt.getAttribute('data-unit') === this.unit);
        });
        this.renderUnits();
      });
    },

    renderUnits() {
      const isMiles = this.unit === 'mi';
      document.querySelectorAll('[data-km]').forEach((el) => {
        const km = parseFloat(el.getAttribute('data-km'));
        if (Number.isNaN(km)) return;
        el.textContent = isMiles ? `${(km * KM_TO_MI).toFixed(1)} mi` : `${km.toFixed(1)} km`;
      });

      document.querySelectorAll('[data-kmh]').forEach((el) => {
        const kmh = parseFloat(el.getAttribute('data-kmh'));
        if (Number.isNaN(kmh)) return;
        el.textContent = isMiles ? `${Math.round(kmh * KM_TO_MI)} mph` : `${Math.round(kmh)} km/h`;
      });
    },

    /* ---------- 3. Interactive 4-Mindset Stage ---------- */
    initMindsetStage() {
      const tabs = document.querySelectorAll('.mindset-tab');
      const video = document.getElementById('mindsetVideo');
      const playBtn = document.getElementById('mindsetPlayToggle');
      if (!tabs.length || !video) return;

      const els = {
        kicker: document.getElementById('mindsetKicker'),
        title: document.getElementById('mindsetTitle'),
        copy: document.getElementById('mindsetCopy'),
        dist: document.getElementById('metricDist'),
        speed: document.getElementById('metricSpeed'),
        bullets: document.getElementById('mindsetBullets'),
        hud: document.getElementById('mindsetHudText'),
        playIcon: document.getElementById('playBtnIcon'),
        playLabel: document.getElementById('playBtnLabel')
      };

      const syncPlayButton = () => {
        const playing = !video.paused && !video.ended;
        if (els.playIcon) els.playIcon.textContent = playing ? '❚❚' : '▶';
        if (els.playLabel) els.playLabel.textContent = playing ? 'Pause' : 'Play';
        if (playBtn) playBtn.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
      };

      const tryPlay = () => {
        if (this.reducedMotion || this.userPaused || !this.videoInView) return;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      };

      video.addEventListener('play', syncPlayButton);
      video.addEventListener('pause', syncPlayButton);

      if (playBtn) {
        playBtn.addEventListener('click', () => {
          if (video.paused) {
            this.userPaused = false;
            const p = video.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } else {
            this.userPaused = true;
            video.pause();
          }
          syncPlayButton();
        });
      }

      if ('IntersectionObserver' in window) {
        const vidObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            this.videoInView = entry.isIntersecting && entry.intersectionRatio >= 0.4;
            if (this.videoInView) {
              tryPlay();
            } else if (!video.paused) {
              video.pause();
            }
          }
        }, { threshold: [0, 0.4, 0.7] });
        vidObserver.observe(video);
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const key = tab.getAttribute('data-mindset');
          const data = MINDSETS[key];
          if (!data) return;

          tabs.forEach((t) => {
            const active = t === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', String(active));
          });

          if (els.kicker) els.kicker.textContent = data.kicker;
          if (els.title) els.title.textContent = data.title;
          if (els.copy) els.copy.textContent = data.copy;
          if (els.hud) els.hud.textContent = data.hud;

          if (els.dist) els.dist.setAttribute('data-km', String(data.km));
          if (els.speed) els.speed.setAttribute('data-kmh', String(data.kmh));
          this.renderUnits();

          if (els.bullets) {
            els.bullets.innerHTML = data.bullets.map((b) => `<li>${b}</li>`).join('');
          }

          video.setAttribute('poster', data.poster);
          const source = video.querySelector('source');
          if (source && source.getAttribute('src') !== data.clip) {
            source.setAttribute('src', data.clip);
            video.load();
            if (!this.reducedMotion && !this.userPaused && this.videoInView) {
              const p = video.play();
              if (p && typeof p.catch === 'function') p.catch(() => {});
            } else {
              syncPlayButton();
            }
          }
        });
      });

      syncPlayButton();
    },

    /* ---------- 4. Annotated GIS Screenshot Hotspots ---------- */
    initHotspots() {
      const pins = Array.from(document.querySelectorAll('.hotspot-pin'));
      if (!pins.length) return;

      const closeAll = (exceptPin) => {
        pins.forEach((pin) => {
          if (pin === exceptPin) return;
          pin.setAttribute('aria-expanded', 'false');
          pin.classList.remove('open');
          const pop = pin.nextElementSibling;
          if (pop && pop.classList.contains('hotspot-popover')) {
            pop.classList.remove('visible');
          }
        });
      };

      pins.forEach((pin) => {
        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          const willOpen = pin.getAttribute('aria-expanded') !== 'true';
          closeAll(pin);
          pin.setAttribute('aria-expanded', String(willOpen));
          pin.classList.toggle('open', willOpen);
          const pop = pin.nextElementSibling;
          if (pop && pop.classList.contains('hotspot-popover')) {
            pop.classList.toggle('visible', willOpen);
          }
        });
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hotspot-pin') && !e.target.closest('.hotspot-popover')) {
          closeAll(null);
        }
      });
    },

    /* ---------- 5. Image Lightbox ---------- */
    initLightbox() {
      const box = document.getElementById('rwLightbox');
      const img = document.getElementById('rwLightboxImg');
      const cap = document.getElementById('rwLightboxCaption');
      const closeBtn = document.getElementById('rwLightboxClose');
      const backdrop = document.getElementById('rwLightboxBackdrop');
      if (!box || !img) return;

      const open = (src, caption) => {
        img.src = src;
        img.alt = caption || 'RideWise screenshot';
        if (cap) cap.textContent = caption || '';
        box.classList.add('active');
        box.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      };

      const close = () => {
        box.classList.remove('active');
        box.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      };

      document.querySelectorAll('[data-lightbox-src]').forEach((trigger) => {
        trigger.addEventListener('click', () => {
          open(trigger.getAttribute('data-lightbox-src'), trigger.getAttribute('data-lightbox-caption'));
        });
      });

      if (closeBtn) closeBtn.addEventListener('click', close);
      if (backdrop) backdrop.addEventListener('click', close);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box.classList.contains('active')) close();
      });
    },

    /* ---------- 6. Copy Quick Start Commands ---------- */
    initQuickstartCopy() {
      const btn = document.getElementById('btnCopyQuickstart');
      const code = document.getElementById('quickstartCode');
      if (!btn || !code) return;

      btn.addEventListener('click', async () => {
        const text = code.textContent.trim();
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = 'Copied ✓';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy commands';
            btn.classList.remove('copied');
          }, 2000);
        } catch {
          btn.textContent = 'Select & copy';
        }
      });
    },

    /* ---------- 7. Copy Contact Email ---------- */
    initEmailCopy() {
      const btn = document.getElementById('btnCopyEmail');
      if (!btn) return;

      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText('gokulakumaran2007@gmail.com');
          btn.textContent = 'Copied ✓';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        } catch {
          btn.textContent = 'Copy failed';
        }
      });
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    BlogInteractiveController.init();
  });
})();
