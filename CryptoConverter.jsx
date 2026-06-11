import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════
const CELL_H = 24;
const BASELINE_PAD = 1;
const EPS = 1e-12;
const DIGIT_REEL = Array.from({ length: 140 }, (_, i) => i % 10);
const DIGIT_CENTER = 60;
const PH_COLORS = [
  'rgba(110,160,255,.45)', 'rgba(150,120,255,.45)', 'rgba(190,110,230,.45)',
  'rgba(210,140,180,.45)', 'rgba(180,170,120,.45)', 'rgba(120,200,170,.45)',
  'rgba(100,180,230,.45)',
];
const PH_COLORS_LOADING = [
  'rgba(110,160,255,.75)', 'rgba(150,120,255,.75)', 'rgba(190,110,230,.75)',
  'rgba(210,140,180,.75)', 'rgba(180,170,120,.75)', 'rgba(120,200,170,.75)',
  'rgba(100,180,230,.75)',
];

// ═══════════════════════════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════════════════════════
function countDecimals(s) {
  const i = s.indexOf(".");
  return i === -1 ? 0 : s.length - i - 1;
}

// addCommas from shared.js (handles both integer-only and decimal-bearing strings)

function plainToFmt(pp, ps) {
  const f = addCommas(ps);
  let pi = 0;
  for (let fi = 0; fi <= f.length; fi++) {
    if (pi === pp) return fi;
    if (fi < f.length && f[fi] !== ",") pi++;
  }
  return f.length;
}

function fmtToPlain(fp, f) {
  let p = 0;
  for (let i = 0; i < fp && i < f.length; i++) {
    if (f[i] !== ",") p++;
  }
  return p;
}

function tokIdxToDisplay(idx, intLen) {
  if (intLen <= 3) return idx;
  let c = 0;
  const lim = idx < intLen ? idx : intLen - 1;
  for (let i = 1; i <= lim; i++) {
    if ((intLen - i) % 3 === 0) c++;
  }
  return idx + c;
}

function sanitize(raw, maxDec) {
  let s = raw.replace(/[^0-9.]/g, "");
  if (s === "") return "";
  const fd = s.indexOf(".");
  if (fd !== -1) {
    s = s.slice(0, fd + 1) + s.slice(fd + 1).replace(/\./g, "");
    s = s.slice(0, fd + 1) + s.slice(fd + 1).slice(0, Math.max(0, maxDec));
  }
  if (s.startsWith(".")) s = "0" + s;
  const dot = s.indexOf(".");
  const int = dot === -1 ? s : s.slice(0, dot);
  const frac = dot === -1 ? "" : s.slice(dot + 1);
  let ni = int.replace(/^0+/, "");
  if (ni === "") ni = "0";
  return dot === -1 ? ni : `${ni}.${frac}`;
}

function roundToStep(n, step, mode) {
  if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return 0;
  const q = n / step;
  if (mode === "up") return Math.ceil(q - EPS) * step;
  if (mode === "down") return Math.floor(q + EPS) * step;
  return Math.round(q) * step;
}

function isAligned(n, step) {
  if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return true;
  return Math.abs(n - roundToStep(n, step, "nearest")) <= Math.max(EPS, step * 1e-9);
}

function inferDir(prev, next) {
  const pn = Number(prev);
  const nn = Number(next);
  if (prev && next && Number.isFinite(pn) && Number.isFinite(nn) && pn !== nn) {
    return nn > pn ? "up" : "down";
  }
  return next.length >= prev.length ? "up" : "down";
}

// ═══════════════════════════════════════════════════════════════════
// Diff algorithms
// ═══════════════════════════════════════════════════════════════════
function diffRange(ps, ns, ch = null) {
  const delta = ns.length - ps.length;
  const cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  if (delta > 0) {
    const t = i => ps.slice(i) === ns.slice(i + delta);
    if (ch != null) {
      const p = cl(ch - delta, 0, ps.length);
      if (t(p)) return { start: p, removed: "", added: ns.slice(p, p + delta), suffixLen: ps.length - p };
      for (let o = 1; o <= ps.length; o++) {
        const l = p - o, r = p + o;
        if (l >= 0 && t(l)) return { start: l, removed: "", added: ns.slice(l, l + delta), suffixLen: ps.length - l };
        if (r <= ps.length && t(r)) return { start: r, removed: "", added: ns.slice(r, r + delta), suffixLen: ps.length - r };
      }
    }
    for (let i = 0; i <= ps.length; i++) {
      if (t(i)) return { start: i, removed: "", added: ns.slice(i, i + delta), suffixLen: ps.length - i };
    }
  }

  if (delta < 0) {
    const del = -delta;
    const t = i => ps.slice(i + del) === ns.slice(i);
    if (ch != null) {
      const p = cl(ch, 0, ns.length);
      if (t(p)) return { start: p, removed: ps.slice(p, p + del), added: "", suffixLen: ns.length - p };
      for (let o = 1; o <= ns.length; o++) {
        const l = p - o, r = p + o;
        if (l >= 0 && t(l)) return { start: l, removed: ps.slice(l, l + del), added: "", suffixLen: ns.length - l };
        if (r <= ns.length && t(r)) return { start: r, removed: ps.slice(r, r + del), added: "", suffixLen: ns.length - r };
      }
    }
    for (let i = 0; i <= ns.length; i++) {
      if (t(i)) return { start: i, removed: ps.slice(i, i + del), added: "", suffixLen: ns.length - i };
    }
  }

  let s = 0;
  while (s < ps.length && s < ns.length && ps[s] === ns[s]) s++;
  let ep = ps.length - 1, en = ns.length - 1;
  while (ep >= s && en >= s && ps[ep] === ns[en]) { ep--; en--; }
  return { start: s, removed: ps.slice(s, ep + 1), added: ns.slice(s, en + 1), suffixLen: ps.length - (ep + 1) };
}

function diffFromSel(ps, ns, ss, se) {
  const s = Math.max(0, Math.min(ss, ps.length));
  const e = Math.max(s, Math.min(se, ps.length));
  const suf = ps.slice(e);
  const sl = suf.length;
  if (!(ps.slice(0, s) === ns.slice(0, Math.min(s, ns.length)))) return null;
  if (!(sl <= ns.length && suf === ns.slice(ns.length - sl))) return null;
  return { start: s, removed: ps.slice(s, e), added: ns.slice(s, Math.max(s, ns.length - sl)), suffixLen: sl };
}

// ═══════════════════════════════════════════════════════════════════
// Token update engine
// ═══════════════════════════════════════════════════════════════════
function applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId, caretHint: ch = null, selectionHint: sh = null }) {
  let d = null;
  if (sh && sh.end > sh.start) d = diffFromSel(ps, ns, sh.start, sh.end);
  if (!d) d = diffRange(ps, ns, ch);

  const { start, removed, added, suffixLen } = d;
  const prefix = pt.slice(0, start);
  const suffix = suffixLen > 0 ? pt.slice(pt.length - suffixLen) : [];
  const aff = new Set();
  const rem = [];
  const mid = [];
  const ml = Math.min(removed.length, added.length);

  for (let i = 0; i < ml; i++) {
    const t = pt[start + i];
    if (!t) {
      const id = makeId();
      mid.push({ id, ch: added[i] });
      aff.add(id);
      continue;
    }
    mid.push({ id: t.id, ch: added[i] });
    if (t.ch !== added[i]) aff.add(t.id);
  }

  for (let i = ml; i < added.length; i++) {
    const id = makeId();
    mid.push({ id, ch: added[i] });
    aff.add(id);
  }

  for (let i = ml; i < removed.length; i++) {
    const t = pt[start + i];
    if (t) rem.push({ ...t, index: start + i });
  }

  const result = [...prefix, ...mid, ...suffix];

  // Fallback: if token reconstruction doesn't match, rebuild from scratch
  if (result.map(t => t.ch).join("") !== ns) {
    const t2 = [], a2 = new Set(), r2 = [];
    for (let i = 0; i < ns.length; i++) {
      if (i < pt.length && pt[i].ch === ns[i]) {
        t2.push(pt[i]);
      } else if (i < pt.length) {
        t2.push({ id: pt[i].id, ch: ns[i] });
        a2.add(pt[i].id);
      } else {
        const id = makeId();
        t2.push({ id, ch: ns[i] });
        a2.add(id);
      }
    }
    for (let i = ns.length; i < pt.length; i++) r2.push({ ...pt[i], index: i });
    return { tokens: t2, affectedIds: a2, removedTokens: r2 };
  }

  return { tokens: result, affectedIds: aff, removedTokens: rem };
}

// ═══════════════════════════════════════════════════════════════════
// Hooks
// ═══════════════════════════════════════════════════════════════════
function useLatest(v) {
  const r = useRef(v);
  useLayoutEffect(() => { r.current = v; }, [v]);
  return r;
}

// ═══════════════════════════════════════════════════════════════════
// DigitRoll — single animated digit reel
// ═══════════════════════════════════════════════════════════════════
const DigitRoll = React.memo(function DigitRoll({
  digit, animDirection, animTriggerId, spinCycles = 0, height = CELL_H, className = "",
}) {
  const [index, setIndex] = useState(DIGIT_CENTER + digit);
  const [noTrans, setNoTrans] = useState(true);
  const [dur, setDur] = useState(220);
  const [isSnap, setIsSnap] = useState(false);

  const prev = useRef(null);
  const animRef = useRef(false);
  const trackEl = useRef(null);
  const mountedRef = useRef(true);
  const rafs = useRef(new Set());

  const raf = cb => {
    const id = requestAnimationFrame(t => { rafs.current.delete(id); cb(t); });
    rafs.current.add(id);
  };
  const cancelRafs = () => { rafs.current.forEach(cancelAnimationFrame); rafs.current.clear(); };
  const flush = () => { if (trackEl.current) trackEl.current.getBoundingClientRect(); };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; cancelRafs(); };
  }, []);

  // Synchronous hard-snap: cancel animations and reset position immediately
  const hardSnap = d => {
    animRef.current = false;
    cancelRafs();
    setNoTrans(true);
    setIndex(DIGIT_CENTER + d);
  };

  useLayoutEffect(() => {
    const pv = prev.current;

    // First mount
    if (pv === null) {
      prev.current = digit;
      if (!animDirection) {
        setNoTrans(true);
        setIndex(DIGIT_CENTER + digit);
        raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); });
        return;
      }
      if (animDirection === "snap") {
        setIsSnap(true); setNoTrans(true); setIndex(DIGIT_CENTER + digit);
        return;
      }
      const sim = animDirection === "up" ? (digit + 9) % 10 : (digit + 1) % 10;
      setNoTrans(true);
      setIndex(DIGIT_CENTER + sim);
      raf(() => {
        if (!mountedRef.current) return;
        animRef.current = true;
        const su = (digit - sim + 10) % 10;
        const sd = (sim - digit + 10) % 10;
        const ex = Math.max(1, spinCycles) * 10;
        const dist = (animDirection === "up" ? su : sd) + ex;
        setDur(Math.min(520, 160 + dist * 12));
        setNoTrans(false);
        setIndex(animDirection === "up"
          ? DIGIT_CENTER + sim + su + ex
          : DIGIT_CENTER + sim - (sd + ex));
      });
      return;
    }

    prev.current = digit;

    if (!animDirection || pv === digit) {
      hardSnap(digit);
      raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); });
      return;
    }

    // Snap mode: drop from top with thud
    if (animDirection === "snap") {
      if (animRef.current) { cancelRafs(); animRef.current = false; }
      setIsSnap(true); setNoTrans(true); setIndex(DIGIT_CENTER + digit);
      return;
    }

    setIsSnap(false);

    // If already animating, hard-snap to previous digit first
    if (animRef.current) {
      cancelRafs(); setNoTrans(true); setIndex(DIGIT_CENTER + pv); flush();
    }

    animRef.current = true;
    const su = (digit - pv + 10) % 10;
    const sd = (pv - digit + 10) % 10;
    const ex = Math.max(0, spinCycles) * 10;
    const dist = (animDirection === "up" ? su : sd) + ex;
    setDur(Math.min(520, 160 + dist * 12));
    raf(() => {
      if (!mountedRef.current) return;
      setNoTrans(false);
      setIndex(c => animDirection === "up"
        ? DIGIT_CENTER + pv + su + ex
        : DIGIT_CENTER + pv - (sd + ex));
    });
  }, [digit, animDirection, animTriggerId, spinCycles]);

  const onEnd = () => {
    if (!animRef.current) return;
    animRef.current = false;
    setNoTrans(true);
    raf(() => {
      if (!mountedRef.current) return;
      setIndex(DIGIT_CENTER + digit);
      raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); });
    });
  };

  return (
    <span className={`ri-digit ${className}`.trim()} style={{ height }}>
      <span
        className={isSnap ? "ri-digit__drop" : undefined}
        onAnimationEnd={() => setIsSnap(false)}
      >
        <span
          ref={trackEl}
          className={"ri-digit__track " + (noTrans ? "ri-digit__track--no" : "")}
          style={{ transform: `translateY(${-index * height}px)`, transitionDuration: `${dur}ms` }}
          onTransitionEnd={onEnd}
        >
          {DIGIT_REEL.map((d, i) => (
            <span key={i} className="ri-digit__cell" style={{ height }}>{d}</span>
          ))}
        </span>
      </span>
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════
// Punct — animated punctuation character
// ═══════════════════════════════════════════════════════════════════
const Punct = React.memo(function Punct({
  ch, animate, direction, height = CELL_H, className = "",
}) {
  const cls = "ri-punct" + (animate
    ? (ch === "." ? " ri-punct--dotIn"
      : ch === "," ? " ri-punct--pop"
      : direction ? ` ri-punct--${direction}`
      : " ri-punct--pop")
    : "");
  return <span className={`${cls} ${className}`.trim()} style={{ height }}>{ch}</span>;
});

// ═══════════════════════════════════════════════════════════════════
// CSS injection
// ═══════════════════════════════════════════════════════════════════
const CSS_ID = "__rolling_input_css";
const STYLE_CSS = `
:root{--ri-cell-h:${CELL_H}px;--ri-base-pad:${BASELINE_PAD}px}
.ri-field{position:relative;border-radius:12px;overflow:visible}
.ri-bump{position:absolute;inset:0;border-radius:12px;pointer-events:none;opacity:0;animation:riBump 220ms cubic-bezier(.25,.9,.25,1);z-index:4}
@keyframes riBump{0%{opacity:0;transform:translateX(0);box-shadow:0 0 0 0 rgba(255,60,60,0)}20%{opacity:1;transform:translateX(-3px);box-shadow:0 0 0 2px rgba(255,60,60,.35)}40%{opacity:1;transform:translateX(3px);box-shadow:0 0 0 2px rgba(255,60,60,.35)}60%{opacity:1;transform:translateX(-2px);box-shadow:0 0 0 2px rgba(255,60,60,.28)}100%{opacity:0;transform:translateX(0);box-shadow:0 0 0 0 rgba(255,60,60,0)}}
.ri-input{width:100%;height:58px;border-radius:12px;border:1px solid rgba(255,255,255,.12);padding:0 92px 0 16px;font-size:22px;line-height:22px;font-variant-numeric:tabular-nums;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;color:transparent;caret-color:rgba(255,255,255,.7);background:transparent;outline:none;position:relative;z-index:2}
.ri-input:focus{border-color:rgba(255,255,255,.25);box-shadow:0 0 0 3px rgba(255,255,255,.06)}
.ri-input::placeholder{color:transparent}
.ri-input--warn{border-color:rgba(255,80,80,.3)!important}
.ri-input--warn:focus{box-shadow:0 0 0 3px rgba(255,80,80,.1)!important}
.ri-display{position:absolute;z-index:1;inset:0;display:flex;align-items:center;padding:0 92px 0 16px;pointer-events:none;font-size:22px;line-height:22px;font-variant-numeric:tabular-nums;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:visible}
.ri-display__inner{position:relative;display:inline-flex;align-items:center;height:var(--ri-cell-h)}
.ri-suffix{display:inline-flex;align-items:center;margin-left:.5ch;color:rgba(255,255,255,.22);font-size:14px;font-weight:500;letter-spacing:.03em;transition:opacity 220ms ease,transform 220ms ease}
.ri-suffix--enter{animation:riSufIn 480ms cubic-bezier(.22,.6,.36,1) both}
@keyframes riSufIn{0%{opacity:0;transform:translateY(-18px)}45%{opacity:.8;transform:translateY(2px)}70%{opacity:.95;transform:translateY(-1px)}100%{opacity:1;transform:translateY(0)}}
.ri-placeholder{color:rgba(255,255,255,.28);font-family:'JetBrains Mono',ui-monospace,monospace}
.ri-ph-char{display:inline-block;width:1ch;text-align:center;animation:riPlIn 480ms cubic-bezier(.22,.6,.36,1) both}
@keyframes riPlIn{0%{transform:translateY(-20px);opacity:0;color:var(--pl-c)}45%{transform:translateY(2px);opacity:.85;color:var(--pl-c)}70%{transform:translateY(-1px);opacity:.95;color:var(--pl-c)}100%{transform:translateY(0);opacity:1;color:rgba(255,255,255,.28)}}
.ri-ph-char--loading{animation:riPlPulse 1.8s ease-in-out infinite both;opacity:1;transform:none}
@keyframes riPlPulse{0%{color:var(--pl-c0);opacity:.6}25%{color:var(--pl-c1);opacity:.9}50%{color:var(--pl-c2);opacity:.6}75%{color:var(--pl-c1);opacity:.9}100%{color:var(--pl-c0);opacity:.6}}
.ri-display__inner--loading{animation:riValPulse 1.6s ease-in-out infinite}
.ri-display__inner--loading .ri-digit__cell,.ri-display__inner--loading .ri-punct,.ri-display__inner--loading .ri-static,.ri-display__inner--loading .ri-suffix{animation:riValPulse 1.6s ease-in-out infinite}
@keyframes riValPulse{0%{color:rgba(110,160,255,.75);opacity:.7}20%{color:rgba(150,120,255,.8);opacity:.9}40%{color:rgba(190,110,230,.75);opacity:.7}60%{color:rgba(120,200,170,.8);opacity:.9}80%{color:rgba(210,140,180,.75);opacity:.7}100%{color:rgba(110,160,255,.75);opacity:.7}}
.ri-static,.ri-digit__cell,.ri-punct,.ri-fall{box-sizing:border-box;padding-top:var(--ri-base-pad);line-height:1}
.ri-static{display:inline-grid;place-items:center;width:1ch}
.ri-digit{display:inline-block;width:1ch;overflow:hidden;vertical-align:middle;position:relative}
.ri-digit::before,.ri-digit::after{content:"";position:absolute;left:0;right:0;height:7px;pointer-events:none;z-index:1}
.ri-digit::before{top:0;background:linear-gradient(to bottom,var(--ri-fade-color,rgba(18,18,24,1)),transparent)}
.ri-digit::after{bottom:0;background:linear-gradient(to top,var(--ri-fade-color,rgba(18,18,24,1)),transparent)}
.ri-digit__track{display:block;transition-property:transform;transition-timing-function:var(--hx-easing, cubic-bezier(.2,.8,.2,1));will-change:transform}
.ri-digit__track--no{transition:none}
.ri-digit__drop{display:block;animation:riSnapDrop 300ms cubic-bezier(.22,.6,.36,1) both}
@keyframes riSnapDrop{0%{transform:translateY(-22px);opacity:0}40%{transform:translateY(3px);opacity:1}62%{transform:translateY(-2px)}80%{transform:translateY(1px)}100%{transform:translateY(0);opacity:1}}
.ri-digit__cell{display:grid;place-items:center}
.ri-punct{display:inline-grid;place-items:center;width:1ch;height:var(--ri-cell-h)}
.ri-punct--up{animation:riPUp 180ms cubic-bezier(.2,.9,.2,1)}
.ri-punct--down{animation:riPDn 180ms cubic-bezier(.2,.9,.2,1)}
.ri-punct--pop{animation:riPPop 160ms cubic-bezier(.2,.9,.2,1)}
.ri-punct--dotIn{animation:riDotIn 220ms cubic-bezier(.2,.9,.2,1)}
@keyframes riPUp{from{transform:translateY(8px);opacity:.2}to{transform:translateY(0);opacity:1}}
@keyframes riPDn{from{transform:translateY(-8px);opacity:.2}to{transform:translateY(0);opacity:1}}
@keyframes riPPop{from{transform:scale(.85);opacity:.3}to{transform:scale(1);opacity:1}}
@keyframes riDotIn{0%{transform:translateY(10px) scale(.6);opacity:0}60%{transform:translateY(-2px) scale(1.18);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
.ri-fall-layer{position:absolute;top:0;left:16px;right:92px;height:58px;display:flex;align-items:center;pointer-events:none;z-index:10;overflow:visible;font-size:22px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.ri-fall{position:absolute;top:50%;margin-top:calc(var(--ri-cell-h) / -2);width:1ch;height:var(--ri-cell-h);display:grid;place-items:center}
.ri-fall--delete{animation:riFDel 240ms cubic-bezier(.25,.6,.35,1) forwards}
.ri-fall--delete-single{animation:riFDelS 240ms cubic-bezier(.25,.6,.35,1) forwards}
.ri-fall--clear{animation:riFClr 220ms cubic-bezier(.25,.6,.35,1) forwards}
.ri-fall--clear-fast{animation:riFClr 130ms cubic-bezier(.25,.6,.35,1) forwards}
.ri-fall--overflow{animation:riFOver 280ms cubic-bezier(.15,.7,.25,1) both}
.ri-fall--sweep{animation:riFSweep 300ms cubic-bezier(.2,.7,.3,1) forwards;transform-origin:bottom right}
@keyframes riFDelS{0%{transform:perspective(800px) translateX(0) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateX(-.15ch) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(-.4ch) translateY(18px) rotateX(-8deg);opacity:0}}
@keyframes riFDel{0%{transform:perspective(800px) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateY(16px) rotateX(-6deg);opacity:0}}
@keyframes riFClr{0%{transform:translateY(0);opacity:1}100%{transform:translateY(14px);opacity:0}}
@keyframes riFOver{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}12%{transform:translateY(-1px) translateX(.4ch) rotate(3deg);opacity:.9}40%{transform:translateY(1px) translateX(.9ch) rotate(6deg);opacity:.5}100%{transform:translateY(4px) translateX(1.6ch) rotate(18deg);opacity:0}}
@keyframes riFSweep{0%{transform:translateX(0) translateY(0) rotate(0deg);opacity:1}8%{transform:translateX(4px) translateY(-3px) rotate(4deg);opacity:1}100%{transform:translateX(3ch) translateY(16px) rotate(45deg);opacity:0}}
.ri-fall--sweep-bw{animation:riFSweepBw 300ms cubic-bezier(.2,.7,.3,1) forwards;transform-origin:bottom left}
@keyframes riFSweepBw{0%{transform:translateX(0) translateY(0) rotate(0deg);opacity:1}8%{transform:translateX(-4px) translateY(-3px) rotate(-4deg);opacity:1}100%{transform:translateX(-3ch) translateY(16px) rotate(-45deg);opacity:0}}
.ri-fall--delete-bw{animation:riFDelBw 240ms cubic-bezier(.25,.6,.35,1) forwards}
@keyframes riFDelBw{0%{transform:perspective(800px) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(-.5ch) translateY(16px) rotateX(-6deg);opacity:0}}
.ri-fall--delete-single-bw{animation:riFDelSBw 240ms cubic-bezier(.25,.6,.35,1) forwards}
@keyframes riFDelSBw{0%{transform:perspective(800px) translateX(0) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateX(.15ch) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(.4ch) translateY(18px) rotateX(-8deg);opacity:0}}
.ri-shift{will-change:transform}
.ri-shift--right{animation:riShR 140ms cubic-bezier(.2,.9,.2,1)}
.ri-shift--left{animation:riShL 140ms cubic-bezier(.2,.9,.2,1)}
@keyframes riShR{from{transform:translateX(-1ch)}to{transform:translateX(0)}}
@keyframes riShL{from{transform:translateX(1ch)}to{transform:translateX(0)}}
.ri-controls{position:absolute;top:50%;right:12px;transform:translateY(-50%);display:flex;align-items:center;gap:10px;height:calc(100%-10px);z-index:3}
.ri-clear{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;cursor:pointer;display:grid;place-items:center;font-size:18px;line-height:1;color:rgba(255,255,255,.4);transition:all 120ms}
.ri-clear:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)}
.ri-stepper{display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,.1);padding-left:10px}
.ri-step{width:30px;height:14px;border:0;background:transparent;cursor:pointer;display:grid;place-items:center;color:rgba(255,255,255,.35);line-height:1;user-select:none;font-size:10px;transition:all 120ms}
.ri-step:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border-radius:6px}
.cv-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:cvFadeIn 200ms ease}
.cv-modal{background:#1a1a24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;width:100%;max-width:400px;animation:cvSlideUp 280ms cubic-bezier(.2,.8,.2,1);font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff}
@keyframes cvFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cvSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.cv-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.cv-row:last-child{border-bottom:none}
.cv-success{text-align:center;animation:cvPop 400ms cubic-bezier(.2,.8,.2,1)}
@keyframes cvPop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
@keyframes cvTickDraw{to{stroke-dashoffset:0}}
@keyframes cvCheckBounce{0%{transform:scale(1)}30%{transform:scale(1.3)}60%{transform:scale(.92)}80%{transform:scale(1.08)}100%{transform:scale(1)}}
.cv-check{width:56px;height:56px;border-radius:50%;display:inline-grid;place-items:center;font-size:28px;margin-bottom:12px;animation:cvCheckBounce 400ms cubic-bezier(.15,1.4,.3,1) 360ms both}
@keyframes cvHdrOut{0%{transform:translateX(0);opacity:1}100%{transform:translateX(10px);opacity:0}}
@keyframes cvHdrIn{0%{transform:translateX(-10px);opacity:0}100%{transform:translateX(0);opacity:1}}
@keyframes cvSwapOutDown{0%{transform:translateY(0);opacity:1}100%{transform:translateY(22px);opacity:0}}
@keyframes cvSwapOutUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-22px);opacity:0}}
@keyframes cvSwapInUp{0%{transform:translateY(14px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes cvSwapInDown{0%{transform:translateY(-14px);opacity:0}100%{transform:translateY(0);opacity:1}}
.cv-quote-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 6px;border-radius:10px;font-size:9px;font-weight:600;letter-spacing:.03em;color:rgba(255,255,255,.4);background:rgba(255,255,255,.04);animation:cvBadgeIn 220ms ease both;overflow:hidden}
@keyframes cvBadgeIn{from{opacity:0;transform:translateY(-4px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cvSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.cv-bal-roll .ri-digit__cell{font-size:11px}
.cv-bal-roll .ri-punct{font-size:11px}
.cv-bal-roll .ri-digit::before,.cv-bal-roll .ri-digit::after{display:none}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.cv-notch{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:1200;display:flex;align-items:center;gap:3px;padding:5px 7px;border-radius:26px;background:#0b0b12;border:1px solid rgba(255,255,255,.06);transform-origin:top center;transition:transform 320ms cubic-bezier(.22,1,.36,1),padding 320ms cubic-bezier(.22,1,.36,1),opacity 280ms ease,border-color 280ms ease,box-shadow 320ms cubic-bezier(.22,1,.36,1),border-radius 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore{transform:translateX(-50%) scale(.86);padding:3px 5px;border-radius:22px;opacity:.76;border-color:rgba(255,255,255,.035);box-shadow:0 4px 18px rgba(0,0,0,.32)}
.cv-notch--explore:hover{transform:translateX(-50%) scale(1);padding:5px 7px;border-radius:26px;opacity:1;border-color:rgba(255,255,255,.08);box-shadow:0 10px 36px rgba(0,0,0,.48),0 0 0 1px rgba(255,255,255,.04)}
.cv-notch-inner{position:relative;display:flex;align-items:center;gap:2px;min-height:36px;transition:min-height 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore .cv-notch-inner{min-height:28px}
.cv-notch--explore:hover .cv-notch-inner{min-height:36px}
.cv-pill{position:absolute;top:0;height:100%;border-radius:22px;background:rgba(255,255,255,.08);box-shadow:0 1px 8px rgba(255,255,255,.04);transition:left 400ms cubic-bezier(.4,1.3,.5,1),width 400ms cubic-bezier(.4,1.3,.5,1)}
.cv-pill--wobble{animation:cvWobble 600ms cubic-bezier(.2,1,.2,1)}
@keyframes cvWobble{0%{border-radius:18px}15%{border-radius:18px 14px 20px 16px;transform:scaleX(1.08) scaleY(.94)}30%{border-radius:16px 20px 14px 18px;transform:scaleX(.95) scaleY(1.06)}50%{border-radius:20px 16px 18px 14px;transform:scaleX(1.04) scaleY(.97)}70%{border-radius:17px 19px 17px 19px;transform:scaleX(.98) scaleY(1.02)}100%{border-radius:18px;transform:scaleX(1) scaleY(1)}}
.cv-tab{position:relative;z-index:1;padding:7px 28px;border-radius:22px;border:none;background:transparent;color:rgba(255,255,255,.3);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;font-weight:600;letter-spacing:.04em;cursor:pointer;transition:color 250ms,padding 320ms cubic-bezier(.22,1,.36,1),font-size 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore .cv-tab{padding:4px 18px;font-size:11px;color:rgba(255,255,255,.24)}
.cv-notch--explore:hover .cv-tab{color:rgba(255,255,255,.3)}
.cv-notch--explore:hover .cv-tab--active{color:rgba(255,255,255,.88)}
.cv-tab:hover{color:rgba(255,255,255,.55)}
.cv-tab--active{color:rgba(255,255,255,.88)}
.cv-tape{position:fixed;left:0;right:0;bottom:0;height:30px;display:flex;align-items:center;overflow:hidden;background:rgba(10,10,16,.92);backdrop-filter:blur(10px);border-top:1px solid rgba(255,255,255,.06);z-index:1150;font-size:11px;font-family:'JetBrains Mono',ui-monospace,monospace}
.cv-tape__group{display:flex;align-items:center;flex-shrink:0;min-width:max-content;animation:cvTapeScroll 70s linear infinite}
.cv-tape:hover .cv-tape__group{animation-play-state:paused}
@keyframes cvTapeScroll{from{transform:translateX(0)}to{transform:translateX(-100%)}}
.cv-tape__item{display:inline-flex;align-items:center;gap:7px;padding:0 18px;height:30px;border:0;border-right:1px solid rgba(255,255,255,.05);background:transparent;color:inherit;font-family:inherit;font-size:inherit;cursor:pointer;white-space:nowrap;transition:background 140ms}
.cv-tape__item:hover{background:rgba(255,255,255,.05)}
.cv-tape__sym{font-weight:700;letter-spacing:.05em;font-size:10px}
.cv-tape__price{color:rgba(255,255,255,.85);font-weight:600}
.cv-tape__chg{font-size:10px;font-weight:600;letter-spacing:.02em}
.cv-tape__chg--up{color:#4ade80}
.cv-tape__chg--down{color:#f87171}
@media(max-width:520px){.cv-tape__item{padding:0 12px;gap:5px}}
.cv-notif{z-index:2;display:flex;align-items:center;margin-left:-3px;padding:4px;cursor:pointer;transition:padding 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore .cv-notif{padding:2px}
.cv-notch--explore:hover .cv-notif{padding:4px}
.cv-notif-icon{position:relative;width:28px;height:28px;border-radius:50%;background:rgba(110,200,160,.12);display:grid;place-items:center;flex-shrink:0;transition:background 200ms,width 320ms cubic-bezier(.22,1,.36,1),height 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore .cv-notif-icon{width:22px;height:22px}
.cv-notch--explore:hover .cv-notif-icon{width:28px;height:28px}
.cv-notif-icon svg{width:15px;height:15px;color:rgba(110,200,160,.7);transition:width 320ms cubic-bezier(.22,1,.36,1),height 320ms cubic-bezier(.22,1,.36,1)}
.cv-notch--explore .cv-notif-icon svg{width:12px;height:12px}
.cv-notch--explore:hover .cv-notif-icon svg{width:15px;height:15px}
.cv-notif-dot{position:absolute;top:0;right:0;width:9px;height:9px;border-radius:50%;background:#6ec8a0;box-shadow:0 0 6px rgba(110,200,160,.6);animation:cvPulse 2s ease infinite}
.cv-notif-dot--count{width:13px;height:13px;top:-2px;right:-3px;background:#6ec8a0;box-shadow:0 0 6px rgba(110,200,160,.6),0 0 12px rgba(110,200,160,.25);display:grid;place-items:center;font-size:8px;line-height:1;color:#080810;font-weight:700;font-family:inherit;animation:cvCountDrop 500ms cubic-bezier(.22,1,.36,1) forwards;overflow:visible}
.cv-notif-dot--count::before{content:'';position:absolute;inset:-3px;border-radius:50%;border:1.5px solid rgba(110,200,160,.5);animation:cvCountRipple 600ms cubic-bezier(.22,1,.36,1) forwards;pointer-events:none}
@keyframes cvPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}
@keyframes cvPulseGlow{0%,100%{box-shadow:0 0 6px rgba(110,200,160,.6),0 0 12px rgba(110,200,160,.25)}50%{box-shadow:0 0 10px rgba(110,200,160,.8),0 0 18px rgba(110,200,160,.4)}}
@keyframes cvCountDrop{0%{opacity:0;transform:translateY(-8px) scale(.5)}40%{opacity:1;transform:translateY(2px) scale(1.1)}65%{transform:translateY(-1px) scale(.95)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cvCountRipple{0%{transform:scale(.8);opacity:.7}100%{transform:scale(2);opacity:0}}
.cv-notif-expand{position:absolute;top:0;left:0;right:0;bottom:0;z-index:10;display:flex;align-items:center;padding:5px 8px;border-radius:22px;overflow:hidden;pointer-events:none}
.cv-notif-expand::before{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,#08080e 50%,#0a0f0d);opacity:0}
.cv-notif-expand::after{content:'';position:absolute;top:50%;width:8px;height:8px;border-radius:50%;background:rgba(110,200,160,.45);box-shadow:0 0 10px rgba(110,200,160,.35),0 0 20px rgba(110,200,160,.12);transform:translateY(-50%);right:14px;opacity:0;visibility:hidden;z-index:1}
.cv-notif:hover .cv-notif-expand{pointer-events:auto}
.cv-notif:hover .cv-notif-expand::before{opacity:1;transition:opacity 120ms}
.cv-notif:hover .cv-notif-expand::after{visibility:visible;animation:cvPip 380ms cubic-bezier(.22,.68,.36,1) forwards}
.cv-notif-expand>*{position:relative;z-index:2;opacity:0;transform:translateX(4px)}
.cv-notif:hover .cv-notif-expand>:nth-child(1){opacity:1;transform:translateX(0);transition:opacity 180ms 140ms,transform 250ms 140ms cubic-bezier(.22,1,.36,1)}
.cv-notif:hover .cv-notif-expand>:nth-child(2){opacity:1;transform:translateX(0);transition:opacity 180ms 200ms,transform 250ms 200ms cubic-bezier(.22,1,.36,1)}
.cv-notif:hover .cv-notif-expand>:nth-child(3){opacity:1;transform:translateX(0);transition:opacity 180ms 260ms,transform 250ms 260ms cubic-bezier(.22,1,.36,1)}
@keyframes cvPip{0%{right:14px;opacity:.9;transform:translateY(-50%) scale(1)}50%{opacity:.5;transform:translateY(-50%) scale(1.8)}100%{right:calc(100% - 14px);opacity:0;transform:translateY(-50%) scale(.3)}}
.cv-notif-expand-icon{position:relative;width:28px;height:28px;border-radius:50%;background:rgba(110,200,160,.15);display:grid;place-items:center;flex-shrink:0;overflow:visible}
.cv-notif-expand-icon svg{width:15px;height:15px;color:rgba(110,200,160,.7)}
.cv-notif-marquee{flex:1;min-width:0;overflow:hidden;display:flex;align-items:center;margin-left:10px;-webkit-mask-image:linear-gradient(90deg,#000 0%,#000 calc(100% - 8px),transparent);mask-image:linear-gradient(90deg,#000 0%,#000 calc(100% - 8px),transparent)}
.cv-notif-marquee-inner{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;font-weight:600;letter-spacing:.02em}
.cv-notif:hover .cv-notif-marquee-inner{animation:cvMarquee 3.75s ease-in-out infinite 1.1s}
.cv-notif-label{color:rgba(110,200,160,.7)}
.cv-notif-sep{color:rgba(255,255,255,.12)}
.cv-notif-amt{color:rgba(255,255,255,.45)}
.cv-notif-time{color:rgba(255,255,255,.25);font-variant-numeric:tabular-nums}
@keyframes cvMarquee{0%,15%{transform:translateX(0)}50%,70%{transform:translateX(var(--cv-marquee-x,0px))}100%{transform:translateX(0)}}
.cv-notif-dismiss{position:relative;z-index:2;flex-shrink:0;margin-left:8px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(200,80,80,.15);color:rgba(255,255,255,.4);font-size:9px;line-height:1;cursor:pointer;padding:0;font-family:inherit;display:grid;place-items:center;transition:background 120ms,color 120ms}
.cv-notif-dismiss:hover{background:rgba(200,80,80,.35);color:rgba(255,255,255,.8)}
.cv-notif-dismiss-all{position:absolute;top:-1px;right:-1px;min-width:13px;height:13px;border-radius:7px;border:none;background:rgba(110,200,160,.95);color:rgba(8,8,16,.7);font-size:7.5px;font-weight:700;font-family:inherit;cursor:pointer;display:grid;place-items:center;padding:0 3px;z-index:4;transition:background 120ms,color 120ms;overflow:hidden;animation:cvCountDrop 500ms cubic-bezier(.22,1,.36,1) forwards}
.cv-notif-dismiss-all::after{content:'';position:absolute;left:50%;top:50%;width:0;height:1px;background:rgba(200,80,80,.9);transform:translate(-50%,-50%) rotate(-45deg);transition:width 150ms cubic-bezier(.22,1,.36,1);border-radius:1px}
.cv-notif-dismiss-all:hover{background:rgba(200,80,80,.3);color:rgba(255,255,255,.7)}
.cv-notif-dismiss-all:hover::after{width:120%}
.cv-notch:has(.cv-notif--entering) .cv-tab{color:rgba(255,255,255,.08);transition:color 60ms}
.cv-notch:has(.cv-notif--entering){animation:cvNotchWobble 500ms cubic-bezier(.22,1,.36,1) 200ms}
.cv-notch--wobble-settle{animation:cvNotchSettle 500ms cubic-bezier(.34,1.56,.64,1)}
.cv-notif--exiting{animation:cvNotifExit var(--cv-notif-exit-ms,380ms) cubic-bezier(.4,0,.2,1) forwards;overflow:hidden;min-width:0;pointer-events:none}
.cv-notif--exiting .cv-notif-dot{animation:cvExitFade var(--cv-notif-exit-fade-ms,80ms) ease forwards}
.cv-notif--hovered.cv-notif--exiting{--cv-notif-exit-ms:165ms;--cv-notif-exit-fade-ms:50ms}
.cv-notif--entering{animation:cvFlipIn var(--cv-notif-enter-ms,420ms) cubic-bezier(.22,1,.36,1) var(--cv-notif-enter-delay,100ms) both,cvNotifGrow var(--cv-notif-grow-ms,300ms) cubic-bezier(.22,1,.36,1) both;z-index:3;overflow:hidden;min-width:0}
.cv-notif--entering .cv-notif-icon{animation:cvFlipInIcon var(--cv-notif-icon-ms,450ms) cubic-bezier(.22,1,.36,1) var(--cv-notif-enter-delay,100ms) both}
.cv-notif--hovered.cv-notif--entering{--cv-notif-enter-ms:190ms;--cv-notif-enter-delay:25ms;--cv-notif-grow-ms:140ms;--cv-notif-icon-ms:190ms}
.cv-notif--entering.cv-notif--deposit .cv-notif-icon svg path{stroke-dasharray:20;stroke-dashoffset:20;animation:cvCheckDraw var(--cv-notif-check-ms,350ms) ease var(--cv-notif-check-delay,300ms) forwards}
.cv-notif--hovered.cv-notif--entering.cv-notif--deposit .cv-notif-icon svg path{--cv-notif-check-ms:160ms;--cv-notif-check-delay:120ms}
@keyframes cvCheckDraw{to{stroke-dashoffset:0}}
.cv-notif--entering .cv-notif-dot{opacity:0;animation:cvDotFadeIn var(--cv-notif-dot-ms,200ms) ease var(--cv-notif-dot-delay,400ms) forwards}
.cv-notif--hovered.cv-notif--entering .cv-notif-dot{--cv-notif-dot-ms:100ms;--cv-notif-dot-delay:140ms}
@keyframes cvDotFadeIn{to{opacity:1}}
.cv-notif--entering:not(.cv-notif--deposit) .cv-notif-icon svg path{animation:cvArrowDrop var(--cv-notif-arrow-ms,350ms) cubic-bezier(.22,1,.36,1) var(--cv-notif-arrow-delay,250ms) both}
.cv-notif--hovered.cv-notif--entering:not(.cv-notif--deposit) .cv-notif-icon svg path{--cv-notif-arrow-ms:150ms;--cv-notif-arrow-delay:90ms}
@keyframes cvArrowDrop{0%{opacity:0;transform:translateY(-4px)}70%{opacity:1;transform:translateY(1px)}100%{opacity:1;transform:translateY(0)}}
.cv-notif--entering:hover:not(.cv-notif--hovered) .cv-notif-expand{pointer-events:none}
.cv-notif--entering:hover:not(.cv-notif--hovered) .cv-notif-expand::before{opacity:0;transition:none}
.cv-notif--entering:hover:not(.cv-notif--hovered) .cv-notif-expand::after{visibility:hidden;animation:none}
.cv-notif.cv-notif--entering:hover:not(.cv-notif--hovered) .cv-notif-expand>*{opacity:0;transform:translateX(4px);transition:opacity 80ms ease-out}
.cv-notif--entering:hover:not(.cv-notif--hovered) .cv-notif-marquee-inner{animation:none}
.cv-notif--hovered.cv-notif--entering .cv-notif-expand{pointer-events:auto}
.cv-notif--hovered.cv-notif--entering .cv-notif-expand::before{opacity:1;transition:opacity 60ms}
.cv-notif--hovered.cv-notif--entering .cv-notif-expand::after{visibility:visible;animation:cvPip 220ms cubic-bezier(.22,.68,.36,1) forwards}
.cv-notif--hovered.cv-notif--entering .cv-notif-expand>*{opacity:1;transform:translateX(0);transition:opacity 100ms ease,transform 120ms cubic-bezier(.22,1,.36,1)}
.cv-notif--hovered.cv-notif--entering .cv-notif-marquee-inner{animation:cvMarquee 3.75s ease-in-out infinite .45s}
.cv-notif--hovered.cv-notif--entering .cv-notif-icon{visibility:hidden}
.cv-notif--hovered.cv-notif--exiting .cv-notif-expand::before{opacity:1;transition:opacity 40ms}
.cv-notif--hovered.cv-notif--exiting .cv-notif-expand>*{opacity:1;transform:translateX(0);transition:opacity 60ms ease,transform 80ms ease}
.cv-notif--deposit .cv-notif-dot{animation:none}
.cv-notif-detail{color:rgba(255,255,255,.3);font-size:10px;font-style:italic}
.cv-notif--failed .cv-notif-expand::after,.cv-notif--rejected .cv-notif-expand::after,.cv-notif--error .cv-notif-expand::after{background:rgba(220,90,90,.45);box-shadow:0 0 10px rgba(220,90,90,.35),0 0 20px rgba(220,90,90,.12)}
.cv-notif--entering.cv-notif--failed .cv-notif-icon svg,.cv-notif--entering.cv-notif--rejected .cv-notif-icon svg,.cv-notif--entering.cv-notif--error .cv-notif-icon svg{animation:cvShake 400ms cubic-bezier(.22,1,.36,1) 250ms both}
@keyframes cvShake{0%{transform:translateX(0)}20%{transform:translateX(-2px)}40%{transform:translateX(2px)}60%{transform:translateX(-1px)}80%{transform:translateX(1px)}100%{transform:translateX(0)}}
@keyframes cvPageOutLeft{from{transform:translateX(0);opacity:1}to{transform:translateX(-20px);opacity:0}}
@keyframes cvPageOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(20px);opacity:0}}
@keyframes cvPageInLeft{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes cvPageInRight{from{transform:translateX(-20px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes cvPageOutLeftH{from{transform:translateX(0);opacity:1}to{transform:translateX(-30px);opacity:0}}
@keyframes cvPageOutRightH{from{transform:translateX(0);opacity:1}to{transform:translateX(30px);opacity:0}}
@keyframes cvPageInLeftH{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes cvPageInRightH{from{transform:translateX(-30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes cvFlipIn{0%{opacity:0;transform:perspective(400px) rotateX(-70deg) translateY(-4px)}35%{opacity:1}65%{transform:perspective(400px) rotateX(6deg) translateY(1px)}85%{transform:perspective(400px) rotateX(-2deg) translateY(0)}100%{opacity:1;transform:perspective(400px) rotateX(0) translateY(0)}}
@keyframes cvFlipInIcon{0%{opacity:0;transform:perspective(300px) rotateX(-70deg) scale(.8)}30%{opacity:1}60%{transform:perspective(300px) rotateX(8deg) scale(1.05)}80%{transform:perspective(300px) rotateX(-3deg) scale(.98)}100%{opacity:1;transform:perspective(300px) rotateX(0) scale(1)}}
@keyframes cvNotifGrow{0%{max-width:0;margin-left:0}100%{max-width:40px;margin-left:-3px}}
@keyframes cvNotifExit{0%{opacity:1;transform:scale(1);max-width:36px;padding:4px;margin-left:-3px}40%{opacity:0;transform:scale(.75);max-width:36px;padding:4px;margin-left:-3px}100%{opacity:0;transform:scale(.75);max-width:0;padding:0;margin-left:0}}
@keyframes cvExitFade{to{opacity:0;transform:scale(.5)}}
@keyframes cvNotchWobble{0%{scale:1 1}25%{scale:1.018 .985}50%{scale:.993 1.008}75%{scale:1.004 .997}100%{scale:1 1}}
@keyframes cvNotchSettle{0%{scale:1.012 .988}40%{scale:.994 1.006}70%{scale:1.003 .998}100%{scale:1 1}}
.cv-coin-glyph{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;text-align:center}
.cv-coin-glyph--bnb{transform:translateY(1px)}
.cv-bal-amt{background:none;border:0;cursor:pointer;font-family:inherit;padding:0 0 1px;color:rgba(255,255,255,.42);text-decoration:none;border-bottom:1px dotted rgba(255,255,255,.22);display:inline-flex;align-items:baseline;transition:color 120ms,border-color 120ms;line-height:1}
.cv-bal-amt:hover{color:rgba(255,255,255,.78);border-bottom-color:rgba(255,255,255,.45)}
.cv-rate-amt{background:none;border:0;border-bottom:1px dotted rgba(255,255,255,.22);cursor:pointer;font-family:inherit;padding:0 0 1px;color:inherit;display:inline-flex;align-items:center;transition:color 120ms,border-color 120ms;line-height:1}
.cv-rate-amt:hover:not(:disabled){border-bottom-color:rgba(255,255,255,.45)}
.cv-rate-amt:disabled{cursor:default;opacity:1;border-bottom-color:transparent}
.cv-convert-top{position:relative}
.cv-rate-compact-wrap{max-height:48px;opacity:1;overflow:hidden;margin-bottom:14px;transition:max-height 420ms cubic-bezier(.22,.8,.36,1),opacity 280ms ease,margin-bottom 420ms cubic-bezier(.22,.8,.36,1)}
.cv-rate-compact-wrap--gone{max-height:0;opacity:0;margin-bottom:0;pointer-events:none}
.cv-rate-compact{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}
.cv-rate-compact--leaving .cv-rate-eq,.cv-rate-compact--leaving .cv-rate-spend,.cv-rate-compact--leaving .cv-rate-quote{opacity:0;transform:translateY(-4px);transition:opacity 180ms ease,transform 220ms ease}
.cv-rate-compact--leaving .cv-rate-buy-name,.cv-rate-compact--leaving .cv-rate-amt{opacity:0;transition:opacity 140ms ease 40ms}
.cv-pair-chart-outer{display:grid;grid-template-rows:0fr;margin:-4px -20px 0;max-width:500px;width:calc(100% + 40px);transition:grid-template-rows 440ms cubic-bezier(.22,.8,.36,1),margin-bottom 440ms cubic-bezier(.22,.8,.36,1),opacity 280ms ease}
.cv-pair-chart-inner{overflow:hidden;min-height:0}
.cv-pair-chart-outer--open{grid-template-rows:1fr;margin-bottom:32px}
.cv-mkt-panel{position:relative;padding:15px 18px 16px;border-radius:16px;background:rgba(255,255,255,.024);border:1px solid rgba(255,255,255,.07);box-shadow:0 10px 28px rgba(0,0,0,.22);will-change:transform,opacity}
.cv-mkt-panel--top .cv-mkt-spark{height:148px}
.cv-mkt-panel--loading .cv-mkt-head,.cv-mkt-panel--loading .cv-mkt-chart-wrap{pointer-events:none}
.cv-mkt-sk-chart{width:100%;height:148px;display:block;border-radius:8px}
.cv-convert-cards{transition:transform 440ms cubic-bezier(.22,.8,.36,1)}
.cv-convert-cards--chart{transform:translateY(4px)}
.cv-pair-close{position:absolute;top:10px;right:10px;z-index:3;width:22px;height:22px;border-radius:6px;border:none;background:rgba(255,255,255,.04);color:rgba(255,255,255,.34);cursor:pointer;font-family:inherit;font-size:14px;line-height:1;display:grid;place-items:center;padding:0;transition:color 120ms,background 120ms}
.cv-pair-close:hover{color:rgba(255,255,255,.82);background:rgba(255,255,255,.08)}
.cv-mkt-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;padding-right:26px}
.cv-mkt-icon{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:14px;font-weight:700;flex-shrink:0}
.cv-mkt-name{font-size:12px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:.02em;line-height:1.2}
.cv-mkt-ticker{font-size:10px;color:rgba(255,255,255,.3);font-weight:500;margin-left:6px;letter-spacing:.06em}
.cv-mkt-sub{font-size:9px;color:rgba(255,255,255,.25);letter-spacing:.04em;margin-top:2px;text-transform:uppercase;font-weight:600}
.cv-mkt-price-row{display:flex;align-items:baseline;gap:8px;margin-left:auto}
.cv-mkt-price{font-size:17px;font-weight:700;color:rgba(255,255,255,.92);font-variant-numeric:tabular-nums;letter-spacing:-.2px}
.cv-mkt-change{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;white-space:nowrap}
.cv-mkt-change--up{color:#4ade80;background:rgba(74,222,128,.1)}
.cv-mkt-change--down{color:#f87171;background:rgba(248,113,113,.1)}
.cv-mkt-change--flat{color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}
.cv-mkt-chart-wrap{position:relative;margin-bottom:0}
.cv-mkt-spark{width:100%;height:150px;display:block;cursor:crosshair}
.cv-mkt-tooltip{position:absolute;top:4px;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#1e1e2e;border:1px solid rgba(255,255,255,.12);border-radius:7px;font-family:inherit;font-size:10px;font-weight:600;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.88);pointer-events:none;white-space:nowrap;z-index:5}
.cv-mkt-tooltip-sep{color:rgba(255,255,255,.18)}
.cv-mkt-tooltip-age{color:rgba(255,255,255,.4);font-weight:500}
.cv-mkt-all-link{display:block;margin:0 auto;background:none;border:none;cursor:pointer;font-family:inherit;font-size:10px;color:rgba(255,255,255,.32);padding:5px 10px;border-radius:6px;letter-spacing:.04em;transition:color 120ms,background 120ms}
.cv-mkt-all-link:hover{color:rgba(255,255,255,.8);background:rgba(255,255,255,.04)}

.cv-shell{width:100%;max-width:460px;position:relative}
.cv-page-markets{max-width:min(1100px,100%)!important;width:100%!important}
.cv-page-wide{max-width:460px;width:100%;margin-left:auto;margin-right:auto}
@media(max-width:520px){
  .cv-shell{padding-left:max(0px,env(safe-area-inset-left));padding-right:max(0px,env(safe-area-inset-right))}
  .cv-pair-chart-outer{width:calc(100% + 24px);max-width:none;margin-left:-12px;margin-right:-12px}
  .cv-modal-overlay{padding-top:max(16px,calc(env(safe-area-inset-top,0px) + 8px));padding-bottom:max(16px,calc(env(safe-area-inset-bottom,0px) + 8px));padding-left:max(12px,env(safe-area-inset-left));padding-right:max(12px,env(safe-area-inset-right));align-items:center}
  .cv-modal{max-height:min(92dvh,calc(100dvh - env(safe-area-inset-top,0px) - 24px));overflow-y:auto;-webkit-overflow-scrolling:touch}
  .cv-notch{top:max(8px,env(safe-area-inset-top,0px));max-width:calc(100vw - 20px)}
  .cv-tab{min-height:44px;padding:10px 22px;display:inline-flex;align-items:center;justify-content:center}
  .cv-notif-dismiss{width:32px;height:32px;font-size:11px}
  .ri-clear,.ri-step{min-width:40px;min-height:40px}
  .cv-coin-dropdown{max-height:min(280px,50dvh)!important;-webkit-overflow-scrolling:touch}
}
@media(max-width:380px){
  .cv-tab{padding:10px 14px;font-size:12px}
}
/* Ultra-narrow (target: usable down to ~239px). Shrink the big amount input font
   so long values fit without colliding with the steppers (the steppers keep their
   reserved right padding — only the digits get smaller). */
@media(max-width:300px){
  .ri-input,.ri-display{font-size:18px;line-height:18px;padding-left:12px}
  .ri-fall-layer{font-size:18px;left:12px}
  .ri-suffix{font-size:12px}
  /* Notch nav: shrink tab padding so Convert + Wallet + badge fit */
  .cv-tab{padding:9px 10px;font-size:11px}
  /* Modal is a flex child — let it shrink to the viewport; tighter padding */
  .cv-modal{min-width:0;padding:18px}
  /* Review/Success rows: let long label/value pairs wrap instead of overflowing */
  .cv-row{flex-wrap:wrap;gap:2px 10px}
}
`;

function injectCSS() {
  if (typeof document === "undefined" || document.getElementById(CSS_ID)) return;
  const s = document.createElement("style");
  s.id = CSS_ID;
  s.textContent = STYLE_CSS;
  document.head.appendChild(s);
}

function formatBalDisplay(value, decimals) {
  return fmtBal(Number(value), countDecimals(decimals));
}

// ═══════════════════════════════════════════════════════════════════
// RollingBalance — read-only animated balance display
// ═══════════════════════════════════════════════════════════════════
function RollingBalance({ value, decimals, height = 14, style = {} }) {
  const formatted = formatBalDisplay(value, decimals);
  const idC = useRef(1000);
  const mkId = useCallback(() => String(idC.current++), []);
  const [tokens, setTokens] = useState(() =>
    formatted.split("").map(ch => ({ id: mkId(), ch }))
  );
  const [anim, setAnim] = useState({ direction: null, id: 0, affectedIds: new Set() });
  const prevStr = useRef(formatted);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;

  useEffect(() => {
    const next = formatBalDisplay(value, decimals);
    const prev = prevStr.current;
    if (next === prev) return;
    const pt = tokensRef.current;
    const ps = pt.map(t => t.ch).join("");
    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: next, makeId: mkId, caretHint: next.length });
    const dir = inferDir(prev.replace(/,/g, ""), next.replace(/,/g, ""));
    setAnim(a => ({ direction: dir, id: a.id + 1, affectedIds: upd.affectedIds }));
    setTokens(upd.tokens);
    prevStr.current = next;
  }, [value, decimals]);

  return (
    <span className="cv-bal-roll" style={{ display: "inline-flex", alignItems: "baseline", overflow: "hidden", height, ...style }}>
      {tokens.map(t => {
        const af = anim.affectedIds.has(t.id);
        return /\d/.test(t.ch)
          ? <DigitRoll key={t.id} digit={Number(t.ch)} height={height}
              animDirection={af ? anim.direction : null}
              animTriggerId={af ? anim.id : 0} />
          : <Punct key={t.id} ch={t.ch} height={height}
              animate={af} direction={af ? anim.direction : null} />;
      })}
    </span>
  );
}

// Convert card layout — buy elevated, spend recessed
const CV_CARD_BASE = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,.06)",
  position: "relative",
  background: "rgba(255,255,255,.03)",
  overflow: "visible",
  transition: "transform 320ms cubic-bezier(.2,.8,.2,1), opacity 280ms ease, box-shadow 320ms ease, border-color 200ms ease",
};

function getConvertCardStyles(buyColor, swapPhase) {
  const buyFloatT = swapPhase === "out" ? "translateY(1px) scale(0.985)" : "translateY(-5px) scale(1.028)";
  const spendFloatT = swapPhase === "out" ? "translateY(-1px) scale(1.01)" : "translateY(3px) scale(0.992)";
  const swapOpacity = swapPhase === "out" ? 0.94 : 1;
  return {
    buy: {
      ...CV_CARD_BASE,
      zIndex: 12,
      padding: "14px 16px 22px",
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
      borderColor: `${buyColor}42`,
      background: `linear-gradient(165deg, ${buyColor}1a 0%, rgba(255,255,255,.045) 52%)`,
      boxShadow: `0 14px 36px rgba(0,0,0,.38), 0 6px 16px ${buyColor}14, inset 0 1px 0 ${buyColor}30`,
      transform: buyFloatT,
      opacity: swapOpacity,
    },
    spend: {
      ...CV_CARD_BASE,
      zIndex: 2,
      padding: "20px 14px 10px",
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      borderColor: "rgba(255,255,255,.05)",
      background: "rgba(255,255,255,.02)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.04)",
      transform: spendFloatT,
      opacity: swapOpacity,
    },
  };
}

function ConvertBalRow({ balance, decimals, onMax, labelMuted = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, flexShrink: 0 }}>
      <span style={{ color: labelMuted ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.3)" }}>Bal:</span>
      <button type="button" tabIndex={-1} className="cv-bal-amt" onClick={onMax} title="Use full balance">
        <RollingBalance value={balance} decimals={decimals} height={14} />
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// RollingAmountInput
// ═══════════════════════════════════════════════════════════════════
function RollingAmountInput({
  value: cv, onChange: onVC, balance = 0, step = "0.0001", max = 100_000_000,
  placeholder = "Input Amount", suffix = "", showStepper = true, ariaLabel = "",
  fadeColor = "rgba(18,18,24,1)", textColor = "rgba(255,255,255,.92)",
  warnExceedsBalance = false, displayAnim = null, onEnter = null, onClear = null,
  inputRef: externalInputRef = null, loading = false,
}) {
  useEffect(injectCSS, []);

  const SN = Number(step);
  const sD = countDecimals(step);
  const inputRef = useRef(null);

  // Expose input element to parent via externalInputRef
  useEffect(() => {
    if (externalInputRef) externalInputRef.current = inputRef.current;
  });
  const pendCaretRef = useRef(null);
  const selRef = useRef(null);
  const lastCaretRef = useRef(0);
  const selectAllRef = useRef(false);

  const [tokens, setTokens] = useState([]);
  const pv = useMemo(() => tokens.map(t => t.ch).join(""), [tokens]);
  const dv = useMemo(() => addCommas(pv), [pv]);
  const tRef = useLatest(tokens);
  const vRef = useLatest(pv);
  const psRef = useLatest(pv);
  const lastE = useRef(cv);
  const idC = useRef(1000);
  const mkId = useCallback(() => String(idC.current++), []);

  // Sync from external value prop
  useEffect(() => {
    if (cv == null) return;
    const c = String(cv);
    if (c === pv || c === lastE.current) return;
    const san = sanitize(c, sD);
    if (san === pv) return;
    const pt = tRef.current;
    const ps = pt.map(t => t.ch).join("");

    if (san === "" && pt.length > 0) {
      addFall(pt.map((t, i) => ({ ...t, index: i })), "clear-fast", { withSuffix: true });
      setCleared(true);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => { setCleared(false); setPhKey(k => k + 1); }, animMs(pt.length * 14 + 180));
      setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() }));
      setTokens([]);
      pendCaretRef.current = 0;
      lastE.current = c;
      return;
    }

    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: san, makeId: mkId, caretHint: san.length });
    const dir = ps === "" && san === "" ? null : inferDir(ps, san);
    setAnim(a => ({ direction: dir, id: a.id + 1, cycles: 0, affectedIds: upd.affectedIds }));
    setTokens(upd.tokens);
    lastE.current = c;
  }, [cv]);

  // Emit changes to parent
  useEffect(() => {
    if (onVC && pv !== lastE.current) { lastE.current = pv; onVC(pv); }
  }, [pv, onVC]);

  const [anim, setAnim] = useState({ direction: null, id: 0, cycles: 0, affectedIds: new Set() });
  const [falling, setFalling] = useState([]);

  // Shift animation state
  const [shAnim, setShAnim] = useState({ movedIds: new Set(), dir: "right", tick: 0 });
  const shT = useRef(null);
  const trigSh = useCallback((ids, dir) => {
    if (shT.current) clearTimeout(shT.current);
    setShAnim({ movedIds: ids, dir, tick: Date.now() });
    shT.current = setTimeout(() => setShAnim(s => ({ ...s, movedIds: new Set() })), animMs(160));
  }, []);
  useEffect(() => () => { if (shT.current) clearTimeout(shT.current); }, []);

  // Hint / warning state
  const [hint, setHint] = useState(null);
  const hT = useRef(null);
  const [bumpId, setBumpId] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [phKey, setPhKey] = useState(0);
  const clearTimerRef = useRef(null);
  const trigH = useCallback(m => {
    setBumpId(x => x + 1);
    setHint(m);
    if (hT.current) clearTimeout(hT.current);
    hT.current = setTimeout(() => setHint(null), animMs(1400));
  }, []);
  useEffect(() => () => { if (hT.current) clearTimeout(hT.current); if (clearTimerRef.current) clearTimeout(clearTimerRef.current); }, []);

  const exceeds = useMemo(() => {
    if (!warnExceedsBalance || !balance) return false;
    const n = Number(pv);
    return Number.isFinite(n) && n > balance;
  }, [pv, balance, warnExceedsBalance]);

  // Focus & caret helpers
  const focI = useCallback(() => inputRef.current?.focus(), []);

  const setFC = useCallback(pp => {
    requestAnimationFrame(() => {
      focI();
      const el = inputRef.current;
      if (!el) return;
      const fp = plainToFmt(pp, vRef.current);
      try { el.setSelectionRange(fp, fp); } catch {}
    });
  }, [focI, vRef]);

  const capSel = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const fs = el.selectionStart ?? 0;
    const fe = el.selectionEnd ?? fs;
    const fmt = el.value;
    if (fs === fe) { lastCaretRef.current = fs; selectAllRef.current = false; }
    let dir = el.selectionDirection || "none";
    if ((dir === "none" || selectAllRef.current) && fe > fs) {
      const mid = fmt.length / 2;
      dir = lastCaretRef.current > mid ? "backward" : "forward";
    }
    selRef.current = { start: fmtToPlain(fs, fmt), end: fmtToPlain(fe, fmt), prevStr: psRef.current, direction: dir };
  }, [psRef]);

  const suffixRef = useLatest(suffix);

  // Falling digit animation
  const addFall = useCallback((rem, mode, { withSuffix = false, selDirection = "none" } = {}) => {
    if (!rem.length && !withSuffix) return;
    const cv2 = vRef.current;
    const dp = cv2.indexOf(".");
    const il = dp === -1 ? cv2.length : dp;
    const now = Date.now();
    const dirSuffix = selDirection === "backward" ? "-bw" : "";
    const items = [...rem];

    if (withSuffix && suffixRef.current) {
      const lastD = rem.length > 0
        ? tokIdxToDisplay((rem[rem.length - 1].index ?? rem.length - 1), il) + 1
        : 0;
      items.push({ id: 'suf-fall', ch: suffixRef.current, left: `${lastD + 0.32}ch`, isSuffix: true });
    }

    const totalItems = items.length;
    setFalling(c => [...c, ...items.map((t, i) => ({
      key: `${t.id}-${now}-${i}-${mode}`,
      ch: t.ch,
      left: t.left ?? `${tokIdxToDisplay(t.index ?? 0, il)}ch`,
      mode,
      delay: mode === "clear" ? i * 28
        : mode === "clear-fast" ? i * 14
        : mode === "sweep" ? (selDirection === "backward" ? (totalItems - 1 - i) * 22 : i * 22)
        : mode === "overflow" ? 30
        : 0,
      dirSuffix,
      isSuffix: !!t.isSuffix,
    }))]);
  }, [vRef, suffixRef]);

  const applyStr = useCallback(({ nextStr, cycles, direction = null, caretPos = null }) => {
    const ps = psRef.current;
    const pt = tRef.current;
    const pos = caretPos ?? nextStr.length;
    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr, makeId: mkId, caretHint: pos });
    setAnim(a => ({
      direction: direction || (ps === nextStr ? null : inferDir(ps, nextStr)),
      id: a.id + 1, cycles, affectedIds: upd.affectedIds,
    }));
    setTokens(upd.tokens);
    setFC(pos);
  }, [mkId, setFC, tRef, psRef]);

  const placeholderRef = useLatest(placeholder);

  const clear = useCallback(({ withFall = false, fast = false } = {}) => {
    const ct = tRef.current;
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    const mode = fast ? "clear-fast" : "clear";
    const stagger = fast ? 14 : 28;
    const buffer = fast ? 180 : 300;

    if (withFall) {
      if (ct.length) {
        // Has value — fall digits + suffix out, then replay placeholder entrance
        addFall(ct.map((t, i) => ({ ...t, index: i })), mode, { withSuffix: true });
        setCleared(true);
        const fallDuration = ct.length * stagger + buffer;
        clearTimerRef.current = setTimeout(() => { setCleared(false); setPhKey(k => k + 1); }, animMs(fallDuration));
      } else {
        // Already at placeholder — animate placeholder chars out, then replay entrance
        const ph = placeholderRef.current;
        const phChars = ph.split("");
        const now = Date.now();
        setFalling(c => [...c, ...phChars.map((ch, i) => ({
          key: `ph-fall-${i}-${now}`,
          ch: ch === " " ? "\u00A0" : ch,
          left: `${i}ch`,
          mode,
          delay: i * stagger,
          dirSuffix: "",
          isSuffix: false,
          isPlaceholder: true,
        }))]);
        setCleared(true);
        clearTimerRef.current = setTimeout(() => { setCleared(false); setPhKey(k => k + 1); }, animMs(phChars.length * stagger + buffer));
      }
    }

    setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() }));
    setTokens([]);
    pendCaretRef.current = 0;
    setFC(0);
  }, [addFall, setFC, tRef, placeholderRef]);

  // Step up/down once
  const adjOnce = useCallback((dir, mult, { cycles = 1 } = {}) => {
    const cur = Number(vRef.current);
    const base = Number.isFinite(cur) ? cur : 0;
    let sb = base;
    if (!isAligned(base, SN)) {
      sb = roundToStep(base, SN, dir === "up" ? "up" : "down");
      trigH(`Snapped to ${step}`);
    }
    let next = sb + (dir === "up" ? 1 : -1) * mult * SN;
    if (!Number.isFinite(next)) next = 0;
    if (next < 0) next = 0;
    if (next > max) next = max;
    const ns = next.toFixed(sD);
    applyStr({ nextStr: ns, direction: dir, cycles, caretPos: ns.length });
  }, [applyStr, trigH, vRef, sD, SN, step, max]);

  // Hold-to-repeat for stepper buttons
  const holdRef = useRef({ timer: null, active: false });
  const supC = useRef(false);

  const stopH = useCallback(() => {
    holdRef.current.active = false;
    if (holdRef.current.timer) { clearTimeout(holdRef.current.timer); holdRef.current.timer = null; }
  }, []);

  useEffect(() => () => stopH(), [stopH]);

  const startH = useCallback((dir, mult) => {
    stopH();
    holdRef.current.active = true;
    adjOnce(dir, mult, { cycles: 1 });
    let iv = 90, ticks = 0;
    const rep = () => {
      if (!holdRef.current.active) return;
      ticks++;
      let sm = mult;
      if (ticks > 120) sm = mult * 1e7;
      else if (ticks > 100) sm = mult * 1e6;
      else if (ticks > 80) sm = mult * 1e5;
      else if (ticks > 60) sm = mult * 1e4;
      else if (ticks > 40) sm = mult * 1e3;
      else if (ticks > 20) sm = mult * 100;
      else if (ticks > 8) sm = mult * 10;
      adjOnce(dir, sm, { cycles: 0 });
      iv = Math.max(30, iv * 0.95);
      holdRef.current.timer = setTimeout(rep, iv);
    };
    holdRef.current.timer = setTimeout(rep, 300);
  }, [adjOnce, stopH]);

  // ── Keyboard handlers ──
  const onKD = e => {
    capSel();
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      selectAllRef.current = true;
    }

    // Handle backspace/delete over commas
    if (e.key === "Backspace" || e.key === "Delete") {
      const el = inputRef.current;
      if (el && el.selectionStart === el.selectionEnd) {
        const fp = el.selectionStart;
        const fmt = el.value;
        const isBS = e.key === "Backspace";
        if (isBS ? (fp > 0 && fmt[fp - 1] === ",") : (fp < fmt.length && fmt[fp] === ",")) {
          e.preventDefault();
          const pp = fmtToPlain(fp, fmt);
          const dp = isBS ? pp - 1 : pp;
          const ps = psRef.current;
          const pt = tRef.current;
          if (dp < 0 || dp >= ps.length) return;
          const ns = sanitize(ps.slice(0, dp) + ps.slice(dp + 1), sD);
          if (ns === ps) return;
          const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId: mkId, caretHint: dp });
          if (upd.removedTokens.length) addFall(upd.removedTokens, "delete-single");
          setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() }));
          setTokens(upd.tokens);
          pendCaretRef.current = dp;
          return;
        }
      }
    }

    if (e.key === "ArrowUp") { e.preventDefault(); if (!e.repeat) startH("up", e.shiftKey ? 10 : 1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (!e.repeat) startH("down", e.shiftKey ? 10 : 1); return; }
    if (e.key === "Escape") { e.preventDefault(); clear({ withFall: true, fast: true }); if (onClear) onClear(); }
    if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); }
  };

  const onKU = e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") stopH(); };

  const onBl = () => {
    stopH();
    const n = Number(vRef.current);
    if (Number.isFinite(n) && n > 0 && !isAligned(n, SN)) {
      const sn = roundToStep(n, SN, "nearest");
      const ss = sn.toFixed(sD);
      const orig = vRef.current;
      applyStr({ nextStr: ss, direction: sn >= n ? "up" : "down", cycles: 0, caretPos: ss.length });
      trigH(`Rounded ${orig} → ${ss} (step: ${step})`);
    }
  };

  const onBI = e => { capSel(); };

  // ── Main input change handler ──
  const hChg = e => {
    if (cleared) setCleared(false);
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    const ps = psRef.current;
    const pt = tRef.current;
    const sSnap = selRef.current;

    // Strip non-numeric except dots
    const rawS = (() => {
      let s = raw.replace(/[^0-9.]/g, "");
      const fd = s.indexOf(".");
      if (fd !== -1) s = s.slice(0, fd + 1) + s.slice(fd + 1).replace(/\./g, "");
      if (s.startsWith(".")) s = "0" + s;
      return s;
    })();

    const ns = sanitize(rawS, sD);

    // Typed to zero — treat as full clear with fall animation
    if (ns === "0" && ps !== "0" && ps !== "") {
      const sd = sSnap?.direction || "none";
      addFall(
        pt.map((t, i) => ({ ...t, index: i })),
        pt.length > 2 ? "sweep" : "delete",
        { withSuffix: true, selDirection: sd },
      );
      setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() }));
      setTokens([]);
      pendCaretRef.current = 0;
      selRef.current = null;
      return;
    }

    // Decimal precision hint
    if ((rawS.indexOf(".") === -1 ? 0 : rawS.length - rawS.indexOf(".") - 1) > sD) {
      trigH(`Min increment is ${step}`);
    }

    // Max value check
    const nn = Number(ns);
    const pn = Number(ps);
    if (Number.isFinite(nn) && nn > max && !(Number.isFinite(pn) && nn < pn)) {
      trigH(`Max is ${max.toLocaleString()}`);
      const el = inputRef.current;
      if (el) {
        const pf = addCommas(ps);
        const pc = fmtToPlain(caret, addCommas(rawS));
        const rc = plainToFmt(Math.min(pc, ps.length), ps);
        el.value = pf;
        try { el.setSelectionRange(rc, rc); } catch {}
      }
      selRef.current = null;
      return;
    }

    const rb = raw.slice(0, caret);
    const bs = sanitize(rb, sD);
    pendCaretRef.current = bs.length;

    // Overflow detection: typed digit pushes last digit off
    if (rawS.length === ps.length + 1 && ns.length === ps.length && pt.length === ps.length && pt.length > 0) {
      const ip = bs.length - 1;
      const ic = rawS[ip];
      if (ic && /[0-9]/.test(ic) && ip >= 0 && ip <= ps.length) {
        const pr = ps.slice(0, ip) + ic + ps.slice(ip);
        if (pr === rawS) {
          const pc = sanitize(pr, sD);
          if (pc === ns && pr.length > ns.length) {
            const nt = { id: mkId(), ch: ic };
            const dr = pt[pt.length - 1];
            const mv = pt.slice(ip, pt.length - 1);
            const ntk = [...pt.slice(0, ip), nt, ...mv];
            if (ntk.map(t => t.ch).join("") === ns) {
              addFall([{ ...dr, index: pt.length - 1 }], "overflow");
              if (mv.length) trigSh(new Set(mv.map(t => t.id)), "right");
              pendCaretRef.current = ip + 1;
              setAnim(a => ({ direction: "up", id: a.id + 1, cycles: 1, affectedIds: new Set([nt.id]) }));
              selRef.current = null;
              setTokens(ntk);
              return;
            }
          }
        }
      }
    }

    const sh = sSnap && sSnap.prevStr === ps && sSnap.end > sSnap.start
      ? { start: sSnap.start, end: sSnap.end }
      : null;

    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId: mkId, caretHint: bs.length, selectionHint: sh });
    selRef.current = null;

    if (ns.length < ps.length && upd.removedTokens.length) {
      const sd = sSnap?.direction || "none";
      addFall(
        upd.removedTokens,
        upd.removedTokens.length === 1 ? "delete-single" : upd.removedTokens.length > 2 ? "sweep" : "delete",
        { withSuffix: !ns, selDirection: sd },
      );
      setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() }));
    } else {
      const isSingle = upd.affectedIds.size === 1 && ns.length >= ps.length && (ns.length - ps.length) <= 1;
      setAnim(a => ({
        direction: ps === ns ? null : isSingle ? "snap" : inferDir(ps, ns),
        id: a.id + 1, cycles: 0, affectedIds: upd.affectedIds,
      }));
    }

    setTokens(upd.tokens);
  };

  // Sync caret position after token update
  useLayoutEffect(() => {
    const pp = pendCaretRef.current;
    if (pp == null) return;
    pendCaretRef.current = null;
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    const fp = plainToFmt(pp, pv);
    try { el.setSelectionRange(fp, fp); } catch {}
  }, [dv]);

  // ── Build rendered display ──
  const prevHadVal = useRef(false);
  const rendered = useMemo(() => {
    const af = anim.affectedIds || new Set();

    // Empty state — show placeholder (or loading pulse)
    if (!pv) {
      prevHadVal.current = false;
      if (falling.length || cleared) return null;
      const si = suffix ? placeholder.lastIndexOf(suffix) : -1;
      return placeholder.split("").map((ch, i) => {
        const inSuf = si !== -1 && i >= si;
        const base = inSuf ? 120 : 0;
        const pal = loading ? PH_COLORS_LOADING : PH_COLORS;
        const c0 = pal[i % pal.length];
        const c1 = pal[(i + 2) % pal.length];
        const c2 = pal[(i + 4) % pal.length];
        return (
          <span
            key={inSuf ? `ph-${suffix}-${i}-${phKey}` : `ph-s-${i}-${phKey}`}
            className={loading ? "ri-ph-char ri-ph-char--loading" : "ri-ph-char"}
            style={loading
              ? { animationDelay: `${i * 120}ms`, '--pl-c0': c0, '--pl-c1': c1, '--pl-c2': c2 }
              : { animationDelay: `${base + (inSuf ? (i - si) : i) * 45}ms`, '--pl-c': c0 }
            }
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      });
    }

    const di = tokens.findIndex(t => t.ch === ".");
    const il = di === -1 ? tokens.length : di;
    const els = [];

    tokens.forEach((t, i) => {
      // Insert comma separators for integer part
      if (i > 0 && i < il && (il - i) % 3 === 0) {
        els.push(
          <Punct key={`c-${il}-${i}`} ch="," animate={af.size > 0}
            direction={af.size > 0 ? anim.direction : null} height={CELL_H} />
        );
      }

      const sa = af.has(t.id);
      const sc = shAnim.movedIds.has(t.id) ? `ri-shift ri-shift--${shAnim.dir}` : "";

      if (t.ch >= "0" && t.ch <= "9") {
        els.push(
          <DigitRoll key={t.id} digit={Number(t.ch)}
            animDirection={sa ? anim.direction : null} animTriggerId={sa ? anim.id : 0}
            spinCycles={sa ? anim.cycles : 0} height={CELL_H} className={sc} />
        );
        return;
      }

      if (t.ch === ".") {
        els.push(
          <Punct key={`${t.id}-${sa ? anim.id : "s"}`} ch="." animate={sa}
            direction={sa ? anim.direction : null} height={CELL_H} className={sc} />
        );
        return;
      }

      els.push(
        <span key={t.id} className={`ri-static ${sc}`.trim()} style={{ height: CELL_H }}>{t.ch}</span>
      );
    });

    // Append suffix characters
    if (suffix) {
      prevHadVal.current = true;
      suffix.split("").forEach((ch, i) => {
        els.push(
          <span key={`suf-${suffix}-${i}`} className="ri-suffix ri-suffix--enter"
            style={{ animationDelay: `${120 + i * 45}ms`, marginLeft: i === 0 ? ".5ch" : 0 }}>
            {ch}
          </span>
        );
      });
    }

    return els;
  }, [anim, falling.length, tokens, pv, shAnim, placeholder, suffix, cleared, phKey, loading]);

  // Stepper button handlers
  const sD2 = dir => e => {
    e.preventDefault(); supC.current = true; focI();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    startH(dir, 1);
  };
  const sU2 = () => { stopH(); setTimeout(() => { supC.current = false; }, 0); };
  const sC2 = dir => () => { if (supC.current) return; adjOnce(dir, 1, { cycles: 1 }); };

  return (
    <div>
      <div className="ri-field" style={{ "--ri-fade-color": fadeColor }}
        onPointerDown={e => { if (!e.target?.closest?.(".ri-controls")) focI(); }}>

        <span key={bumpId} className="ri-bump" />

        <input
          ref={inputRef}
          className={`ri-input ${exceeds ? "ri-input--warn" : ""}`}
          value={dv}
          onBeforeInput={onBI}
          onPaste={capSel}
          onChange={hChg}
          onKeyDown={onKD}
          onKeyUp={onKU}
          onBlur={onBl}
          inputMode="decimal"
          spellCheck={false}
          autoComplete="off"
          aria-label={ariaLabel || placeholder}
          aria-invalid={exceeds || undefined}
        />

        <div className="ri-display" style={{ color: exceeds ? "rgba(255,120,120,.9)" : textColor }}>
          <span className={`ri-display__inner${loading && pv ? " ri-display__inner--loading" : ""}`}
            style={displayAnim ? { display: "inline-block", animation: displayAnim } : undefined}>
            {rendered}
          </span>
        </div>

        <div className="ri-fall-layer">
          {falling.map(f => (
            <span
              key={f.key}
              className={`ri-fall ri-fall--${f.mode}${f.dirSuffix || ""} ${f.ch === "." ? "ri-fall--dot" : ""}`}
              style={{
                left: f.left, animationDelay: `${f.delay}ms`,
                color: f.isPlaceholder ? 'rgba(255,255,255,.28)' : f.isSuffix ? 'rgba(255,255,255,.22)' : textColor,
                ...(f.isSuffix ? { width: 'auto' } : {}),
              }}
              onAnimationEnd={() => setFalling(c => c.filter(x => x.key !== f.key))}
            >
              {f.isSuffix
                ? <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '.03em' }}>{f.ch}</span>
                : f.ch}
            </span>
          ))}
        </div>

        {showStepper && (
          <div className="ri-controls">
            <button className="ri-clear" type="button" tabIndex={-1}
              onClick={() => { clear({ withFall: true, fast: true }); if (onClear) onClear(); }}>×</button>
            <div className="ri-stepper">
              <button className="ri-step" type="button" tabIndex={-1}
                onPointerDown={sD2("up")} onPointerUp={sU2}
                onPointerCancel={sU2} onPointerLeave={sU2} onClick={sC2("up")}>▲</button>
              <button className="ri-step" type="button" tabIndex={-1}
                onPointerDown={sD2("down")} onPointerUp={sU2}
                onPointerCancel={sU2} onPointerLeave={sU2} onClick={sC2("down")}>▼</button>
            </div>
          </div>
        )}
      </div>

      {hint && <div role="status" aria-live="assertive" style={{ marginTop: 4, fontSize: 11, color: "rgba(255,100,100,.85)" }}>{hint}</div>}
      {exceeds && !hint && <div role="alert" style={{ marginTop: 4, fontSize: 11, color: "rgba(255,100,100,.85)" }}>Exceeds balance</div>}
      <div className="sr-only" aria-live="polite" aria-atomic="true">{pv ? `${pv} ${suffix}` : placeholder}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// RollingRate — mini rate ticker display
// ═══════════════════════════════════════════════════════════════════
function RollingRate({ rate, decimals = 2, direction, rollIn = false }) {
  const str = rate >= 1 ? addCommas(rate.toFixed(decimals)) : rate.toFixed(Math.max(decimals, 6));
  const [chars, setChars] = useState(str.split(""));
  const [aid, setAid] = useState(0);
  const [dir, setDir] = useState(rollIn ? "up" : null);
  const prev = useRef(str);

  useEffect(() => {
    if (str === prev.current) return;
    setDir(Number(str.replace(/,/g, "")) > Number(prev.current.replace(/,/g, "")) ? "up" : "down");
    prev.current = str;
    setChars(str.split(""));
    setAid(x => x + 1);
  }, [str]);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
      {chars.map((ch, i) => {
        if (ch >= "0" && ch <= "9") {
          return <DigitRoll key={`r-${i}`} digit={Number(ch)} animDirection={dir} animTriggerId={aid} spinCycles={0} height={16} />;
        }
        return (
          <span key={`p-${i}`} style={{ display: "inline-grid", placeItems: "center", width: ch === "," ? "0.5ch" : "0.7ch", height: 16, fontSize: 12, textAlign: "center" }}>
            {ch}
          </span>
        );
      })}
      {direction && (
        <span style={{ marginLeft: 3, fontSize: 8, color: direction === "up" ? "#4ade80" : "#f87171" }}>
          {direction === "up" ? "▲" : "▼"}
        </span>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// QuoteBadge — pill with depleting outline ring + lock icon
// ═══════════════════════════════════════════════════════════════════
function QuoteBadge({ loading, quoting, startTime, ttl }) {
  const [progress, setProgress] = useState(1);
  const pillRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Measure pill
  useEffect(() => {
    const el = pillRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    };
    requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [quoting]);

  // Animate progress
  useEffect(() => {
    if (!startTime || loading) { setProgress(1); return; }
    const tick = () => {
      const elapsed = (Date.now() - startTime) / ttl;
      setProgress(Math.max(0, 1 - elapsed));
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [startTime, ttl, loading]);

  // Animated dots for quoting state only
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!quoting) { setDotCount(1); return; }
    const id = setInterval(() => setDotCount(d => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, [quoting]);

  const lockColor = quoting ? "rgba(255,255,255,.35)" : "rgba(250,204,21,.6)";

  // Pill outline ring
  const { w, h } = dims;
  const rr = h / 2; // pill radius
  const sw = 1.2;
  let ringSvg = null;
  if (w > 0 && h > 0) {
    const path = `M${w / 2},${sw / 2} `
      + `L${w - rr},${sw / 2} `
      + `A${rr - sw / 2},${rr - sw / 2} 0 0 1 ${w - rr},${h - sw / 2} `
      + `L${rr},${h - sw / 2} `
      + `A${rr - sw / 2},${rr - sw / 2} 0 0 1 ${rr},${sw / 2} Z`;
    const perim = 2 * (w - 2 * rr) + 2 * Math.PI * (rr - sw / 2);
    const dash = perim * progress;
    const strokeColor = loading ? "rgba(255,255,255,.18)"
      : progress > 0.3 ? "rgba(250,204,21,.35)"
      : progress > 0.1 ? "rgba(255,180,50,.4)"
      : "rgba(255,100,100,.4)";

    ringSvg = (
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <path d={path} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={sw} />
        <path d={path} fill="none" stroke={strokeColor} strokeWidth={sw}
          strokeDasharray={`${dash} ${perim}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 200ms linear, stroke 300ms ease" }} />
      </svg>
    );
  }

  return (
    <span ref={pillRef} className="cv-quote-badge" role="status" style={{ position: "relative" }}>
      {ringSvg}
      <span style={{ color: quoting ? "rgba(255,255,255,.4)" : "rgba(250,204,21,.65)" }}>
        Quote
      </span>
      {quoting ? (
        <svg width={10} height={10} viewBox="0 0 10 10" style={{ display: "block", animation: "cvSpin 800ms linear infinite" }}>
          <path d="M5 1a4 4 0 1 1-3.46 2" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M1.54 3L1.2 1.4M1.54 3L3.1 2.5" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width={10} height={12} viewBox="0 0 10 12" style={{ display: "block" }}>
          <rect x="1" y="5.5" width="8" height="6" rx="1.5" fill="none" stroke={lockColor} strokeWidth="1" />
          <path d="M3 5.5V3.5a2 2 0 0 1 4 0V5.5" fill="none" stroke={lockColor} strokeWidth="1" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PctAdjuster — +/- percent buttons
// ═══════════════════════════════════════════════════════════════════
const PCT_STEPS = [1, 5, 15];

function PctAdjuster({ balance, decimals, currentValue, onSet }) {
  const adjust = (pct) => {
    const cur = Number(currentValue) || 0;
    const delta = balance * (pct / 100);
    let next = cur + delta;
    if (next < 0) next = 0;
    const dec = countDecimals(decimals);
    onSet(next.toFixed(dec));
  };

  const cur = Number(currentValue) || 0;
  const negDisabled = cur <= 0;

  const pill = {
    height: 20, padding: "0 5px", borderRadius: 4,
    border: "1px solid rgba(255,255,255,.08)", background: "transparent",
    cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 500,
    transition: "all 100ms", lineHeight: "20px",
  };
  const neg = {
    ...pill,
    color: negDisabled ? "rgba(255,130,130,.2)" : "rgba(255,130,130,.6)",
    cursor: negDisabled ? "default" : "pointer",
    borderColor: negDisabled ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)",
  };
  const pos = { ...pill, color: "rgba(130,255,170,.6)" };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: 3, rowGap: 4 }}>
      {PCT_STEPS.slice().reverse().map(p => (
        <button key={`m${p}`} type="button" tabIndex={-1} style={neg}
          onMouseDown={e => e.preventDefault()}
          onClick={() => { if (!negDisabled) adjust(-p); }}
          onMouseEnter={e => { if (!negDisabled) { e.currentTarget.style.background = "rgba(255,100,100,.1)"; e.currentTarget.style.color = "rgba(255,130,130,.9)"; } }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = negDisabled ? "rgba(255,130,130,.2)" : "rgba(255,130,130,.6)"; }}>
          −{p}%
        </button>
      ))}
      <span style={{ width: 0, margin: "0 1px" }} />
      {PCT_STEPS.map(p => (
        <button key={`p${p}`} type="button" tabIndex={-1} style={pos}
          onMouseDown={e => e.preventDefault()}
          onClick={() => adjust(p)}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,255,150,.08)"; e.currentTarget.style.color = "rgba(130,255,170,.9)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(130,255,170,.6)"; }}>
          +{p}%
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Coin data & rate helpers
// ═══════════════════════════════════════════════════════════════════
const QUOTE_DELAY = 1200;   // simulated quote fetch time (ms)
const QUOTE_TTL_MS = 32000; // quote valid for 32s
const FEE_PCT = 0.005;      // 0.5% transaction fee

const CONVERTER_COINS = {
  BTC:  { name: "Bitcoin",  icon: "₿", color: "#f7931a", decimals: "0.00000001", balance: 2.45831 },
  ETH:  { name: "Ethereum", icon: "Ξ", color: "#627eea", decimals: "0.0001",     balance: 34.2819 },
  USDT: { name: "Tether",   icon: "₮", color: "#26a17b", decimals: "0.01",       balance: 48750.00 },
  SOL:  { name: "Solana",   icon: "◎", color: "#9945ff", decimals: "0.001",      balance: 312.485 },
  BNB:  { name: "BNB",      icon: "◆", color: "#f0b90b", decimals: "0.0001",     balance: 18.753 },
  XRP:  { name: "Ripple",   icon: "✕", color: "#00aae4", decimals: "0.0001",     balance: 5420.00 },
  USDC: { name: "USD Coin", icon: "$", color: "#2775ca", decimals: "0.01",       balance: 12500.00 },
};

const HOTKEY_COINS = ["BTC", "ETH", "BNB", "XRP"];
const HOTKEY_COINS_SPEND = ["USDT", "USDC"];
const CONVERTER_TICKERS = new Set(Object.keys(CONVERTER_COINS));
const APP_VALID_TABS = new Set(["convert", ...AppPages.getOrder()]);

function readInitialAppState() {
  const link = typeof window.parseAppLink === "function"
    ? window.parseAppLink(APP_VALID_TABS)
    : { tab: "convert", buy: null, spend: null, coin: null, action: "coin" };
  const saved = typeof window.loadConvertPair === "function"
    ? window.loadConvertPair(CONVERTER_TICKERS)
    : null;
  let buy = "BTC";
  let spend = "USDT";
  if (link.buy && CONVERTER_TICKERS.has(link.buy)) buy = link.buy;
  else if (saved?.buy) buy = saved.buy;
  if (link.spend && CONVERTER_TICKERS.has(link.spend)) spend = link.spend;
  else if (saved?.spend) spend = saved.spend;
  if (buy === spend) spend = buy === "USDT" ? "BTC" : "USDT";
  const walletCoin = link.tab === "wallet" && link.coin && window.COINS?.[link.coin] ? link.coin : null;
  const walletAction = walletCoin ? link.action : null;
  return { link, buy, spend, walletCoin, walletAction };
}

const _appInit = readInitialAppState();

/** Optical centering for monospace coin glyphs inside circular chips */
function CoinIconGlyph({ ticker }) {
  const icon = CONVERTER_COINS[ticker]?.icon ?? "?";
  return (
    <span className={"cv-coin-glyph" + (ticker === "BNB" ? " cv-coin-glyph--bnb" : "")} aria-hidden>
      {icon}
    </span>
  );
}
// Stablecoins are the price denominator — we never want to show a {STABLE}/USDT
// market chart. When both sides of the pair are non-stable, default to buyAsset
// (the side the user is acquiring).
const STABLES = new Set(["USDT", "USDC"]);

// BASE_RATES loaded from shared.js

// ═══════════════════════════════════════════════════════════════════
// TickerTape — bottom-of-screen scrolling market strip, fed by HxMarket
// ═══════════════════════════════════════════════════════════════════
const TICKER_TAPE_COINS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "POL", "HYPE", "XMR"];
const HxRoll = window.HxRoll;

const TickerTape = React.memo(function TickerTape({ onSelect }) {
  const [, setTick] = useState(0);
  useEffect(() => window.HxMarket.subscribe(() => setTick(n => n + 1)), []);
  const M = window.HxMarket;
  // Two identical groups (second aria-hidden) make the marquee loop seamless.
  const renderGroup = (suffix, hidden) => (
    <div className="cv-tape__group" aria-hidden={hidden || undefined}>
      {TICKER_TAPE_COINS.map(t => {
        const ch = M.getChange(t);
        return (
          <button key={t + suffix} type="button" className="cv-tape__item" tabIndex={hidden ? -1 : 0}
            onClick={() => onSelect && onSelect(t)} title={`Trade ${t}`}>
            <span className="cv-tape__sym" style={{ color: COINS[t]?.color }}>{t}</span>
            <HxRoll className="cv-tape__price" value={fmtPrice(M.getPrice(t))} dir={M.getDir(t)} />
            <span className={"cv-tape__chg " + (ch >= 0 ? "cv-tape__chg--up" : "cv-tape__chg--down")}>
              {(ch >= 0 ? "+" : "") + ch.toFixed(2) + "%"}
            </span>
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="cv-tape" aria-label="Live market prices">
      {renderGroup("a", false)}
      {renderGroup("b", true)}
    </div>
  );
});

function getRate(rates, from, to) {
  if (from === to) return 1;
  const k1 = `${from}/${to}`, k2 = `${to}/${from}`;
  if (rates[k1]) return rates[k1];
  if (rates[k2]) return 1 / rates[k2];
  const f = rates[`${from}/USDT`], t = rates[`${to}/USDT`];
  if (f && t) return f / t;
  if (f && to === "USDT") return f;
  if (t && from === "USDT") return 1 / t;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
// CoinSelect — dropdown with search + hotkey chips
// ═══════════════════════════════════════════════════════════════════
function CoinSelect({ current, onSelect, show, setShow, closeAll, exclude, hotkeys, hotkeyList }) {
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (show && searchRef.current) setTimeout(() => searchRef.current?.focus(), 50);
    if (!show) setSearch("");
  }, [show]);

  // Close on click outside
  useEffect(() => {
    if (!show) return;
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShow(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [show, setShow]);

  const filtered = Object.entries(CONVERTER_COINS).filter(([k, v]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
  });

  const handleKey = e => {
    if (e.key === "Escape") { e.preventDefault(); setShow(false); }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      onSelect(filtered[0][0]);
      setShow(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button tabIndex={-1} onClick={() => { closeAll(); setShow(!show); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "all 120ms" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: CONVERTER_COINS[current].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            <CoinIconGlyph ticker={current} />
          </span>
          {current}
          <span style={{ fontSize: 9, opacity: 0.35, marginLeft: 1, transition: "transform 150ms", transform: show ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {show && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "#1e1e2a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 6, minWidth: 190, boxShadow: "0 12px 40px rgba(0,0,0,.6)" }}>
            <div style={{ position: "relative", marginBottom: 4 }}>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKey} placeholder="Search..."
                style={{ width: "100%", height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 12, fontFamily: "inherit", padding: "0 26px 0 8px", outline: "none", boxSizing: "border-box" }} />
              {search && (
                <button onClick={() => setSearch("")}
                  style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "rgba(255,255,255,.35)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 2, lineHeight: 1 }}>
                  ×
                </button>
              )}
            </div>
            {filtered.length === 0 && window.EmptyState && window.EmptyState({ compact: true, icon: "⌕", title: "No results", message: "Try another symbol or name." })}
            <div className="cv-coin-dropdown" style={{ maxHeight: 180, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              {filtered.map(([k, v]) => {
                const isCur = k === current, isOther = k === exclude;
                return (
                  <button key={k} onClick={() => { if (isCur) { setShow(false); return; } onSelect(k); setShow(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: 0, background: isCur ? "rgba(255,255,255,.08)" : "transparent", borderRadius: 8, cursor: isCur ? "default" : "pointer", color: "#fff", fontSize: 13, fontFamily: "inherit", textAlign: "left", transition: "background 120ms", opacity: isCur ? 0.6 : 1 }}
                    onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
                    onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: v.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      <CoinIconGlyph ticker={k} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{k}</div>
                      <div style={{ fontSize: 10, opacity: 0.4 }}>{v.name}</div>
                    </div>
                    {isCur && <span style={{ marginLeft: "auto", fontSize: 10, color: v.color }}>✓</span>}
                    {isOther && <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,.3)" }}>⇅ swap</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {hotkeys && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, rowGap: 3 }}>
          {(hotkeyList || HOTKEY_COINS).map(k => {
            const isCur = k === current, isExcl = k === exclude;
            return (
              <button key={k} tabIndex={-1} onClick={() => { onSelect(k); setShow(false); }} title={CONVERTER_COINS[k].name}
                style={{
                  width: 24, height: 24, borderRadius: "50%", padding: 0, fontSize: 10, fontWeight: 700,
                  border: isCur ? `2px solid ${CONVERTER_COINS[k].color}` : isExcl ? `2px solid ${CONVERTER_COINS[k].color}44` : "2px solid rgba(255,255,255,.08)",
                  background: isCur ? `${CONVERTER_COINS[k].color}22` : isExcl ? `${CONVERTER_COINS[k].color}11` : "rgba(255,255,255,.03)",
                  color: isCur ? CONVERTER_COINS[k].color : isExcl ? `${CONVERTER_COINS[k].color}88` : "rgba(255,255,255,.35)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", transition: "all 150ms",
                }}
                onMouseEnter={e => { if (!isCur) { e.currentTarget.style.borderColor = `${CONVERTER_COINS[k].color}66`; e.currentTarget.style.color = CONVERTER_COINS[k].color; } }}
                onMouseLeave={e => { if (!isCur) { e.currentTarget.style.borderColor = isExcl ? `${CONVERTER_COINS[k].color}44` : "rgba(255,255,255,.08)"; e.currentTarget.style.color = isExcl ? `${CONVERTER_COINS[k].color}88` : "rgba(255,255,255,.35)"; } }}>
                <CoinIconGlyph ticker={k} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ReviewModal
// ═══════════════════════════════════════════════════════════════════
function ReviewModal({ buyAsset, spendAsset, buyValue, spendValue, rate, onConfirm, onBack, onExpire, quoteStartTime, quoteTtl }) {
  const bInfo = CONVERTER_COINS[buyAsset], sInfo = CONVERTER_COINS[spendAsset];
  const QUOTE_TTL = quoteTtl / 1000;

  // Fee & "You get" calculation
  const buyNum = Number(buyValue) || 0;
  const feeAmount = buyNum * FEE_PCT;
  const youGet = buyNum - feeAmount;
  const dec = countDecimals(bInfo.decimals);
  const feeStr = feeAmount.toFixed(dec);
  const youGetStr = youGet.toFixed(dec);

  // Countdown timer — continues from parent's existing quote
  const initialRemaining = quoteStartTime ? Math.max(0, QUOTE_TTL - (Date.now() - quoteStartTime) / 1000) : QUOTE_TTL;
  const [remaining, setRemaining] = useState(initialRemaining);
  const expired = remaining <= 0;

  useEffect(() => {
    if (expired) { if (onExpire) onExpire(); return; }
    const id = setInterval(() => {
      const left = quoteStartTime ? Math.max(0, QUOTE_TTL - (Date.now() - quoteStartTime) / 1000) : 0;
      if (left <= 0) {
        setRemaining(0);
        clearInterval(id);
        if (onExpire) onExpire();
      } else {
        setRemaining(left);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const barPct = (remaining / QUOTE_TTL) * 100;
  const barColor = remaining > 5 ? "rgba(74,222,128,.7)" : remaining > 2 ? "rgba(250,204,21,.7)" : "rgba(255,100,100,.8)";
  const countdownSec = Math.ceil(remaining);

  return (
    <div className="cv-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onBack(expired); }}>
      <div className="cv-modal">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Review Order</span>
          <button onClick={() => onBack(expired)} style={{ background: "none", border: 0, color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 18, fontFamily: "inherit", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div className="cv-row">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>You buy</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: bInfo.color, marginRight: 6 }}>{bInfo.icon}</span>
              {addCommas(buyValue)} {buyAsset}
            </span>
          </div>
          <div className="cv-row">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>You spend</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: sInfo.color, marginRight: 6 }}>{sInfo.icon}</span>
              {addCommas(spendValue)} {spendAsset}
            </span>
          </div>
          <div className="cv-row">
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>Fee (0.5%)</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
              −{addCommas(feeStr)} {buyAsset}
            </span>
          </div>
          <div className="cv-row" style={{ borderBottom: "none", paddingTop: 12, paddingBottom: 12 }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)", fontWeight: 600 }}>You get</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#4ade80" }}>
              <span style={{ color: bInfo.color, marginRight: 6 }}>{bInfo.icon}</span>
              {addCommas(youGetStr)} {buyAsset}
            </span>
          </div>
        </div>

        {/* Expired message */}
        {expired && (
          <div style={{
            background: "rgba(255,80,80,.08)", border: "1px solid rgba(255,80,80,.15)", borderRadius: 8,
            padding: "10px 12px", marginBottom: 12, fontSize: 11, color: "rgba(255,120,120,.9)",
            lineHeight: 1.5, textAlign: "center",
          }}>
            Your price quote has expired. Go back to recalculate your spend amount.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={() => onBack(expired)}
            style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.6)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 150ms" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {expired ? "Go Back" : "Back"}
          </button>
          <button onClick={expired ? undefined : onConfirm} disabled={expired}
            style={{
              flex: 2, height: 44, borderRadius: 10, border: 0, fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              transition: "all 150ms",
              ...(expired
                ? { background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.2)", cursor: "not-allowed", boxShadow: "none" }
                : { background: `linear-gradient(135deg, ${bInfo.color}, ${bInfo.color}cc)`, color: "#fff", cursor: "pointer", boxShadow: `0 4px 16px ${bInfo.color}33` }
              ),
            }}
            onMouseEnter={e => { if (!expired) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { if (!expired) e.currentTarget.style.transform = "translateY(0)"; }}>
            {expired ? "Expired" : "Confirm Buy"}
          </button>
        </div>

        {/* Rate + quote validity at bottom */}
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span>1 {buyAsset} = {(1/rate) >= 1 ? addCommas((1/rate).toFixed((1/rate) >= 100 ? 2 : 4)) : (1/rate).toFixed(8)} {spendAsset}</span>
          <span style={{ color: expired ? "rgba(255,100,100,.8)" : "rgba(255,255,255,.35)", fontWeight: 500 }}>
            {expired ? "Expired" : `${countdownSec}s`}
          </span>
        </div>
        <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 1, background: barColor,
            width: `${barPct}%`, transition: "width 100ms linear, background 300ms ease",
          }} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Audio & effects
// ═══════════════════════════════════════════════════════════════════
function playSuccessSound() {
  if (!isSoundOn("success")) return;
  try {
    const a = new Audio("success-bought-snap.mp4.mp4");
    a.volume = 0.5;
    a.play();
  } catch {}
}

function Confetti({ originRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (getAnimScale() === 0) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width = window.innerWidth;
    const H = cvs.height = window.innerHeight;

    // Find checkmark center (absolute screen coords)
    let cx = W / 2, cy = H / 2;
    if (originRef?.current) {
      const or = originRef.current.getBoundingClientRect();
      cx = or.left + or.width / 2;
      cy = or.top + or.height / 2;
    }

    const colors = ["#f7931a","#627eea","#26a17b","#9945ff","#f0b90b","#00aae4","#ff6b6b","#4ade80","#facc15","#38bdf8"];

    const makeBurst = (ox, oy, spread, count) => Array.from({ length: count }, () => ({
      x: ox + (Math.random() - 0.5) * spread * 0.4,
      y: oy + (Math.random() - 0.5) * 12,
      vx: (Math.random() - 0.5) * spread,
      vy: -Math.random() * 11 - 5,
      w: Math.random() * 6 + 2,
      h: Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 10,
      opacity: 1,
      phase: Math.random() * Math.PI * 2,
      born: false,
    }));

    // Three bursts: tight first, then progressively wider, staggered timing
    const burst1 = makeBurst(cx + (Math.random() - 0.5) * 16, cy, 10, 60);
    const burst2 = makeBurst(cx + (Math.random() - 0.5) * 30, cy, 16, 55);
    const burst3 = makeBurst(cx + (Math.random() - 0.5) * 40, cy, 22, 50);
    burst1.forEach(p => { p.born = true; });

    const pieces = [...burst1, ...burst2, ...burst3];
    let t = 0, raf;
    const timers = [];

    timers.push(setTimeout(() => {
      burst2.forEach(p => { p.born = true; });
    }, animMs(100 + Math.random() * 60)));

    timers.push(setTimeout(() => {
      burst3.forEach(p => { p.born = true; });
    }, animMs(250 + Math.random() * 100)));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      pieces.forEach(p => {
        if (!p.born) return;
        const falling = p.vy > 0;
        p.vy += falling ? 0.02 : 0.3;
        if (falling) {
          p.vx *= 0.88;
          p.vx = Math.sin(t * 0.025 + p.phase) * 0.5;
          p.rv *= 0.97;
        } else {
          p.vx *= 0.98;
        }
        p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        p.opacity -= falling ? 0.0018 : 0.001;
        if (p.opacity <= 0) return;
        alive++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      t++;
      if (alive > 0) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, [originRef]);

  return React.createElement("canvas", {
    ref: canvasRef,
    style: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200 },
  });
}

// ═══════════════════════════════════════════════════════════════════
// SuccessModal
// ═══════════════════════════════════════════════════════════════════
function SuccessModal({ buyAsset, buyValue, onDone }) {
  const info = CONVERTER_COINS[buyAsset];
  const checkRef = useRef(null);
  const [showConfetti, setShowConfetti] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(true), animMs(510)); return () => clearTimeout(t); }, []);

  return (
    <div className="cv-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onDone(); }}>
      {showConfetti && <Confetti originRef={checkRef} />}
      <div className="cv-modal cv-success" style={{ position: "relative", zIndex: 2 }}>
        <div ref={checkRef} className="cv-check" style={{ background: `${info.color}22`, color: info.color }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M6 14.5 L11.5 20 L22 8"
              stroke={info.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 30,
                strokeDashoffset: 30,
                animation: "cvTickDraw 450ms cubic-bezier(.22,.6,.36,1) 300ms forwards",
              }}
            />
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Purchase Complete</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 20 }}>
          You bought <span style={{ color: info.color, fontWeight: 600 }}>{addCommas(buyValue)} {buyAsset}</span>
        </div>
        <button onClick={onDone}
          style={{ width: "100%", height: 44, borderRadius: 10, border: 0, background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all 150ms" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ConvertPairPanel — pair chart for active convert pair (buy/spend).
// Cross rate from USDT legs: 1 buy = getRate(buy, spend) spend.
// ═══════════════════════════════════════════════════════════════════
function fmtPairAxis(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return addCommas(n.toFixed(2));
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toFixed(8);
}

function ConvertPairPanel({ buyAsset, spendAsset, rates, top = false, onClose, quoteBadge = null, loading = false, panelRef = null }) {
  const buyInfo = CONVERTER_COINS[buyAsset];
  const spendInfo = CONVERTER_COINS[spendAsset];
  const livePairRate = getRate(rates, buyAsset, spendAsset);
  const buyCh = (MOCK_CHANGES && MOCK_CHANGES[buyAsset]) || 0;
  const spendCh = (MOCK_CHANGES && MOCK_CHANGES[spendAsset]) || 0;
  const change24 = buyCh - spendCh;
  const isUp = change24 > 0, isDown = change24 < 0;

  const points = useMemo(() => {
    const buyUsd = genChartData(getUSDRate(BASE_RATES, buyAsset) || 1, 80, 0.018);
    const spendUsd = genChartData(getUSDRate(BASE_RATES, spendAsset) || 1, 80, 0.016);
    return buyUsd.map((b, i) => {
      const s = spendUsd[i] || 1;
      return s > 0 ? b / s : 0;
    });
  }, [buyAsset, spendAsset]);

  const canvasRef = useRef(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (loading) return;
    const c = canvasRef.current;
    if (!c) return;

    const draw = (hoverIdx) => {
      const dpr = window.devicePixelRatio || 1;
      const W = c.offsetWidth || 380, H = top ? 148 : 150;
      c.width = W * dpr;
      c.height = H * dpr;
      const ctx = c.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const min = Math.min(...points), max = Math.max(...points);
      const range = max - min || 1;
      const padTop = 12, padBot = 14, padRight = 56;
      const chartW = W - padRight;
      const toY = v => padTop + (1 - (v - min) / range) * (H - padTop - padBot);
      const toX = i => (i / (points.length - 1)) * (chartW - 4) + 2;
      const color = isUp ? "#4ade80" : isDown ? "#f87171" : "rgba(255,255,255,.4)";
      const fillTop = isUp ? "rgba(74,222,128,.22)" : isDown ? "rgba(248,113,113,.22)" : "rgba(255,255,255,.08)";

      ctx.font = "500 9px ui-monospace,'JetBrains Mono',monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const tickAxisX = chartW + 6;
      for (let g = 0; g <= 4; g++) {
        const t = g / 4;
        const y = padTop + t * (H - padTop - padBot);
        const v = max - t * range;
        ctx.strokeStyle = "rgba(255,255,255,.04)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.28)";
        ctx.fillText(fmtPairAxis(v), tickAxisX, y);
      }

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(points[0]));
      for (let i = 1; i < points.length; i++) {
        const cx = (toX(i - 1) + toX(i)) / 2;
        ctx.bezierCurveTo(cx, toY(points[i - 1]), cx, toY(points[i]), toX(i), toY(points[i]));
      }
      ctx.lineTo(toX(points.length - 1), H - padBot);
      ctx.lineTo(toX(0), H - padBot);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padTop, 0, H - padBot);
      grad.addColorStop(0, fillTop);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(points[0]));
      for (let i = 1; i < points.length; i++) {
        const cx = (toX(i - 1) + toX(i)) / 2;
        ctx.bezierCurveTo(cx, toY(points[i - 1]), cx, toY(points[i]), toX(i), toY(points[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.7;
      ctx.stroke();

      if (hoverIdx !== null && hoverIdx !== undefined && hoverIdx >= 0 && hoverIdx < points.length) {
        const hx = toX(hoverIdx), hy = toY(points[hoverIdx]);
        ctx.strokeStyle = "rgba(255,255,255,.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(hx, padTop); ctx.lineTo(hx, H - padBot); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff"; ctx.fill();
      }
    };

    draw(hover ? hover.idx : null);
  }, [points, isUp, isDown, hover, top, loading]);

  const onMouseMove = (e) => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padRight = 56;
    const chartW = rect.width - padRight;
    if (x < 0 || x > chartW) { setHover(null); return; }
    const t = Math.max(0, Math.min(1, (x - 2) / (chartW - 4)));
    const idx = Math.round(t * (points.length - 1));
    const drawnX = (idx / (points.length - 1)) * (chartW - 4) + 2;
    setHover({ idx, x: drawnX, value: points[idx] });
  };
  const onMouseLeave = () => setHover(null);
  const hoverDaysAgo = hover ? Math.round((1 - hover.idx / (points.length - 1)) * 7) : null;

  if (loading) {
    return (
      <div ref={panelRef} id="cv-pair-chart-panel" className="cv-mkt-panel cv-mkt-panel--top cv-mkt-panel--loading" aria-busy="true" aria-label="Loading pair chart">
        {onClose && (
          <button type="button" className="cv-pair-close" onClick={onClose} aria-label="Hide chart" title="Hide chart">×</button>
        )}
        <div className="cv-mkt-head">
          <span className="hx-sk-circle" style={{ width: 30, height: 30 }} />
          <div className="hx-sk-lines" style={{ minWidth: 120 }}>
            <span className="hx-sk" style={{ width: 118, height: 12, borderRadius: 4 }} />
            <span className="hx-sk" style={{ width: 168, height: 8, borderRadius: 3 }} />
          </div>
          <div style={{ flex: 1 }} />
          <span className="hx-sk" style={{ width: 72, height: 18, borderRadius: 4 }} />
          <span className="hx-sk" style={{ width: 54, height: 18, borderRadius: 5 }} />
          {quoteBadge}
        </div>
        <span className="hx-sk cv-mkt-sk-chart" />
      </div>
    );
  }

  return (
    <div ref={panelRef} id="cv-pair-chart-panel" className={"cv-mkt-panel" + (top ? " cv-mkt-panel--top" : "")}>
      {onClose && (
        <button type="button" className="cv-pair-close" onClick={onClose} aria-label="Hide chart" title="Hide chart">×</button>
      )}
      <div className="cv-mkt-head">
        <span className="cv-mkt-icon" style={{ background: buyInfo.color + "22", color: buyInfo.color }}>{buyInfo.icon}</span>
        <div style={{ minWidth: 0 }}>
          <div className="cv-mkt-name">
            {buyInfo.name} <span className="cv-mkt-ticker">{buyAsset}/{spendAsset}</span>
          </div>
          <div className="cv-mkt-sub">7-day conversion · 1 {buyAsset} in {spendAsset}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="cv-mkt-price-row">
          <div className="cv-mkt-price">{fmtPairAxis(livePairRate)}</div>
          <span style={{ fontSize: 10, color: spendInfo.color, opacity: 0.75, fontWeight: 600 }}>{spendAsset}</span>
          <span className={"cv-mkt-change cv-mkt-change--" + (isUp ? "up" : isDown ? "down" : "flat")}>
            {isUp ? "▲" : isDown ? "▼" : "—"} {Math.abs(change24).toFixed(2)}%
          </span>
          {quoteBadge}
        </div>
      </div>
      <div className="cv-mkt-chart-wrap">
        <canvas ref={canvasRef} className="cv-mkt-spark" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
        {hover && (
          <div className="cv-mkt-tooltip"
            style={{ left: Math.max(4, Math.min(hover.x - 42, (canvasRef.current?.offsetWidth || 380) - 140)) }}>
            <span>{fmtPairAxis(hover.value)} {spendAsset}</span>
            <span className="cv-mkt-tooltip-sep">·</span>
            <span className="cv-mkt-tooltip-age">{hoverDaysAgo === 0 ? "now" : `${hoverDaysAgo}d ago`}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CryptoConverter — main app
// ═══════════════════════════════════════════════════════════════════
export default function CryptoConverter() {
  const [buyAsset, setBuyAsset] = useState(_appInit.buy);
  const [spendAsset, setSpendAsset] = useState(_appInit.spend);
  const [spendValue, setSpendValue] = useState("");
  const [buyValue, setBuyValue] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [showBuySelect, setShowBuySelect] = useState(false);
  const [showSpendSelect, setShowSpendSelect] = useState(false);
  const [showPairChart, setShowPairChart] = useState(false);
  const [chartAnim, setChartAnim] = useState("idle"); // idle | opening | open | closing
  const [pairChartLoading, setPairChartLoading] = useState(false);
  const chartPanelRef = useRef(null);
  const compactNameRef = useRef(null);
  const compactRateRef = useRef(null);
  const chartAnimTimerRef = useRef(null);
  const morphRectsRef = useRef(null);
  const pairKey = `${buyAsset}/${spendAsset}`;
  const prevPairKeyRef = useRef(pairKey);
  const [rates, setRates] = useState(() => window.HxMarket.getRates());
  const [rateDir, setRateDir] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [flowPreview, setFlowPreview] = useState(() => (typeof window.getFlowPreview === "function" ? window.getFlowPreview() : "none"));
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [modal, setModal] = useState(null); // null | "review" | "success"
  const [quoteExpired, setQuoteExpired] = useState(false); // show requote banner after expired modal dismissed
  const [balances, setBalances] = useState(() =>
    Object.fromEntries(Object.entries(CONVERTER_COINS).map(([k, v]) => [k, v.balance]))
  );

  // Live exchange mode + signed in → real balances from /user/balance
  // (available amounts; refreshed every 20s and on live/auth changes;
  //  demo balances restored on sign-out)
  useEffect(() => {
    let stopped = false;
    let intervalId = null;
    let usingReal = false;
    const loadReal = () => {
      if (!(window.HxApi && window.HxApi.isLive() && window.HxApi.isAuthed())) return;
      window.HxApi.getBalance().then(real => {
        if (stopped) return;
        usingReal = true;
        setBalances(prev => {
          const next = { ...prev };
          Object.keys(CONVERTER_COINS).forEach(t => {
            next[t] = real[t] ? real[t].available : 0;
          });
          return next;
        });
      }).catch(() => {});
    };
    const sync = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (window.HxApi && window.HxApi.isLive() && window.HxApi.isAuthed()) {
        loadReal();
        intervalId = setInterval(loadReal, 20000);
      } else if (usingReal) {
        usingReal = false;
        setBalances(Object.fromEntries(Object.entries(CONVERTER_COINS).map(([k, v]) => [k, v.balance])));
      }
    };
    sync();
    window.addEventListener("hx-live-change", sync);
    window.addEventListener("hx-auth-change", sync);
    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("hx-live-change", sync);
      window.removeEventListener("hx-auth-change", sync);
    };
  }, []);

  // ── Notification type config ──
  const NOTIF_TYPES = useMemo(() => ({
    incoming:   { label: "Incoming",   color: "110,200,160", icon: "arrow-down",   autoNext: "deposit" },
    deposit:    { label: "Deposit",    color: "110,200,160", icon: "check",         settled: true },
    sent:       { label: "Sent",       color: "140,160,255", icon: "arrow-up" },
    receive:    { label: "Received",   color: "110,200,160", icon: "arrow-down" },
    swap:       { label: "Swap",       color: "190,140,255", icon: "swap" },
    buy:        { label: "Bought",     color: "100,200,240", icon: "plus-circle" },
    sell:       { label: "Sold",       color: "255,180,100", icon: "minus-circle" },
    trade:      { label: "Trade",      color: "168,140,255", icon: "swap" },
    staked:     { label: "Staked",     color: "200,160,255", icon: "lock" },
    unstaked:   { label: "Unstaked",   color: "200,160,255", icon: "lock" },
    reward:     { label: "Reward",     color: "255,210,80",  icon: "star" },
    withdrawn:  { label: "Withdrawn",  color: "180,180,200", icon: "bank" },
    alert:      { label: "Price alert", color: "255,210,80", icon: "star" },
    failed:     { label: "Failed",     color: "220,90,90",   icon: "x-circle" },
    rejected:   { label: "Rejected",   color: "220,90,90",   icon: "x-circle" },
    error:      { label: "Error",      color: "220,90,90",   icon: "x-circle" },
  }), []);

  const getNotifColor = useCallback((phase, opacity = 1) => {
    const c = NOTIF_TYPES[phase]?.color || "110,200,160";
    return `rgba(${c},${opacity})`;
  }, [NOTIF_TYPES]);

  const getNotifIcon = useCallback((phase) => {
    const type = NOTIF_TYPES[phase]?.icon || "arrow-down";
    switch (type) {
      case "check":        return <path d="M3.5 8.5l3 3 6-6.5" />;
      case "arrow-down":   return <path d="M8 14V2M4 10l4 4 4-4" />;
      case "arrow-up":     return <path d="M8 2v12M4 6l4-4 4 4" />;
      case "swap":         return <><path d="M4 5h8M10 3l2 2-2 2" /><path d="M12 11H4M6 9l-2 2 2 2" /></>;
      case "plus-circle":  return <><circle cx="8" cy="8" r="6" /><path d="M8 5.5v5M5.5 8h5" /></>;
      case "minus-circle": return <><circle cx="8" cy="8" r="6" /><path d="M5.5 8h5" /></>;
      case "lock":         return <><rect x="4" y="7" width="8" height="6" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" /></>;
      case "star":         return <path d="M8 2l1.8 3.6L14 6.2l-3 2.9.7 4.1L8 11.2 4.3 13.2l.7-4.1-3-2.9 4.2-.6z" />;
      case "bank":         return <><path d="M3 13h10M4 9v4M7 9v4M9 9v4M12 9v4" /><path d="M2.5 9h11L8 4z" /></>;
      case "x-circle":     return <><circle cx="8" cy="8" r="6" /><path d="M6 6l4 4M10 6l-4 4" /></>;
      default:             return <path d="M8 14V2M4 10l4 4 4-4" />;
    }
  }, [NOTIF_TYPES]);

  // ── Notifications (queue) ──
  const notifIdRef = useRef(0);
  const [notifications, setNotifications] = useState([]);
  // Each: { id, phase, amount, elapsed, detail? }
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const [notifEntering, setNotifEntering] = useState(false);
  const [notifExiting, setNotifExiting] = useState(false);

  const [notchSettle, setNotchSettle] = useState(false);
  const [notchExplore, setNotchExplore] = useState(false);
  const [notchHovered, setNotchHovered] = useState(false);
  const [notifHovered, setNotifHovered] = useState(false);
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const dotMenuRef = useRef(null);
  useEffect(() => {
    if (!dotMenuOpen) return;
    const handler = (e) => { if (dotMenuRef.current && !dotMenuRef.current.contains(e.target)) setDotMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dotMenuOpen]);
  const depositTimerRef = useRef(null);
  const shieldTimerRef = useRef(null);
  const marqueeRef = useRef(null);
  const marqueeInnerRef = useRef(null);
  const [marqueeScrollX, setMarqueeScrollX] = useState(0);

  const activeNotif = notifications[0] || null;
  const notifCount = notifications.length;

  // Tick elapsed on all queued notifications
  const hasNotifs = notifCount > 0;
  useEffect(() => {
    if (!hasNotifs) return;
    const id = setInterval(() => {
      setNotifications(prev => prev.map(n => ({ ...n, elapsed: n.elapsed + 1 })));
    }, 1000);
    return () => clearInterval(id);
  }, [hasNotifs]);

  const fmtAgo = (s) => s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s/60)}m ago` : `${Math.floor(s/3600)}h ago`;

  // Trigger entering when active notification changes
  const prevActiveIdRef = useRef(null);
  useEffect(() => {
    const id = activeNotif?.id ?? null;
    if (id !== null && prevActiveIdRef.current !== id) {
      setNotifEntering(true);
      playNotifSound();
    }
    prevActiveIdRef.current = id;
  }, [activeNotif?.id]);

  const pushNotif = useCallback((phase, amount, elapsed = 0, detail = "") => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev, { id, phase, amount, elapsed, detail }]);
  }, []);

  // Price alerts (HxAlerts in shared.js) land in the notch queue
  useEffect(() => {
    return window.HxAlerts.onFire((a) => {
      pushNotif(
        "alert",
        `${a.ticker} ${a.condition === "above" ? "≥" : "≤"} ${fmtPrice(a.price)}`,
        0,
        `now ${fmtPrice(a.firedPrice)}`
      );
    });
  }, [pushNotif]);

  // Expose for test trigger from Settings sound modal
  useEffect(() => {
    window._pushTestNotif = () => pushNotif("deposit", "0.01 BTC", 0, "Sound test");
    return () => { delete window._pushTestNotif; };
  }, [pushNotif]);

  const dismissNotif = () => {
    if (notifExiting) return;
    const current = notificationsRef.current[0];
    const remaining = notificationsRef.current.slice(1);
    if (remaining.length > 0) {
      setNotifications(remaining);
      setNotifEntering(true);
    } else {
      setNotifExiting(true);
    }
    const autoNext = NOTIF_TYPES[current?.phase]?.autoNext;
    if (autoNext) {
      depositTimerRef.current = setTimeout(() => {
        pushNotif(autoNext, current.amount, 0, current.detail);
      }, 2750);
    }
  };

  // "Read" a notification: remove it from the queue without autoNext follow-up
  const readNotif = () => {
    if (notifExiting) return;
    const remaining = notificationsRef.current.slice(1);
    if (remaining.length > 0) {
      setNotifications(remaining);
      setNotifEntering(true);
    } else {
      setNotifExiting(true);
    }
  };

  const dismissAllNotifs = () => {
    if (depositTimerRef.current) clearTimeout(depositTimerRef.current);
    setNotifExiting(true);
  };

  useEffect(() => {
    if (!activeNotif) return;
    shieldTimerRef.current = setTimeout(() => {}, 1000);
    return () => { if (shieldTimerRef.current) clearTimeout(shieldTimerRef.current); };
  }, [activeNotif?.id]);
  useEffect(() => () => {
    if (depositTimerRef.current) clearTimeout(depositTimerRef.current);
  }, []);

  // Real session → no fake notifications: clear any queued demo ones on
  // sign-in (price alerts still arrive — those are real)
  useEffect(() => {
    const h = () => { if (window.hxIsRealSession()) setNotifications([]); };
    h();
    window.addEventListener("hx-auth-change", h);
    window.addEventListener("hx-live-change", h);
    return () => {
      window.removeEventListener("hx-auth-change", h);
      window.removeEventListener("hx-live-change", h);
    };
  }, []);

  // Demo notifications: showcase all transaction types (demo sessions only)
  useEffect(() => {
    if (window.hxIsRealSession()) return;
    const timers = [
      setTimeout(() => pushNotif("deposit",   "0.0420 BTC",          180),  1500),
      setTimeout(() => pushNotif("incoming",  "12,000,000.50 KRW",     0),  4500),
      setTimeout(() => pushNotif("buy",       "0.25 ETH",              45, "$820.00"),  7500),
      setTimeout(() => pushNotif("sell",      "150 SOL",               30, "$22,500"),  10500),
      setTimeout(() => pushNotif("swap",      "1.5 ETH → 0.065 BTC",  15),            13500),
      setTimeout(() => pushNotif("sent",      "0.01 BTC",              90, "to 0x7f…3a2"), 16500),
      setTimeout(() => pushNotif("receive",   "3.0 ETH",               20),            19500),
      setTimeout(() => pushNotif("trade",     "2.4 ETH",               75, "$8,452"),   22500),
      setTimeout(() => pushNotif("staked",    "32 ETH",               120),            25500),
      setTimeout(() => pushNotif("unstaked",  "50 SOL",                40),            28500),
      setTimeout(() => pushNotif("reward",    "0.0008 ETH",            60),            31500),
      setTimeout(() => pushNotif("withdrawn", "$5,000.00 USD",         10),            34500),
      setTimeout(() => pushNotif("failed",    "0.5 ETH",                5, "Insufficient gas"), 37500),
      setTimeout(() => pushNotif("rejected",  "1.0 ETH",               12, "Limit exceeded"),   40500),
      setTimeout(() => pushNotif("error",     "800 USDC",               3, "Network timeout"),   43500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useLayoutEffect(() => {
    if (notifEntering || !marqueeRef.current || !marqueeInnerRef.current || !activeNotif) {
      setMarqueeScrollX(0);
      return;
    }
    const container = marqueeRef.current.offsetWidth;
    const content = marqueeInnerRef.current.scrollWidth;
    const overflow = content - container;
    setMarqueeScrollX(overflow > 0 ? overflow + 12 : 0);
  }, [activeNotif?.elapsed, activeNotif?.id, notifEntering]);

  // ── Tab navigation ──
  const validTabs = useRef(APP_VALID_TABS);
  const [activeTab, setActiveTab] = useState(_appInit.link.tab);
  const [tabTransition, setTabTransition] = useState(null);
  const [walletInitialCoin, setWalletInitialCoin] = useState(_appInit.walletCoin);
  const [walletInitialAction, setWalletInitialAction] = useState(_appInit.walletAction);
  const [walletRouteKey, setWalletRouteKey] = useState(0);
  const [walletHighlightNotif, setWalletHighlightNotif] = useState(null);
  const walletRouteRef = useRef({ coin: _appInit.walletCoin, action: _appInit.walletAction || "coin" });
  const suppressWalletRouteSyncRef = useRef(false);
  const suppressWalletRouteTimerRef = useRef(null);
  const deepLinkBootRef = useRef(true);
  const prevTabRef = useRef("convert");
  const tabTimerRef = useRef(null);
  useEffect(() => () => {
    if (tabTimerRef.current) clearTimeout(tabTimerRef.current);
    if (suppressWalletRouteTimerRef.current) clearTimeout(suppressWalletRouteTimerRef.current);
  }, []);

  // Sliding pill state
  const notchRef = useRef(null);
  const notchInnerRef = useRef(null);
  const tabRefs = useRef({});
  const [pillPos, setPillPos] = useState({ left: 0, width: 0 });
  const [pillWobble, setPillWobble] = useState(false);

  const notchTabIds = useMemo(() => ["convert", ...AppPages.getAll().filter(p => p.notchTab).map(p => p.id)], []);

  const lastNotchTabRef = useRef("convert");
  const measurePill = useCallback((tab) => {
    const container = notchInnerRef.current;
    // For non-notch tabs, keep pill on its last notch-tab position (don't slide)
    const pillTab = notchTabIds.includes(tab) ? tab : lastNotchTabRef.current;
    if (notchTabIds.includes(tab)) lastNotchTabRef.current = tab;
    const btn = tabRefs.current[pillTab];
    if (!container || !btn) return;
    // offset* avoids scale-transform skew from explore-mode getBoundingClientRect()
    setPillPos({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [notchTabIds]);

  useLayoutEffect(() => { measurePill(activeTab); }, [activeTab, notchExplore, notchHovered, activeNotif?.id, measurePill]);
  useEffect(() => {
    const el = notchRef.current;
    if (!el) return;
    const onTransitionEnd = (e) => {
      if (e.target !== el) return;
      if (e.propertyName === "transform" || e.propertyName === "padding") measurePill(activeTab);
    };
    el.addEventListener("transitionend", onTransitionEnd);
    return () => el.removeEventListener("transitionend", onTransitionEnd);
  }, [activeTab, measurePill]);
  useEffect(() => {
    const inner = notchInnerRef.current;
    if (!inner) return;
    const onTransitionEnd = (e) => {
      if (e.propertyName !== "padding" && e.propertyName !== "font-size" && e.propertyName !== "min-height") return;
      measurePill(activeTab);
    };
    inner.addEventListener("transitionend", onTransitionEnd);
    return () => inner.removeEventListener("transitionend", onTransitionEnd);
  }, [activeTab, measurePill]);
  useEffect(() => {
    // Re-measure when the nav resizes (e.g. window crosses a breakpoint and tab
    // padding/font-size change), so the pill keeps fitting the active tab.
    const inner = notchInnerRef.current;
    if (!inner || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measurePill(activeTab));
    ro.observe(inner);
    return () => ro.disconnect();
  }, [activeTab, measurePill]);
  useEffect(() => {
    const threshold = 56;
    const onScroll = () => setNotchExplore(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    // Re-measure once fonts load (initial layout may use fallback font metrics)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => measurePill(activeTab));
    }
    // Also re-measure after a short delay as a fallback
    const t = setTimeout(() => measurePill(activeTab), 100);
    return () => clearTimeout(t);
  }, []);

  const applyDeepLink = useCallback((link) => {
    if (!link || !validTabs.current.has(link.tab)) return;
    if (link.buy && CONVERTER_TICKERS.has(link.buy)) setBuyAsset(link.buy);
    if (link.spend && CONVERTER_TICKERS.has(link.spend)) setSpendAsset(link.spend);
    if (link.tab === "wallet" && link.coin && window.COINS?.[link.coin]) {
      setWalletInitialCoin(link.coin);
      setWalletInitialAction(link.action || "coin");
      walletRouteRef.current = { coin: link.coin, action: link.action || "coin" };
      setWalletRouteKey(k => k + 1);
    } else if (link.tab !== "wallet") {
      setWalletInitialCoin(null);
      setWalletInitialAction(null);
    }
    if (link.tab !== activeTab && !tabTransition) {
      prevTabRef.current = activeTab;
      measurePill(link.tab);
      setActiveTab(link.tab);
      setTabTransition("in");
      tabTimerRef.current = setTimeout(() => setTabTransition(null), animMs(260));
    }
  }, [activeTab, tabTransition, measurePill]);

  const syncAppUrl = useCallback((overrides) => {
    if (typeof window.buildAppLink !== "function") return;
    const wr = walletRouteRef.current;
    const url = window.buildAppLink({
      tab: overrides?.tab ?? activeTab,
      buy: overrides?.buy ?? buyAsset,
      spend: overrides?.spend ?? spendAsset,
      coin: overrides?.coin !== undefined ? overrides.coin : (activeTab === "wallet" ? wr.coin : null),
      action: overrides?.action !== undefined ? overrides.action : (activeTab === "wallet" ? wr.action : null),
    });
    history.replaceState(null, "", url);
  }, [activeTab, buyAsset, spendAsset]);

  const onWalletRouteChange = useCallback(({ coin, action }) => {
    if (suppressWalletRouteSyncRef.current && !coin) {
      suppressWalletRouteSyncRef.current = false;
      if (suppressWalletRouteTimerRef.current) clearTimeout(suppressWalletRouteTimerRef.current);
      walletRouteRef.current = { coin: null, action: "coin" };
      return;
    }
    walletRouteRef.current = { coin, action: action || "coin" };
    syncAppUrl({ coin, action: action || "coin" });
  }, [syncAppUrl]);

  useEffect(() => {
    if (deepLinkBootRef.current) { deepLinkBootRef.current = false; return; }
    if (CONVERTER_TICKERS.has(buyAsset) && CONVERTER_TICKERS.has(spendAsset) && buyAsset !== spendAsset) {
      window.saveConvertPair?.(buyAsset, spendAsset);
    }
    if (suppressWalletRouteSyncRef.current) return;
    syncAppUrl();
  }, [buyAsset, spendAsset, activeTab, syncAppUrl]);

  useEffect(() => {
    const onPop = () => {
      if (typeof window.parseAppLink !== "function") return;
      applyDeepLink(window.parseAppLink(validTabs.current));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyDeepLink]);

  useEffect(() => {
    if (typeof window.parseAppLink !== "function") return;
    applyDeepLink(window.parseAppLink(validTabs.current));
  }, [applyDeepLink]);

  const switchTab = (tab, route = {}) => {
    if (tab !== "wallet") {
      setWalletInitialCoin(null);
      setWalletInitialAction(null);
      setWalletHighlightNotif(null);
      walletRouteRef.current = { coin: null, action: "coin" };
    }
    if (tab === activeTab || tabTransition) return;
    const url = typeof window.buildAppLink === "function"
      ? window.buildAppLink({
          tab,
          buy: route.buy ?? buyAsset,
          spend: route.spend ?? spendAsset,
          coin: tab === "wallet" ? walletRouteRef.current.coin : null,
          action: tab === "wallet" ? walletRouteRef.current.action : null,
        })
      : (tab === "convert" ? window.location.pathname : "#" + tab);
    history.pushState(null, "", url);
    prevTabRef.current = activeTab;
    measurePill(tab);
    if (isHeavy()) setPillWobble(true);
    setTabTransition("out");
    tabTimerRef.current = setTimeout(() => {
      setActiveTab(tab);
      setTabTransition("in");
      tabTimerRef.current = setTimeout(() => setTabTransition(null), animMs(260));
    }, animMs(200));
  };

  const handleWalletAction = (ticker) => {
    setWalletInitialCoin(ticker);
    setWalletInitialAction("coin");
    walletRouteRef.current = { coin: ticker, action: "coin" };
    setWalletRouteKey(k => k + 1);
    switchTab("wallet");
  };

  const handleBuyConvert = (ticker) => {
    if (CONVERTER_COINS[ticker]) setBuyAsset(ticker);
    switchTab("convert", { buy: CONVERTER_COINS[ticker] ? ticker : buyAsset, spend: spendAsset });
  };

  const handleNavigateToConvert = ({ buyAsset: b, spendAsset: s }) => {
    const nextBuy = b && CONVERTER_COINS[b] ? b : buyAsset;
    const nextSpend = s && CONVERTER_COINS[s] ? s : spendAsset;
    suppressWalletRouteSyncRef.current = true;
    if (suppressWalletRouteTimerRef.current) clearTimeout(suppressWalletRouteTimerRef.current);
    suppressWalletRouteTimerRef.current = setTimeout(() => {
      suppressWalletRouteSyncRef.current = false;
    }, animMs(520));
    setBuyAsset(nextBuy);
    setSpendAsset(nextSpend);
    switchTab("convert", { buy: nextBuy, spend: nextSpend });
  };

  const closeAll = () => { setShowBuySelect(false); setShowSpendSelect(false); };

  // Clear both fields with staggered animation
  const clearAllRef = useRef(null);
  const clearAllFields = () => {
    setActiveField(null);
    setBuyValue("");
    cancelRateLock();
    setQuoteExpired(false);
    setQuoteStartTime(null);
    quotedRateRef.current = null;
    if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setQuoteLoadingField(null);
    if (clearAllRef.current) clearTimeout(clearAllRef.current);
    clearAllRef.current = setTimeout(() => setSpendValue(""), animMs(280));
  };
  useEffect(() => () => { if (clearAllRef.current) clearTimeout(clearAllRef.current); }, []);

  // Document-level ESC — clears both fields even when no input is focused
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== "Escape") return;
      if (activeTab !== "convert") return;
      // Skip if an input inside the component is focused (its own ESC handler will fire)
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
      if (buyValue || spendValue) { e.preventDefault(); clearAllFields(); }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [buyValue, spendValue, activeTab]);

  // Requote — re-compute with fresh rate and loading animation
  // Optional callback fires after the quote finishes (used by buy flow)
  const requote = (onDone = null) => {
    const bv = buyValue, sv = spendValue;
    // Determine which field to re-derive based on which had the original input
    // activeField may be null after swap — default to spend→buy direction
    if (activeField !== "buy" && sv) {
      setQuoteLoadingField("both");
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      const n = Number(sv);
      quoteTimerRef.current = setTimeout(() => {
        quotedRateRef.current = rateRef.current;
        setBuyValue((n * rateRef.current).toFixed(countDecimals(buyInfo.decimals)));
        setQuoteLoadingField(null);
        setQuoteExpired(false);
        startQuoteExpiry();
        flashRateUpdated();
        if (onDone) onDone();
      }, QUOTE_DELAY);
    } else if (bv) {
      setActiveField("buy");
      setQuoteLoadingField("both");
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      const n = Number(bv);
      quoteTimerRef.current = setTimeout(() => {
        quotedRateRef.current = rateRef.current;
        setSpendValue((n / rateRef.current).toFixed(countDecimals(spendInfo.decimals)));
        setQuoteLoadingField(null);
        setQuoteExpired(false);
        startQuoteExpiry();
        flashRateUpdated();
        if (onDone) onDone();
      }, QUOTE_DELAY);
    }
  };

  // Buy = open review modal directly with locked-in quote
  const buyWithFreshQuote = () => {
    if (!canBuy) return;
    setModal("review");
  };

  // Rate loading on coin change (swap controls its own timing via swapRequotingRef)
  useEffect(() => {
    setRateLoading(true);
    if (swapRequotingRef.current) return;
    const t = setTimeout(() => setRateLoading(false), 600);
    return () => clearTimeout(t);
  }, [buyAsset, spendAsset]);

  // Live rate ticker — single shared HxMarket feed, so every page agrees
  useEffect(() => {
    return window.HxMarket.subscribe((m) => {
      setRates(m.getRates());
      const d = m.getDir(spendAsset);
      if (d) setRateDir(d);
    });
  }, [spendAsset, buyAsset]);

  const rate = getRate(rates, spendAsset, buyAsset);
  const buyInfo = useMemo(() => ({ ...CONVERTER_COINS[buyAsset], balance: balances[buyAsset] }), [buyAsset, balances]);
  const spendInfo = useMemo(() => ({ ...CONVERTER_COINS[spendAsset], balance: balances[spendAsset] }), [spendAsset, balances]);

  // Rate locking — holds rate steady while user is actively typing
  const [rateLocked, setRateLocked] = useState(false);
  const [rateJustUnlocked, setRateJustUnlocked] = useState(false);
  const lockedRateRef = useRef(null);
  const unlockTimerRef = useRef(null);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const rateUpdatedTimerRef = useRef(null);

  const lockCurrentRate = useCallback(() => {
    if (lockedRateRef.current === null) lockedRateRef.current = rateRef.current;
    setRateLocked(true);
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(() => {
      lockedRateRef.current = null;
      setRateLocked(false);
      setRateJustUnlocked(true);
      if (rateUpdatedTimerRef.current) clearTimeout(rateUpdatedTimerRef.current);
      rateUpdatedTimerRef.current = setTimeout(() => setRateJustUnlocked(false), 800);
    }, 2000);
  }, []);

  const cancelRateLock = useCallback(() => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = null;
    lockedRateRef.current = null;
    setRateLocked(false);
  }, []);

  useEffect(() => () => { if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current); }, []);
  const flashRateUpdated = useCallback(() => {
    setRateJustUnlocked(true);
    if (rateUpdatedTimerRef.current) clearTimeout(rateUpdatedTimerRef.current);
    rateUpdatedTimerRef.current = setTimeout(() => setRateJustUnlocked(false), 800);
  }, []);
  useEffect(() => () => { if (rateUpdatedTimerRef.current) clearTimeout(rateUpdatedTimerRef.current); }, []);

  const effectiveRate = rateLocked && lockedRateRef.current !== null ? lockedRateRef.current : rate;

  // Quote loading state — shows pulse animation on the receiving field
  const [quoteLoadingField, setQuoteLoadingField] = useState(null);
  const flowPreviewRef = useRef(flowPreview);
  flowPreviewRef.current = flowPreview;
  const quoteTimerRef = useRef(null);
  const swapQuoteTimerRef = useRef(null); // separate ref so cross-compute cleanup can't kill it
  const swapRequotingRef = useRef(false); // flag so coin-change effect defers to swap timing
  const quoteExpiryRef = useRef(null);
  const quotedRateRef = useRef(null); // the rate the current quote was computed at

  // Active quote = both fields have values, not loading, not expired
  const hasActiveQuote = !!(buyValue && Number(buyValue) > 0 && spendValue && Number(spendValue) > 0 && !quoteLoadingField && !quoteExpired);

  // Rate to display — frozen to quoted rate while quote is active, live when expired/no quote
  const displayRate = hasActiveQuote && quotedRateRef.current !== null ? quotedRateRef.current : rate;

  // Start a 32s expiry countdown after a quote finishes
  const [quoteStartTime, setQuoteStartTime] = useState(null);
  const startQuoteExpiry = useCallback(() => {
    if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
    setQuoteStartTime(Date.now());
    quoteExpiryRef.current = setTimeout(() => {
      setQuoteExpired(true); setQuoteStartTime(null); quotedRateRef.current = null;
      setQuoteLoadingField(null);
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      if (swapQuoteTimerRef.current) clearTimeout(swapQuoteTimerRef.current);
    }, QUOTE_TTL_MS);
  }, []);
  useEffect(() => () => { if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current); }, []);
  useEffect(() => () => { if (swapQuoteTimerRef.current) clearTimeout(swapQuoteTimerRef.current); }, []);

  useEffect(() => {
    const onFlow = () => {
      const fp = typeof window.getFlowPreview === "function" ? window.getFlowPreview() : "none";
      setFlowPreview(fp);
      if (fp !== "quote") setQuoteFailed(false);
    };
    window.addEventListener("hx-flow-preview", onFlow);
    return () => window.removeEventListener("hx-flow-preview", onFlow);
  }, []);

  const flowRetry = () => {
    if (typeof window.setFlowPreview === "function") window.setFlowPreview("none");
    setQuoteFailed(false);
  };
  const sessionSignIn = () => {
    localStorage.removeItem("hx_onboarded");
    window.location.href = "onboarding.html";
  };
  const rateUnavailable = flowPreview === "rate";
  const showQuoteFailed = quoteFailed || flowPreview === "quote";

  // Cross-compute values — only triggered by user input, NOT rate ticks
  useEffect(() => {
    if (quoteExpired) return;
    if (activeField !== "spend") return;
    const n = Number(spendValue);
    if (!spendValue || !Number.isFinite(n) || n === 0) {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
      setQuoteLoadingField(null);
      setBuyValue("");
      quotedRateRef.current = null;
      cancelRateLock();
      return;
    }
    setQuoteLoadingField("buy");
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = setTimeout(() => {
      if (flowPreviewRef.current === "quote") {
        setQuoteFailed(true);
        setQuoteLoadingField(null);
        quotedRateRef.current = null;
        return;
      }
      quotedRateRef.current = rateRef.current;
      setBuyValue((n * rateRef.current).toFixed(countDecimals(buyInfo.decimals)));
      setQuoteLoadingField(null);
      setQuoteFailed(false);
      startQuoteExpiry();
      flashRateUpdated();
    }, QUOTE_DELAY);
    return () => { if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current); };
  }, [spendValue, activeField, buyInfo, quoteExpired, cancelRateLock]);

  useEffect(() => {
    if (quoteExpired) return;
    if (activeField !== "buy") return;
    const n = Number(buyValue);
    if (!buyValue || !Number.isFinite(n) || n === 0) {
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
      setQuoteLoadingField(null);
      setSpendValue("");
      quotedRateRef.current = null;
      cancelRateLock();
      return;
    }
    setQuoteLoadingField("spend");
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = setTimeout(() => {
      if (flowPreviewRef.current === "quote") {
        setQuoteFailed(true);
        setQuoteLoadingField(null);
        quotedRateRef.current = null;
        return;
      }
      quotedRateRef.current = rateRef.current;
      setSpendValue((n / rateRef.current).toFixed(countDecimals(spendInfo.decimals)));
      setQuoteLoadingField(null);
      setQuoteFailed(false);
      startQuoteExpiry();
      flashRateUpdated();
    }, QUOTE_DELAY);
    return () => { if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current); };
  }, [buyValue, activeField, spendInfo, quoteExpired, cancelRateLock]);

  // ── Swap ──
  const [swapPhase, setSwapPhase] = useState(null);
  const [swapRot, setSwapRot] = useState(0);
  const swapAnimTimerRef = useRef(null);
  const swapPhaseTimerRef = useRef(null);
  useEffect(() => () => { if (swapAnimTimerRef.current) clearTimeout(swapAnimTimerRef.current); if (swapPhaseTimerRef.current) clearTimeout(swapPhaseTimerRef.current); }, []);

  const swap = () => {
    if (swapPhase) return;
    setSwapRot(r => r + 180);
    setSwapPhase("out");
    swapAnimTimerRef.current = setTimeout(() => {
      const sb = spendAsset, ba = buyAsset, sv = spendValue, bv = buyValue;
      setBuyAsset(sb); setSpendAsset(ba); setBuyValue(sv); setSpendValue(bv);
      // Clear old quote state — rate was for the wrong pair direction
      quotedRateRef.current = null;
      setQuoteExpired(false);
      setQuoteStartTime(null);
      if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
      if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
      if (swapQuoteTimerRef.current) clearTimeout(swapQuoteTimerRef.current);
      // If both fields had values, requote with both fields animating
      if (sv && Number(sv) > 0 && bv && Number(bv) > 0) {
        setQuoteLoadingField("both");
        setActiveField(null);
        swapRequotingRef.current = true;
        // Stagger: rate rolls in 200ms before fields resolve
        swapQuoteTimerRef.current = setTimeout(() => {
          setRateLoading(false);
          swapQuoteTimerRef.current = setTimeout(() => {
            const n = Number(bv); // spend value after swap = old buyValue
            quotedRateRef.current = rateRef.current;
            setBuyValue((n * rateRef.current).toFixed(countDecimals(CONVERTER_COINS[sb].decimals)));
            setQuoteLoadingField(null);
            swapRequotingRef.current = false;
            startQuoteExpiry();
            flashRateUpdated();
          }, animMs(200));
        }, QUOTE_DELAY - animMs(200));
      } else {
        setQuoteLoadingField(null);
        setActiveField(null);
      }
      setSwapPhase("in");
      swapPhaseTimerRef.current = setTimeout(() => setSwapPhase(null), animMs(240));
    }, animMs(180));
  };

  // Swap-aware coin selection
  const selectBuyCoin = k => {
    if (k === buyAsset) return;
    if (k === spendAsset) {
      setSwapRot(r => r + 180);
      setSwapPhase("out");
      swapAnimTimerRef.current = setTimeout(() => {
        setBuyAsset(k); setSpendAsset(buyAsset);
        setBuyValue(""); setSpendValue("");
        setActiveField(null);
        setSwapPhase("in");
        swapPhaseTimerRef.current = setTimeout(() => setSwapPhase(null), animMs(240));
      }, animMs(180));
    } else {
      setBuyAsset(k);
      if (buyValue || spendValue) { setBuyValue(""); setSpendValue(""); setActiveField(null); }
    }
  };

  const selectSpendCoin = k => {
    if (k === spendAsset) return;
    if (k === buyAsset) {
      setSwapRot(r => r + 180);
      setSwapPhase("out");
      swapAnimTimerRef.current = setTimeout(() => {
        setSpendAsset(k); setBuyAsset(spendAsset);
        setBuyValue(""); setSpendValue("");
        setActiveField(null);
        setSwapPhase("in");
        swapPhaseTimerRef.current = setTimeout(() => setSwapPhase(null), animMs(240));
      }, animMs(180));
    } else {
      setSpendAsset(k);
      if (buyValue || spendValue) { setBuyValue(""); setSpendValue(""); setActiveField(null); }
    }
  };

  useEffect(() => () => { if (chartAnimTimerRef.current) clearTimeout(chartAnimTimerRef.current); }, []);

  const openPairChart = useCallback(() => {
    if (showPairChart || chartAnim !== "idle" || rateLoading || rateUnavailable) return;
    morphRectsRef.current = {
      name: compactNameRef.current?.getBoundingClientRect() || null,
      rate: compactRateRef.current?.getBoundingClientRect() || null,
    };
    setShowPairChart(true);
    setChartAnim("opening");
    if (chartAnimTimerRef.current) clearTimeout(chartAnimTimerRef.current);
    chartAnimTimerRef.current = setTimeout(() => setChartAnim("open"), animMs(440));
  }, [showPairChart, chartAnim, rateLoading, rateUnavailable]);

  const closePairChart = useCallback(() => {
    if (!showPairChart || chartAnim !== "open") return;
    setChartAnim("closing");
    if (chartAnimTimerRef.current) clearTimeout(chartAnimTimerRef.current);
    chartAnimTimerRef.current = setTimeout(() => {
      setShowPairChart(false);
      setChartAnim("idle");
      setPairChartLoading(false);
    }, animMs(440));
  }, [showPairChart, chartAnim]);

  useEffect(() => {
    if (!showPairChart) {
      prevPairKeyRef.current = pairKey;
      return;
    }
    if (prevPairKeyRef.current === pairKey) return;
    prevPairKeyRef.current = pairKey;
    setPairChartLoading(true);
    const t = setTimeout(() => setPairChartLoading(false), animMs(420));
    return () => clearTimeout(t);
  }, [pairKey, showPairChart]);

  useLayoutEffect(() => {
    if (chartAnim !== "opening" || !showPairChart || pairChartLoading) return;
    const panel = chartPanelRef.current;
    const from = morphRectsRef.current;
    if (!panel || !from?.name || !from?.rate) return;

    const chartName = panel.querySelector(".cv-mkt-name");
    const chartPrice = panel.querySelector(".cv-mkt-price");
    const chartCanvas = panel.querySelector(".cv-mkt-chart-wrap");
    const chartSub = panel.querySelector(".cv-mkt-sub");
    const chartIcon = panel.querySelector(".cv-mkt-icon");
    const chartChange = panel.querySelector(".cv-mkt-change");
    if (!chartName || !chartPrice) return;

    const morphEase = "cubic-bezier(.22,.8,.36,1)";
    const resetEl = (el) => {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
    };
    const nFrom = from.name;
    const rFrom = from.rate;
    const nTo = chartName.getBoundingClientRect();
    const pTo = chartPrice.getBoundingClientRect();
    const nameDx = nFrom.left + nFrom.width / 2 - (nTo.left + nTo.width / 2);
    const nameDy = nFrom.top + nFrom.height / 2 - (nTo.top + nTo.height / 2);
    const priceDx = rFrom.left + rFrom.width / 2 - (pTo.left + pTo.width / 2);
    const priceDy = rFrom.top + rFrom.height / 2 - (pTo.top + pTo.height / 2);
    const nameScale = Math.max(0.85, Math.min(1.2, nFrom.width / Math.max(nTo.width, 1)));
    const priceScale = Math.max(0.85, Math.min(1.25, rFrom.width / Math.max(pTo.width, 1)));

    [chartSub, chartIcon, chartChange].forEach(el => { if (el) el.style.opacity = "0"; });
    chartName.style.transformOrigin = "center center";
    chartPrice.style.transformOrigin = "center center";
    chartName.style.transform = `translate(${nameDx}px, ${nameDy}px) scale(${nameScale})`;
    chartPrice.style.transform = `translate(${priceDx}px, ${priceDy}px) scale(${priceScale})`;
    if (chartCanvas) {
      chartCanvas.style.opacity = "0";
      chartCanvas.style.transform = "translateY(10px)";
    }

    requestAnimationFrame(() => {
      chartName.style.transition = `transform 420ms ${morphEase}, opacity 260ms ease`;
      chartPrice.style.transition = `transform 420ms ${morphEase}, opacity 260ms ease`;
      chartName.style.transform = "";
      chartPrice.style.transform = "";
      [chartSub, chartIcon, chartChange].forEach(el => {
        if (!el) return;
        el.style.transition = "opacity 320ms ease 180ms";
        el.style.opacity = "1";
      });
      if (chartCanvas) {
        chartCanvas.style.transition = `opacity 360ms ${morphEase} 140ms, transform 360ms ${morphEase} 140ms`;
        chartCanvas.style.opacity = "1";
        chartCanvas.style.transform = "";
      }
      window.setTimeout(() => {
        [chartName, chartPrice, chartCanvas, chartSub, chartIcon, chartChange].forEach(resetEl);
      }, 480);
    });
  }, [chartAnim, showPairChart, pairChartLoading, buyAsset, spendAsset]);

  // Wrapped onChange handlers — lock rate while user is actively inputting
  // Re-set activeField on non-empty input (ESC/X nulls it, but input stays focused so onFocus won't re-fire)
  const handleBuyChange = useCallback(val => {
    if (val) { lockCurrentRate(); setActiveField("buy"); setQuoteExpired(false); setQuoteStartTime(null); if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current); }
    setBuyValue(val);
  }, [lockCurrentRate]);
  const handleSpendChange = useCallback(val => {
    if (val) { lockCurrentRate(); setActiveField("spend"); setQuoteExpired(false); setQuoteStartTime(null); if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current); }
    setSpendValue(val);
  }, [lockCurrentRate]);

  // When X or ESC clears a field, also clear the other field (if it has a value)
  const onBuyClear = useCallback(() => {
    setActiveField(null);
    cancelRateLock();
    setQuoteExpired(false);
    setQuoteStartTime(null);
    quotedRateRef.current = null;
    if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setQuoteLoadingField(null);
    if (spendValue) setTimeout(() => setSpendValue(""), 150);
  }, [spendValue, cancelRateLock]);
  const onSpendClear = useCallback(() => {
    setActiveField(null);
    cancelRateLock();
    setQuoteExpired(false);
    setQuoteStartTime(null);
    quotedRateRef.current = null;
    if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current);
    if (quoteTimerRef.current) clearTimeout(quoteTimerRef.current);
    setQuoteLoadingField(null);
    if (buyValue) setTimeout(() => setBuyValue(""), 150);
  }, [buyValue, cancelRateLock]);

  // Balance click = 100%
  const spendMax = () => { lockCurrentRate(); setActiveField("spend"); setSpendValue(spendInfo.balance.toFixed(countDecimals(spendInfo.decimals))); };
  const buyMax = () => { lockCurrentRate(); setActiveField("buy"); setBuyValue(buyInfo.balance.toFixed(countDecimals(buyInfo.decimals))); };

  // Input refs for refocusing after percent clicks
  const buyInputRef = useRef(null);

  const spendInputRef = useRef(null);

  // Percent adjusters — refocus input so ESC still works
  const handleSpendPct = val => { lockCurrentRate(); setQuoteExpired(false); setQuoteStartTime(null); if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current); setActiveField("spend"); setSpendValue(val); spendInputRef.current?.focus(); };
  const handleBuyPct = val => { lockCurrentRate(); setQuoteExpired(false); setQuoteStartTime(null); if (quoteExpiryRef.current) clearTimeout(quoteExpiryRef.current); setActiveField("buy"); setBuyValue(val); buyInputRef.current?.focus(); };

  const spendExceeds = spendValue && Number(spendValue) > spendInfo.balance;
  const canBuy = spendValue && Number(spendValue) > 0 && buyValue && Number(buyValue) > 0 && !spendExceeds && !quoteLoadingField && !rateUnavailable && !showQuoteFailed;

  // ── Tab page animation ──
  const TAB_ORDER = ["convert", ...AppPages.getOrder()];
  const goingRight = TAB_ORDER.indexOf(activeTab) < TAB_ORDER.indexOf(prevTabRef.current);

  const getPageAnim = (page) => {
    if (!tabTransition) return "none";
    const ease = getEasing();
    const h = isHeavy() ? "H" : "";
    if (tabTransition === "out" && page === prevTabRef.current)
      return goingRight
        ? `cvPageOutRight${h} 200ms ${ease} forwards`
        : `cvPageOutLeft${h} 200ms ${ease} forwards`;
    if (tabTransition === "in" && page === activeTab)
      return goingRight
        ? `cvPageInRight${h} 260ms ${ease} both`
        : `cvPageInLeft${h} 260ms ${ease} both`;
    return "none";
  };

  const convertVisible = activeTab === "convert" || (tabTransition === "out" && prevTabRef.current === "convert");
  const pageVisibility = {};
  AppPages.getAll().forEach(p => {
    pageVisibility[p.id] = activeTab === p.id ||
      (tabTransition === "out" && prevTabRef.current === p.id);
  });

  const { buy: buyCardStyle, spend: spendCardStyle } = getConvertCardStyles(buyInfo.color, swapPhase);
  const compactWrapGone = showPairChart && chartAnim !== "closing";
  const chartExpanded = showPairChart && chartAnim !== "closing";
  const rateCompactSkel = !showPairChart && !!swapPhase;
  const chartQuoteBadge = (hasActiveQuote || quoteLoadingField) ? (
    <QuoteBadge loading={!!quoteLoadingField} quoting={!!quoteLoadingField} startTime={quoteStartTime} ttl={QUOTE_TTL_MS} />
  ) : null;

  const pageProps = {
    wallet: {
      onNavigate: switchTab,
      initialCoin: walletInitialCoin,
      initialAction: walletInitialAction,
      initialRouteKey: walletRouteKey,
      highlightNotif: walletHighlightNotif,
      onNavigateToConvert: handleNavigateToConvert,
      onRouteChange: onWalletRouteChange,
    },
    markets: { onWalletAction: handleWalletAction, onBuyConvert: handleBuyConvert },
    settings: { onNavigate: switchTab },
    api: { onNavigate: switchTab },
  };

  if (flowPreview === "session" && window.FlowDeadEnd) {
    return (
      <div style={{ minHeight: "100vh", background: "#16161e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "90px 16px 48px", fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {window.FlowDeadEnd({ variant: "session", fill: true, onAction: sessionSignIn })}
      </div>
    );
  }

  return (
    <div className="cv-app" style={{ minHeight: "100vh", background: "#16161e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "max(90px,calc(env(safe-area-inset-top,0px) + 72px)) max(16px,env(safe-area-inset-right,0px)) max(82px,calc(env(safe-area-inset-bottom,0px) + 34px)) max(16px,env(safe-area-inset-left,0px))", fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="cv-shell" style={{ position: "relative" }}>
        {flowPreview === "offline" && window.FlowDeadEnd && window.FlowDeadEnd({ variant: "offline", overlay: true, onAction: flowRetry })}
        {/* Convert page */}
        <div style={{ display: convertVisible ? "block" : "none", animation: getPageAnim("convert"), paddingTop: chartExpanded ? 8 : 20 }}>
        <div className="cv-convert-top">
          <div className={"cv-rate-compact-wrap" + (compactWrapGone ? " cv-rate-compact-wrap--gone" : "")}>
            <div className={"cv-rate-compact" + (chartAnim === "opening" ? " cv-rate-compact--leaving" : "")}>
              <span
                ref={compactNameRef}
                key={`hb-${spendAsset}-${buyAsset}`}
                className="cv-rate-buy-name"
                style={{ display: "inline-block", fontSize: 13, fontWeight: 600, color: CONVERTER_COINS[buyAsset].color, animation: swapPhase === "out" ? "cvHdrOut 170ms ease 60ms forwards" : swapPhase === "in" ? "cvHdrIn 220ms ease 40ms both" : "none" }}
              >
                {CONVERTER_COINS[buyAsset].name}
              </span>
              <span className="cv-rate-eq" style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>=</span>
              {rateLoading || rateCompactSkel
                ? <span className="hx-sk" style={{ width: 72, height: 14, display: "inline-block", borderRadius: 4 }} />
                : rateUnavailable
                  ? <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(248,113,113,.8)", letterSpacing: ".04em" }}>Unavailable</span>
                  : <button
                      ref={compactRateRef}
                      type="button"
                      className="cv-rate-amt"
                      onClick={openPairChart}
                      aria-expanded={showPairChart}
                      aria-controls="cv-pair-chart-panel"
                      title="Show pair chart"
                    >
                      <RollingRate rate={1 / displayRate} decimals={(1 / displayRate) >= 100 ? 2 : (1 / displayRate) >= 1 ? 4 : 8} direction={hasActiveQuote ? null : rateDir === "up" ? "down" : rateDir === "down" ? "up" : null} rollIn />
                    </button>
              }
              <span className="cv-rate-spend" style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>{spendAsset}</span>
              {(hasActiveQuote || quoteLoadingField) && (
                <span className="cv-rate-quote">{chartQuoteBadge}</span>
              )}
            </div>
          </div>

          <div className={"cv-pair-chart-outer" + (chartExpanded ? " cv-pair-chart-outer--open" : "")}>
            <div className="cv-pair-chart-inner">
              {showPairChart && !rateUnavailable && (
                <ConvertPairPanel
                  panelRef={chartPanelRef}
                  top
                  buyAsset={buyAsset}
                  spendAsset={spendAsset}
                  rates={rates}
                  loading={pairChartLoading}
                  onClose={closePairChart}
                  quoteBadge={chartQuoteBadge}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className={"cv-convert-cards" + (chartExpanded && chartAnim === "open" ? " cv-convert-cards--chart" : "")} style={{ position: "relative", overflow: "visible" }}>
          {/* BUY card (top) — primary focus, slightly elevated */}
          <div style={buyCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: buyInfo.color, padding: "2px 8px", borderRadius: 5, background: `${buyInfo.color}24`, border: `1px solid ${buyInfo.color}38`, flexShrink: 0 }}>Buy</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.9)", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Receive <span style={{ color: buyInfo.color }}>{buyInfo.name}</span>
                </span>
              </div>
              <ConvertBalRow balance={buyInfo.balance} decimals={buyInfo.decimals} onMax={buyMax} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 8, marginBottom: 6, transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(3px)" : "none" }}>
              <CoinSelect current={buyAsset} onSelect={selectBuyCoin} show={showBuySelect} setShow={setShowBuySelect} closeAll={closeAll} exclude={spendAsset} hotkeys={true} />
              <PctAdjuster balance={buyInfo.balance} decimals={buyInfo.decimals} currentValue={buyValue} onSet={handleBuyPct} />
            </div>
            <div onFocus={() => setActiveField("buy")} style={{ transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(3px)" : "none" }}>
              <RollingAmountInput value={buyValue} onChange={handleBuyChange} onClear={onBuyClear} inputRef={buyInputRef} loading={quoteLoadingField === "buy" || quoteLoadingField === "both"} balance={buyInfo.balance} step={buyInfo.decimals} max={100_000_000}
                placeholder={`0.00 ${buyAsset}`} suffix={buyAsset} fadeColor="rgb(25,25,31)" ariaLabel={`Amount of ${buyInfo.name} to buy`}
                displayAnim={swapPhase === "out" ? "cvSwapOutDown 170ms ease forwards" : swapPhase === "in" ? "cvSwapInUp 220ms ease both" : null}
                onEnter={buyWithFreshQuote} />
            </div>
          </div>

          {/* Swap notch */}
          <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 15, height: 16 }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(-50%, -50%) scale(${swapPhase === "out" ? 0.92 : 1})`,
              width: 42, height: 42, borderRadius: "50%", background: "#121218",
              display: "grid", placeItems: "center",
              transition: "transform 300ms cubic-bezier(.2,.8,.2,1)",
            }}>
              <button tabIndex={-1} onClick={swap} title="Swap assets" aria-label="Swap buy and spend assets"
                style={{
                  width: 30, height: 30, borderRadius: "50%", border: "none",
                  background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.4)",
                  cursor: "pointer", display: "grid", placeItems: "center",
                  fontSize: 12, fontFamily: "inherit",
                  transition: "transform 400ms cubic-bezier(.2,.8,.2,1) 40ms, background 120ms, color 120ms, box-shadow 180ms 40ms",
                  transform: `rotate(${swapRot}deg) scale(${swapPhase === "out" ? 0.88 : 1})`,
                  boxShadow: swapPhase === "out" ? "inset 0 2px 5px rgba(0,0,0,.5)" : "inset 0 1px 2px rgba(0,0,0,.2)",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.1)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = "rgba(255,255,255,.4)"; }}>
                <span style={{ display: "inline-block", transition: `transform 400ms cubic-bezier(.2,.8,.2,1) 80ms`, transform: `scale(${swapPhase === "out" ? 0.82 : 1})` }}>⇅</span>
              </button>
            </div>
          </div>

          {/* SPEND card (bottom) — recessed */}
          <div style={spendCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.28)" }}>
                You pay <span style={{ color: spendInfo.color, opacity: 0.55 }}>{spendInfo.name}</span>
              </div>
              <ConvertBalRow balance={spendInfo.balance} decimals={spendInfo.decimals} onMax={spendMax} labelMuted />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", rowGap: 8, marginBottom: 6, transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(-3px)" : "none" }}>
              <CoinSelect current={spendAsset} onSelect={selectSpendCoin} show={showSpendSelect} setShow={setShowSpendSelect} closeAll={closeAll} exclude={buyAsset} hotkeys={true} hotkeyList={HOTKEY_COINS_SPEND} />
              <PctAdjuster balance={spendInfo.balance} decimals={spendInfo.decimals} currentValue={spendValue} onSet={handleSpendPct} />
            </div>
            <div onFocus={() => setActiveField("spend")} style={{ transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(-3px)" : "none" }}>
              <RollingAmountInput value={spendValue} onChange={handleSpendChange} onClear={onSpendClear} inputRef={spendInputRef} loading={quoteLoadingField === "spend" || quoteLoadingField === "both"} balance={spendInfo.balance} step={spendInfo.decimals} max={100_000_000}
                placeholder={`0.00 ${spendAsset}`} suffix={spendAsset} fadeColor="rgb(25,25,31)" warnExceedsBalance={true} ariaLabel={`Amount of ${spendInfo.name} to spend`}
                displayAnim={swapPhase === "out" ? "cvSwapOutUp 170ms ease forwards" : swapPhase === "in" ? "cvSwapInDown 220ms ease both" : null}
                onEnter={buyWithFreshQuote} />
            </div>
          </div>
        </div>

        {rateUnavailable && window.FlowBanner && window.FlowBanner({
          tone: "err",
          title: "Rates unavailable",
          message: "We couldn't load exchange rates. Quotes and conversions are paused until rates return.",
          actionLabel: "Retry",
          onAction: flowRetry,
        })}

        {showQuoteFailed && window.FlowBanner && window.FlowBanner({
          tone: "err",
          title: "Quote failed",
          message: "We couldn't get a price for this pair. Check your amount and try again.",
          actionLabel: "Try again",
          onAction: () => { flowRetry(); if (spendValue || buyValue) requote(); },
        })}

        {/* Quote expired banner */}
        {quoteExpired && !showQuoteFailed && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 10,
            background: "rgba(250,200,50,.06)", border: "1px solid rgba(250,200,50,.15)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 11, color: "rgba(250,204,21,.8)", lineHeight: 1.4, flex: 1 }}>
              Your price quote has expired. Click <strong>Requote</strong> to get a fresh price with your current amounts.
            </span>
          </div>
        )}

        {/* Buy / Requote button */}
        {quoteExpired ? (
          <button tabIndex={-1} onClick={() => requote()}
            style={{
              width: "100%", height: 48, marginTop: 12, borderRadius: 12, border: "1px solid rgba(250,204,21,.25)",
              background: "rgba(250,204,21,.08)", color: "rgba(250,204,21,.9)",
              fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.02em", transition: "all 200ms",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(250,204,21,.14)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(250,204,21,.08)"; }}>
            {quoteLoadingField ? "Preparing your order..." : "Requote"}
          </button>
        ) : (
          <button tabIndex={-1} onClick={buyWithFreshQuote} aria-label={spendExceeds ? "Insufficient balance" : `Buy ${buyAsset}`} aria-disabled={!canBuy || undefined}
            style={{
              width: "100%", height: 48, marginTop: 16, borderRadius: 12,
              border: spendExceeds ? "1px solid rgba(255,80,80,.25)" : 0, fontFamily: "inherit",
              background: spendExceeds ? "rgba(255,60,60,.08)" : `linear-gradient(135deg, ${CONVERTER_COINS[buyAsset].color}, ${CONVERTER_COINS[buyAsset].color}cc)`,
              color: spendExceeds ? "rgba(255,100,100,.7)" : "#fff",
              fontSize: 15, fontWeight: 700, cursor: canBuy ? "pointer" : "default",
              letterSpacing: "0.02em", transition: "all 200ms",
              boxShadow: canBuy ? `0 4px 20px ${CONVERTER_COINS[buyAsset].color}33` : "none",
              opacity: canBuy ? 1 : spendExceeds ? 1 : 0.35,
            }}
            onMouseEnter={e => { if (canBuy) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 24px ${CONVERTER_COINS[buyAsset].color}55`; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = canBuy ? `0 4px 20px ${CONVERTER_COINS[buyAsset].color}33` : "none"; }}>
            {spendExceeds ? "Insufficient balance" : `Buy ${buyAsset}`}
          </button>
        )}

        {/* Footer hints */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 10, gap: 6, rowGap: 4, fontSize: 9, color: "rgba(255,255,255,.15)", fontFamily: "inherit" }}>
          <span>↑↓ step</span><span>·</span><span>⇧×10</span><span>·</span><span>Hold accel</span><span>·</span><span>Esc clr</span><span>·</span><span>↵ confirm</span>
          {(buyValue || spendValue) && <>
            <span>·</span>
            <button tabIndex={-1} onClick={clearAllFields}
              style={{ fontSize: 9, color: "rgba(255,255,255,.25)", background: "none", border: "1px solid rgba(255,255,255,.08)", borderRadius: 3, padding: "0 5px", cursor: "pointer", fontFamily: "inherit", lineHeight: "16px", transition: "all 120ms" }}
              onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,.25)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; }}>
              Clear All
            </button>
          </>}
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
          <button type="button" className="cv-mkt-all-link" onClick={() => switchTab("markets")}>
            See all markets ›
          </button>
        </div>
        </div>{/* /Convert page */}

        {/* Non-fullWidth pages (inside 460px wrapper) */}
        {AppPages.getAll().filter(p => !p.fullWidth).map(p => {
          const visible = pageVisibility[p.id];
          if (!visible) return null;
          const Comp = p.component;
          const props = { embedded: true, ...(pageProps[p.id] || {}) };
          return (
            <div key={p.id} style={{ display: visible ? "block" : "none", animation: getPageAnim(p.id), paddingTop: 0 }}>
              <Comp {...props} />
            </div>
          );
        })}

      </div>

      {/* FullWidth pages (outside 460px wrapper) */}
      {AppPages.getAll().filter(p => p.fullWidth).map(p => {
        const visible = pageVisibility[p.id];
        if (!visible) return null;
        const Comp = p.component;
        const props = { embedded: true, ...(pageProps[p.id] || {}) };
        return (
          <div
            key={p.id}
            className={p.id === "markets" ? "cv-page-markets" : "cv-page-wide"}
            style={{ display: visible ? "block" : "none", animation: getPageAnim(p.id), paddingTop: 0, width: "100%", maxWidth: p.id === "markets" ? "min(1100px, 100%)" : p.id === "trade" ? "min(1240px, 100%)" : p.id === "wallet" ? "min(860px, 100%)" : 460, margin: "0 auto", paddingLeft: "max(0px, env(safe-area-inset-left))", paddingRight: "max(0px, env(safe-area-inset-right))" }}
          >
            <Comp {...props} />
          </div>
        );
      })}


      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {rateLocked ? `Rate held at 1 ${buyAsset} equals ${(1 / effectiveRate).toFixed(4)} ${spendAsset}` : ""}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {rateJustUnlocked ? `Rate updated to 1 ${buyAsset} equals ${(1 / rate).toFixed(4)} ${spendAsset}` : ""}
      </div>

      {/* Modals */}
      {modal === "review" && (
        <ReviewModal buyAsset={buyAsset} spendAsset={spendAsset} buyValue={buyValue} spendValue={spendValue} rate={displayRate}
          quoteStartTime={quoteStartTime} quoteTtl={QUOTE_TTL_MS}
          onBack={(wasExpired) => { setModal(null); if (wasExpired) setQuoteExpired(true); }}
          onConfirm={() => { playSuccessSound(); setModal("success"); }}
          onExpire={() => {}} />
      )}
      {modal === "success" && (
        <SuccessModal buyAsset={buyAsset} buyValue={buyValue}
          onDone={() => {
            const spentNum = Number(spendValue);
            const boughtNum = Number(buyValue);
            setModal(null);
            setSpendValue("");
            setBuyValue("");
            setTimeout(() => {
              setBalances(b => ({
                ...b,
                [spendAsset]: Math.max(0, b[spendAsset] - spentNum),
                [buyAsset]: b[buyAsset] + boughtNum,
              }));
            }, 400);
          }} />
      )}

      {/* Tab notch — rendered last so it stacks above in-page overlays (wallet modals sit under a transform animation ancestor). */}
      <div ref={notchRef} className={`cv-notch${notchExplore ? ' cv-notch--explore' : ''}${notchSettle ? ' cv-notch--wobble-settle' : ''}`}
        onMouseEnter={() => setNotchHovered(true)}
        onMouseLeave={() => setNotchHovered(false)}
        onAnimationEnd={(e) => { if (e.animationName === 'cvNotchWobble' && e.target === e.currentTarget) setNotchSettle(false); }}>
        <div className="cv-notch-inner" ref={notchInnerRef}>
          <div className={`cv-pill${pillWobble ? " cv-pill--wobble" : ""}`}
            style={{ left: pillPos.left, width: pillPos.width, opacity: notchTabIds.includes(activeTab) ? 1 : 0.3, transition: "left 400ms cubic-bezier(.4,1.3,.5,1), width 400ms cubic-bezier(.4,1.3,.5,1), opacity 250ms ease" }}
            onAnimationEnd={() => setPillWobble(false)} />
          <button className={`cv-tab${activeTab === "convert" ? " cv-tab--active" : ""}`}
            ref={el => tabRefs.current["convert"] = el} onClick={() => switchTab("convert")}>Convert</button>
          {AppPages.getAll().filter(p => p.notchTab).map(p => (
            <button key={p.id} className={`cv-tab${activeTab === p.id ? " cv-tab--active" : ""}`}
              ref={el => tabRefs.current[p.id] = el} onClick={() => switchTab(p.id)}>{p.label}</button>
          ))}
          {activeNotif && (() => {
            const nt = NOTIF_TYPES[activeNotif.phase] || NOTIF_TYPES.incoming;
            const nc = nt.color;
            const isSettled = nt.settled;
            const errorPhase = ["failed","rejected","error"].includes(activeNotif.phase) ? activeNotif.phase : null;
            return (
          <div className={`cv-notif${notifHovered ? ' cv-notif--hovered' : ''}${notifEntering ? ' cv-notif--entering' : ''}${notifExiting ? ' cv-notif--exiting' : ''}${isSettled ? ' cv-notif--deposit' : ''}${errorPhase ? ` cv-notif--${errorPhase}` : ''}`}
            style={{ '--nc': nc }}
            onClick={() => { setWalletHighlightNotif({ phase: activeNotif.phase, amount: activeNotif.amount, _t: Date.now() }); readNotif(); switchTab("wallet"); }}
            onMouseEnter={() => setNotifHovered(true)} onMouseLeave={() => setNotifHovered(false)}
            onAnimationEnd={(e) => { if (notifEntering && ['cvFlipIn','cvFlipInIcon'].includes(e.animationName)) setNotifEntering(false); if (notifExiting && e.animationName === 'cvNotifExit') { setNotifications(prev => prev.length <= 1 ? [] : prev.slice(1)); setNotifExiting(false); setNotchSettle(true); } }}>
            <div className="cv-notif-icon" style={Object.assign({}, notifHovered ? { visibility: 'hidden' } : {}, { background: `rgba(${nc},.12)` })}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: `rgba(${nc},.7)` }}>
                {getNotifIcon(activeNotif.phase)}
              </svg>
              <div className={`cv-notif-dot${notifCount > 1 ? ' cv-notif-dot--count' : ''}`}
                style={{ background: `rgba(${nc},${isSettled ? .5 : 1})`, boxShadow: `0 0 6px rgba(${nc},.6)${notifCount > 1 ? `,0 0 12px rgba(${nc},.25)` : ''}` }}>{notifCount > 1 ? notifCount : ''}</div>
            </div>
            <div className="cv-notif-expand">
              {notifHovered && (
              <div className="cv-notif-expand-icon" style={{ background: `rgba(${nc},.15)` }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: `rgba(${nc},.7)` }}>
                  {getNotifIcon(activeNotif.phase)}
                </svg>
                {notifCount > 1 && (
                  <button className="cv-notif-dismiss-all"
                    style={{ background: `rgba(${nc},.95)` }}
                    onClick={(e) => { e.stopPropagation(); dismissAllNotifs(); }}
                    title="Dismiss all"
                    aria-label="Dismiss all notifications">{notifCount}</button>
                )}
              </div>
              )}
              <div className="cv-notif-marquee" ref={marqueeRef}>
                <span className="cv-notif-marquee-inner" ref={marqueeInnerRef} style={{ '--cv-marquee-x': `-${marqueeScrollX}px` }}>
                  <span className="cv-notif-label" style={{ color: `rgba(${nc},.7)` }}>{nt.label}</span>
                  <span className="cv-notif-sep">·</span>
                  <span className="cv-notif-amt">{activeNotif.amount}</span>
                  {activeNotif.detail && (<><span className="cv-notif-sep">·</span><span className="cv-notif-detail" style={{ color: `rgba(${nc},.45)` }}>{activeNotif.detail}</span></>)}
                  <span className="cv-notif-sep">·</span>
                  <span className="cv-notif-time">{fmtAgo(activeNotif.elapsed)}</span>
                </span>
              </div>
              <button className="cv-notif-dismiss"
                onClick={(e) => { e.stopPropagation(); dismissNotif(); }}
                aria-label="Dismiss notification">✕</button>
            </div>
          </div>
            );
          })()}
        </div>
      </div>

      {/* Live market ticker tape — fixed to the bottom edge, visible on every tab.
          Clicking a coin opens the Trade terminal on that pair. */}
      <TickerTape onSelect={(t) => {
        try { localStorage.setItem("hx_trade_pair", t); } catch (e) {}
        switchTab("trade");
      }} />

    </div>
  );
}
