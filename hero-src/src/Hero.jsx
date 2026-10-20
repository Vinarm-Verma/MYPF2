import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { CARDS } from './cards.js';

/* ---------- constants straight from the brief ---------- */
const N = CARDS.length; // 34
const STEP = 360 / N;
const CARD_W = 120; // 9:16
const CARD_H = Math.round((CARD_W * 16) / 9);
const DEAL_SECONDS = 2.6;
const LIFT_SECONDS = 1.9;
const LIFT_EASE = [0.5, 0, 0.15, 1];
const RADIUS0 = 580, RADIUS1 = 1010;
const PIVOT0 = 500, PIVOT1 = 814;
const DRIFT_DEG_PER_S = 7;
const VIDEO_PREFETCH = 7; // previews that play first (the ones nearest the top)

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const wrap180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
const r3 = (v) => Math.round(v * 1000) / 1000;

// order 0 = top card, then outward on both sides at once
const ORDER = CARDS.map((_, i) => Math.abs(wrap180(i * STEP)) / 180);
// which cards get a prefetched preview (closest to the top)
const PREFETCH_IDX = [...CARDS.keys()]
  .filter((i) => CARDS[i].kind !== 'photo')
  .sort((a, b) => ORDER[a] - ORDER[b])
  .slice(0, VIDEO_PREFETCH);

/* ---------- asset loading ---------- */
function decodeCover(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    const done = () => resolve();
    if (img.decode) img.decode().then(done, done);
    else {
      img.onload = done;
      img.onerror = done;
    }
  });
}
const probe = typeof document !== 'undefined' ? document.createElement('video') : null;
const CAN_MP4 = !!probe && probe.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
const videoSrc = (c) => (CAN_MP4 ? c.video : c.video.replace(/\.mp4$/, '.webm'));

function prefetch(src) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 9000);
  return fetch(src, { signal: ctl.signal, cache: 'force-cache' })
    .then((r) => r.arrayBuffer())
    .catch(() => {})
    .finally(() => clearTimeout(t));
}

export default function Hero({ compact = false }) {
  const reduce = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const sceneReady = compact || reduce;

  /* the two motion values that drive everything */
  const deal = useMotionValue(sceneReady ? 1 : 0);
  const lift = useMotionValue(sceneReady ? 1 : 0);
  const sky = useMotionValue(sceneReady ? 1 : 0);
  const horizon = useMotionValue(sceneReady ? 1 : 0);
  const horizonY = useTransform(horizon, [0, 1], ['24%', '0%']);

  const [phase, setPhase] = useState(sceneReady ? 'done' : 'loading'); // loading | deal | lift | done
  const [textIn, setTextIn] = useState(sceneReady);

  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const cardRefs = useRef([]);
  const videoRefs = useRef([]);
  const skipRef = useRef(() => {});
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /* ---------- the entrance sequence ---------- */
  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let dealAnim, liftAnim, skyAnim, horizonAnim, textTimer;
    const root = document.documentElement;

    const revealChrome = () => {
      setTextIn(true);
      root.classList.remove('hero-pending');
    };
    const finishAll = () => {
      if (finished) return;
      finished = true;
      deal.set(1);
      lift.set(1);
      sky.set(1);
      horizon.set(1);
      setPhase('done');
      revealChrome();
    };
    skipRef.current = () => {
      cancelled = true;
      [dealAnim, liftAnim, skyAnim, horizonAnim].forEach((a) => a && a.stop());
      clearTimeout(textTimer);
      finishAll();
    };

    if (compact) return;
    if (reduce) {
      root.classList.remove('hero-pending');
      return;
    }

    (async () => {
      // 1. every cover is decoded before the deal starts
      await Promise.all(CARDS.map((c) => decodeCover(c.cover)));
      if (cancelled) return;

      // 2. the deal (the loader) runs while the video previews load
      setPhase('deal');
      const dealDone = new Promise((res) => {
        dealAnim = animate(deal, 1, { duration: DEAL_SECONDS, ease: 'linear', onComplete: res });
      });
      const assetsDone = Promise.all(PREFETCH_IDX.map((i) => prefetch(videoSrc(CARDS[i]))));
      await Promise.all([dealDone, assetsDone]);
      if (cancelled) return;

      // 3. the lift: only when the deal is done AND the assets are ready
      setPhase('lift');
      const liftDone = new Promise((res) => {
        liftAnim = animate(lift, 1, { duration: LIFT_SECONDS, ease: LIFT_EASE, onComplete: res });
      });
      skyAnim = animate(sky, 1, { duration: 1.5, ease: 'easeOut' });
      horizonAnim = animate(horizon, 1, { duration: LIFT_SECONDS, ease: LIFT_EASE });
      textTimer = setTimeout(revealChrome, 1000); // header + headline ~1s into the lift
      await liftDone;
      if (cancelled) return;
      finished = true;
      setPhase('done');
    })();

    // fail-safe: never leave the header hidden
    const safety = setTimeout(() => root.classList.remove('hero-pending'), 15000);
    return () => {
      cancelled = true;
      clearTimeout(safety);
      clearTimeout(textTimer);
      [dealAnim, liftAnim, skyAnim, horizonAnim].forEach((a) => a && a.stop());
    };
  }, []); // eslint-disable-line

  /* Escape / Tab end the entrance instantly */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Escape' || e.key === 'Tab') && phaseRef.current !== 'done') skipRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- the single rAF loop + interaction ---------- */
  useEffect(() => {
    const frame = frameRef.current;
    const scene = sceneRef.current;
    const st = {
      target: 0, // wheel offset the user/drift aims at (deg, + = clockwise/right)
      cur: 0, // eased, visible offset
      vel: 0, // deg/s after a flick
      dragging: false,
      pointerTargetX: 0,
      pointerTargetY: 0,
      pointerX: 0,
      pointerY: 0,
      fit: 1,
      radius: RADIUS0,
    };
    const cache = {
      scene: '',
      t: new Array(N).fill(''),
      v: new Array(N).fill(''),
      playing: new Array(N).fill(false),
      retryAt: new Array(N).fill(0),
    };

    const measure = () => {
      const stage = stageRef.current;
      const w = stage.clientWidth, h = stage.clientHeight;
      st.fit = Math.min(1.25, Math.max(0.4, Math.min(h / 760, w / (w < 700 ? 560 : 820))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageRef.current);

    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const d = deal.get();
      const L = lift.get();

      /* target angle: drift (left, ramped by lift) + decaying flick velocity */
      if (!st.dragging) {
        if (!reduce) st.target -= DRIFT_DEG_PER_S * L * dt;
        if (Math.abs(st.vel) > 0.01) {
          st.target += st.vel * dt;
          st.vel *= Math.exp(-dt * 3.2);
        } else st.vel = 0;
      }
      /* exponential follow */
      st.cur += (st.target - st.cur) * (1 - Math.exp(-dt * 9));
      st.pointerX += (st.pointerTargetX - st.pointerX) * (1 - Math.exp(-dt * 7));
      st.pointerY += (st.pointerTargetY - st.pointerY) * (1 - Math.exp(-dt * 7));

      const radius = RADIUS0 + (RADIUS1 - RADIUS0) * L;
      const pivot = PIVOT0 + (PIVOT1 - PIVOT0) * L;
      const cardScale = 1 + 0.35 * L;
      const turn = -28 * L; // opening turn: same direction as the drift
      st.radius = radius;

      /* scene tips back 12deg, grows 14% */
      const sceneT = `rotateX(${r3(12 * L - st.pointerY * 4)}deg) rotateY(${r3(st.pointerX * 5)}deg) scale(${r3(st.fit * (1 + 0.14 * L))})`;
      if (sceneT !== cache.scene) {
        scene.style.transform = sceneT;
        cache.scene = sceneT;
      }

      const wantPlay = L > 0.6 && !reduce;
      for (let i = 0; i < N; i++) {
        const el = cardRefs.current[i];
        const home = i * STEP;
        const p = easeOutCubic(clamp01((d - ORDER[i] * 0.6) / 0.4));
        const ang = home + 70 * (1 - p) + turn + st.cur;
        const dist = Math.abs(wrap180(ang));
        const visible = dist <= 100 && p > 0;
        const vis = visible ? 'visible' : 'hidden';
        if (vis !== cache.v[i]) {
          el.style.visibility = vis;
          cache.v[i] = vis;
        }
        if (visible) {
          const depth = -dist * 0.6;
          const y = pivot + 140 * (1 - p);
          const s = (0.7 + 0.3 * p) * cardScale;
          const t = `translate3d(0,${r3(y)}px,${r3(depth)}px) rotateZ(${r3(ang)}deg) translate3d(0,${r3(-radius * p)}px,0) rotateY(${r3(180 * (1 - p))}deg) scale(${r3(s)})`;
          if (t !== cache.t[i]) {
            el.style.transform = t;
            cache.t[i] = t;
          }
        }
        /* video: only cards within 40deg of the top play */
        const v = videoRefs.current[i];
        const want = wantPlay && dist <= 40;
        if (v && want !== cache.playing[i] && (!want || now >= cache.retryAt[i])) {
          cache.playing[i] = want;
          if (want) {
            const pr = v.play();
            if (pr && pr.catch)
              pr.catch(() => {
                cache.playing[i] = false;
                cache.retryAt[i] = performance.now() + 3000; // blocked/unsupported: try again later, not every frame
              });
          } else v.pause();
        }
      }
    };
    raf = requestAnimationFrame(loop);

    /* ----- drag / swipe ----- */
    const degPerPx = () => 180 / (Math.PI * st.radius * st.fit * (1 + 0.14 * lift.get()));
    const canInteract = () => lift.get() > 0.9;
    let drag = null;
    let suppressClick = false;

    const onDown = (e) => {
      if (!canInteract()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false };
    };
    const onMove = (e) => {
      if (!reduce && e.pointerType === 'mouse' && !st.dragging && canInteract()) {
        const bounds = stageRef.current.getBoundingClientRect();
        st.pointerTargetX = Math.max(-1, Math.min(1, ((e.clientX - bounds.left) / bounds.width - 0.5) * 2));
        st.pointerTargetY = Math.max(-1, Math.min(1, ((e.clientY - bounds.top) / bounds.height - 0.5) * 2));
      }
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.x) < 6) return;
        drag.moved = true;
        st.dragging = true;
        st.vel = 0;
        try { frame.setPointerCapture(e.pointerId); } catch (_) {}
        frame.classList.add('is-dragging');
      }
      const dx = e.clientX - drag.lastX;
      const dtm = Math.max(1, e.timeStamp - drag.lastT) / 1000;
      const dDeg = dx * degPerPx();
      st.target += dDeg;
      drag.v = drag.v * 0.6 + (dDeg / dtm) * 0.4;
      drag.lastX = e.clientX;
      drag.lastT = e.timeStamp;
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.moved) {
        st.dragging = false;
        // ignore the velocity if the pointer paused for more than 80ms
        st.vel = e.timeStamp - drag.lastT > 80 ? 0 : drag.v;
        suppressClick = true; // a drag must not trigger a card's link
        setTimeout(() => (suppressClick = false), 0);
        frame.classList.remove('is-dragging');
      }
      drag = null;
    };
    const onLeave = () => {
      st.pointerTargetX = 0;
      st.pointerTargetY = 0;
    };
    const onClickCapture = (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onWheel = (e) => {
      if (!canInteract()) return;
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.deltaY) && !(e.shiftKey && !e.deltaX)) return; // leave vertical scroll alone
      e.preventDefault();
      st.target += dx * degPerPx();
      st.vel = 0;
    };

    frame.addEventListener('pointerdown', onDown);
    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerleave', onLeave);
    frame.addEventListener('pointerup', onUp);
    frame.addEventListener('pointercancel', onUp);
    frame.addEventListener('click', onClickCapture, true);
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      frame.removeEventListener('pointerdown', onDown);
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerleave', onLeave);
      frame.removeEventListener('pointerup', onUp);
      frame.removeEventListener('pointercancel', onUp);
      frame.removeEventListener('click', onClickCapture, true);
      frame.removeEventListener('wheel', onWheel);
    };
  }, []); // eslint-disable-line

  const entering = phase !== 'done';
  const show = { opacity: 1, y: 0 };
  const hide = { opacity: 0, y: 36 };
  const ease = [0.2, 0.75, 0.25, 1];
  const t = (delay) => ({ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : delay, ease });

  return (
    <div className={`hero-frame${compact ? ' contact-wheel' : ''}`} ref={frameRef}>
      {/* painted sky, fades in as the lift starts */}
      <motion.div className="hero-sky" style={{ opacity: sky }} aria-hidden="true" />

      {/* original watermark */}
      <div className="hero-watermark" aria-hidden="true">
        <span>DEVELOPER</span>
      </div>

      {/* the wheel */}
      <div className="hero-stage" ref={stageRef}>
        <div className="hero-scene" ref={sceneRef}>
          {CARDS.map((c, i) => {
            const label = `${c.title}${c.sub ? ' — ' + c.sub : c.group ? ' — ' + c.group : ''}`;
            return (
              <a
                key={c.id}
                className="wcard"
                href={c.href}
                {...(c.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                aria-label={label}
                draggable={false}
                ref={(el) => (cardRefs.current[i] = el)}
                style={{ width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2, visibility: 'hidden' }}
              >
                <span className="face back" aria-hidden="true">
                  <span className="mono-vv">VV</span>
                </span>
                <span className="face front">
                  <img src={c.cover} alt="" draggable={false} decoding="async" />
                  {!compact && c.kind !== 'photo' && (
                    <video
                      ref={(el) => (videoRefs.current[i] = el)}
                      src={videoSrc(c)}
                      muted
                      loop
                      playsInline
                      preload="none"
                      tabIndex={-1}
                      aria-hidden="true"
                      onPlaying={(e) => e.currentTarget.classList.add('on')}
                    />
                  )}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* soft horizon glow grounds the wheel without obscuring its cards */}
      {!compact && (
        <motion.div className="hero-horizon" style={{ y: horizonY }} aria-hidden="true" />
      )}

      {/* hero copy: exactly the portfolio's text */}
      {!compact && (
        <div className="hero-copy">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-4 sm:mb-5">
            <motion.div
              className="flex items-center gap-3"
              initial={false}
              animate={textIn ? show : hide}
              transition={t(0)}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-vermilion animate-ping"></span>
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-muted">
                AVAILABLE FOR INTERNSHIPS &amp; COLLABORATION &bull; 2024–2028
              </span>
            </motion.div>
            <motion.div
              className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-divider/30 px-3.5 py-1.5 rounded-full shadow-sm"
              initial={false}
              animate={textIn ? show : hide}
              transition={t(0.08)}
            >
              <span>👋</span>
              <span className="font-mono text-xs font-semibold tracking-wider text-ink">HI, I'M VINARM VERMA</span>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end">
            <div className="lg:col-span-7">
              <motion.h2
                className="hero-headline font-display tracking-tight leading-[0.92] text-ink uppercase"
                initial={false}
                animate={textIn ? show : hide}
                transition={t(0.16)}
              >
                BUILDING <br />
                <span className="text-vermilion">INTELLIGENT</span> SYSTEMS <br />
                &amp; PRACTICAL SOFTWARE.
              </motion.h2>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <motion.p
                className="text-muted text-sm sm:text-base max-w-xl font-normal leading-relaxed"
                initial={false}
                animate={textIn ? show : hide}
                transition={t(0.26)}
              >
                B.Tech IT student with hands-on experience in AI, data analytics, and full-stack development. I have
                built production-ready voice automation systems, a full-stack emergency response platform, and data
                analytics dashboards using Python, Java, SQL, and Power BI.
              </motion.p>
              <motion.div
                className="flex flex-wrap items-center gap-3 sm:gap-4"
                initial={false}
                animate={textIn ? show : hide}
                transition={t(0.34)}
              >
                <a
                  href="#work"
                  className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-full bg-ink text-white font-mono text-xs font-bold tracking-widest hover:bg-vermilion transition-all flex items-center gap-2 shadow-lg"
                >
                  <span>EXPLORE MY WORK</span>
                  <i data-lucide="arrow-up-right" className="w-4 h-4"></i>
                </a>
                <a
                  href="#contact"
                  className="px-7 py-3.5 sm:px-8 sm:py-4 rounded-full bg-white/80 border border-divider/60 text-ink font-mono text-xs font-bold tracking-widest hover:bg-white hover:border-ink transition-all"
                >
                  LET'S CONNECT
                </a>
              </motion.div>
          </div>
        </div>
        </div>
        </div>
      )}

      {!compact && entering && (
        <button type="button" className="hero-skip font-mono" onClick={() => skipRef.current()}>
          SKIP INTRO <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
