import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const CELL_H = 24, BASELINE_PAD = 1, EPS = 1e-12;
const DIGIT_REEL = Array.from({ length: 140 }, (_, i) => i % 10);
const DIGIT_CENTER = 60;
const PH_COLORS = ['rgba(110,160,255,.4)','rgba(150,120,255,.4)','rgba(190,110,230,.4)','rgba(210,140,180,.4)','rgba(180,170,120,.4)','rgba(120,200,170,.4)','rgba(100,180,230,.4)'];

function countDecimals(s) { const i = s.indexOf("."); return i === -1 ? 0 : s.length - i - 1; }
function addCommas(p) { if (!p) return p; const d = p.indexOf("."), i = d === -1 ? p : p.slice(0, d), f = d === -1 ? "" : p.slice(d); if (i.length <= 3) return i + f; let r = ""; for (let j = 0; j < i.length; j++) { if (j > 0 && (i.length - j) % 3 === 0) r += ","; r += i[j]; } return r + f; }
function plainToFmt(pp, ps) { const f = addCommas(ps); let pi = 0; for (let fi = 0; fi <= f.length; fi++) { if (pi === pp) return fi; if (fi < f.length && f[fi] !== ",") pi++; } return f.length; }
function fmtToPlain(fp, f) { let p = 0; for (let i = 0; i < fp && i < f.length; i++) if (f[i] !== ",") p++; return p; }
function tokIdxToDisplay(idx, intLen) { if (intLen <= 3) return idx; let c = 0; const lim = idx < intLen ? idx : intLen - 1; for (let i = 1; i <= lim; i++) if ((intLen - i) % 3 === 0) c++; return idx + c; }
function sanitize(raw, maxDec) { let s = raw.replace(/[^0-9.]/g, ""); if (s === "") return ""; const fd = s.indexOf("."); if (fd !== -1) { s = s.slice(0, fd + 1) + s.slice(fd + 1).replace(/\./g, ""); s = s.slice(0, fd + 1) + s.slice(fd + 1).slice(0, Math.max(0, maxDec)); } if (s.startsWith(".")) s = "0" + s; const dot = s.indexOf("."), int = dot === -1 ? s : s.slice(0, dot), frac = dot === -1 ? "" : s.slice(dot + 1); let ni = int.replace(/^0+/, ""); if (ni === "") ni = "0"; return dot === -1 ? ni : `${ni}.${frac}`; }
function roundToStep(n, step, mode) { if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return 0; const q = n / step; if (mode === "up") return Math.ceil(q - EPS) * step; if (mode === "down") return Math.floor(q + EPS) * step; return Math.round(q) * step; }
function isAligned(n, step) { if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return true; return Math.abs(n - roundToStep(n, step, "nearest")) <= Math.max(EPS, step * 1e-9); }
function inferDir(prev, next) { const pn = Number(prev), nn = Number(next); if (prev && next && Number.isFinite(pn) && Number.isFinite(nn) && pn !== nn) return nn > pn ? "up" : "down"; return next.length >= prev.length ? "up" : "down"; }

function diffRange(ps, ns, ch = null) {
  const delta = ns.length - ps.length, cl = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  if (delta > 0) { const t = i => ps.slice(i) === ns.slice(i + delta); if (ch != null) { const p = cl(ch - delta, 0, ps.length); if (t(p)) return { start: p, removed: "", added: ns.slice(p, p + delta), suffixLen: ps.length - p }; for (let o = 1; o <= ps.length; o++) { const l = p - o, r = p + o; if (l >= 0 && t(l)) return { start: l, removed: "", added: ns.slice(l, l + delta), suffixLen: ps.length - l }; if (r <= ps.length && t(r)) return { start: r, removed: "", added: ns.slice(r, r + delta), suffixLen: ps.length - r }; } } for (let i = 0; i <= ps.length; i++) if (t(i)) return { start: i, removed: "", added: ns.slice(i, i + delta), suffixLen: ps.length - i }; }
  if (delta < 0) { const del = -delta, t = i => ps.slice(i + del) === ns.slice(i); if (ch != null) { const p = cl(ch, 0, ns.length); if (t(p)) return { start: p, removed: ps.slice(p, p + del), added: "", suffixLen: ns.length - p }; for (let o = 1; o <= ns.length; o++) { const l = p - o, r = p + o; if (l >= 0 && t(l)) return { start: l, removed: ps.slice(l, l + del), added: "", suffixLen: ns.length - l }; if (r <= ns.length && t(r)) return { start: r, removed: ps.slice(r, r + del), added: "", suffixLen: ns.length - r }; } } for (let i = 0; i <= ns.length; i++) if (t(i)) return { start: i, removed: ps.slice(i, i + del), added: "", suffixLen: ns.length - i }; }
  let s = 0; while (s < ps.length && s < ns.length && ps[s] === ns[s]) s++; let ep = ps.length - 1, en = ns.length - 1; while (ep >= s && en >= s && ps[ep] === ns[en]) { ep--; en--; } return { start: s, removed: ps.slice(s, ep + 1), added: ns.slice(s, en + 1), suffixLen: ps.length - (ep + 1) };
}
function diffFromSel(ps, ns, ss, se) { const s = Math.max(0, Math.min(ss, ps.length)), e = Math.max(s, Math.min(se, ps.length)); const suf = ps.slice(e), sl = suf.length; if (!(ps.slice(0, s) === ns.slice(0, Math.min(s, ns.length)))) return null; if (!(sl <= ns.length && suf === ns.slice(ns.length - sl))) return null; return { start: s, removed: ps.slice(s, e), added: ns.slice(s, Math.max(s, ns.length - sl)), suffixLen: sl }; }

function applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId, caretHint: ch = null, selectionHint: sh = null }) {
  let d = null; if (sh && sh.end > sh.start) d = diffFromSel(ps, ns, sh.start, sh.end); if (!d) d = diffRange(ps, ns, ch);
  const { start, removed, added, suffixLen } = d; const prefix = pt.slice(0, start), suffix = suffixLen > 0 ? pt.slice(pt.length - suffixLen) : []; const aff = new Set(), rem = [], mid = []; const ml = Math.min(removed.length, added.length);
  for (let i = 0; i < ml; i++) { const t = pt[start + i]; if (!t) { const id = makeId(); mid.push({ id, ch: added[i] }); aff.add(id); continue; } mid.push({ id: t.id, ch: added[i] }); if (t.ch !== added[i]) aff.add(t.id); }
  for (let i = ml; i < added.length; i++) { const id = makeId(); mid.push({ id, ch: added[i] }); aff.add(id); } for (let i = ml; i < removed.length; i++) { const t = pt[start + i]; if (t) rem.push({ ...t, index: start + i }); }
  const result = [...prefix, ...mid, ...suffix]; if (result.map(t => t.ch).join("") !== ns) { const t2 = [], a2 = new Set(), r2 = []; for (let i = 0; i < ns.length; i++) { if (i < pt.length && pt[i].ch === ns[i]) t2.push(pt[i]); else if (i < pt.length) { t2.push({ id: pt[i].id, ch: ns[i] }); a2.add(pt[i].id); } else { const id = makeId(); t2.push({ id, ch: ns[i] }); a2.add(id); } } for (let i = ns.length; i < pt.length; i++) r2.push({ ...pt[i], index: i }); return { tokens: t2, affectedIds: a2, removedTokens: r2 }; }
  return { tokens: result, affectedIds: aff, removedTokens: rem };
}

function useLatest(v) { const r = useRef(v); useLayoutEffect(() => { r.current = v; }, [v]); return r; }

const DigitRoll = React.memo(function DigitRoll({ digit, animDirection, animTriggerId, spinCycles = 0, height = CELL_H, className = "" }) {
  const [index, setIndex] = useState(DIGIT_CENTER + digit); const [noTrans, setNoTrans] = useState(true); const [dur, setDur] = useState(220); const [isSnap, setIsSnap] = useState(false);
  const prev = useRef(null), animRef = useRef(false), trackEl = useRef(null), mountedRef = useRef(true), rafs = useRef(new Set());
  const raf = cb => { const id = requestAnimationFrame(t => { rafs.current.delete(id); cb(t); }); rafs.current.add(id); };
  const cancelRafs = () => { rafs.current.forEach(cancelAnimationFrame); rafs.current.clear(); };
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; cancelRafs(); }; }, []);
  const flush = () => { if (trackEl.current) trackEl.current.getBoundingClientRect(); };

  // Immediate hard-snap: no rafs, synchronous reset. Used before starting a new animation
  // when previous animation is still in-flight, preventing the "blank" state.
  const hardSnap = d => { animRef.current = false; cancelRafs(); setNoTrans(true); setIndex(DIGIT_CENTER + d); };

  useLayoutEffect(() => {
    const pv = prev.current;
    // First mount
    if (pv === null) {
      prev.current = digit;
      if (!animDirection) { setNoTrans(true); setIndex(DIGIT_CENTER + digit); raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); }); return; }
      if (animDirection === "snap") {
        setIsSnap(true); setNoTrans(true); setIndex(DIGIT_CENTER + digit);
        return;
      }
      const sim = animDirection === "up" ? (digit + 9) % 10 : (digit + 1) % 10;
      setNoTrans(true); setIndex(DIGIT_CENTER + sim);
      raf(() => { if (!mountedRef.current) return; animRef.current = true; const su = (digit - sim + 10) % 10, sd = (sim - digit + 10) % 10, ex = Math.max(1, spinCycles) * 10, dist = (animDirection === "up" ? su : sd) + ex; setDur(Math.min(520, 160 + dist * 12)); setNoTrans(false); setIndex(animDirection === "up" ? DIGIT_CENTER + sim + su + ex : DIGIT_CENTER + sim - (sd + ex)); });
      return;
    }
    prev.current = digit;
    if (!animDirection || pv === digit) {
      hardSnap(digit); raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); });
      return;
    }
    // Snap mode: drop from top with thud — CSS keyframe on wrapper, reel hard-positioned
    if (animDirection === "snap") {
      if (animRef.current) { cancelRafs(); animRef.current = false; }
      setIsSnap(true); setNoTrans(true); setIndex(DIGIT_CENTER + digit);
      return;
    }
    setIsSnap(false);
    // If already animating, cancel pending rafs and hard-snap to previous digit first
    if (animRef.current) { cancelRafs(); setNoTrans(true); setIndex(DIGIT_CENTER + pv); flush(); }
    animRef.current = true;
    const su = (digit - pv + 10) % 10, sd = (pv - digit + 10) % 10, ex = Math.max(0, spinCycles) * 10, dist = (animDirection === "up" ? su : sd) + ex;
    setDur(Math.min(520, 160 + dist * 12));
    // Use raf to ensure the snap position is committed before enabling transition
    raf(() => { if (!mountedRef.current) return; setNoTrans(false); setIndex(c => animDirection === "up" ? DIGIT_CENTER + pv + su + ex : DIGIT_CENTER + pv - (sd + ex)); });
  }, [digit, animDirection, animTriggerId, spinCycles]);

  const onEnd = () => { if (!animRef.current) return; animRef.current = false; setNoTrans(true); raf(() => { if (!mountedRef.current) return; setIndex(DIGIT_CENTER + digit); raf(() => { if (!mountedRef.current) return; flush(); setNoTrans(false); }); }); };
  return <span className={`ri-digit ${className}`.trim()} style={{ height }}><span className={isSnap ? "ri-digit__drop" : undefined} onAnimationEnd={() => setIsSnap(false)}><span ref={trackEl} className={"ri-digit__track " + (noTrans ? "ri-digit__track--no" : "")} style={{ transform: `translateY(${-index * height}px)`, transitionDuration: `${dur}ms` }} onTransitionEnd={onEnd}>{DIGIT_REEL.map((d, i) => <span key={i} className="ri-digit__cell" style={{ height }}>{d}</span>)}</span></span></span>;
});

const Punct = React.memo(function Punct({ ch, animate, direction, height = CELL_H, className = "" }) {
  const cls = "ri-punct" + (animate ? (ch === "." ? " ri-punct--dotIn" : ch === "," ? " ri-punct--pop" : direction ? ` ri-punct--${direction}` : " ri-punct--pop") : "");
  return <span className={`${cls} ${className}`.trim()} style={{ height }}>{ch}</span>;
});

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
.ri-static,.ri-digit__cell,.ri-punct,.ri-fall{box-sizing:border-box;padding-top:var(--ri-base-pad);line-height:1}
.ri-static{display:inline-grid;place-items:center;width:1ch}
.ri-digit{display:inline-block;width:1ch;overflow:hidden;vertical-align:middle;position:relative}
.ri-digit::before,.ri-digit::after{content:"";position:absolute;left:0;right:0;height:7px;pointer-events:none;z-index:1}
.ri-digit::before{top:0;background:linear-gradient(to bottom,var(--ri-fade-color,rgba(18,18,24,1)),transparent)}
.ri-digit::after{bottom:0;background:linear-gradient(to top,var(--ri-fade-color,rgba(18,18,24,1)),transparent)}
.ri-digit__track{display:block;transition-property:transform;transition-timing-function:cubic-bezier(.2,.8,.2,1);will-change:transform}
.ri-digit__track--no{transition:none}
.ri-digit__drop{display:block;animation:riSnapDrop 300ms cubic-bezier(.22,.6,.36,1) both}
@keyframes riSnapDrop{0%{transform:translateY(-22px);opacity:0}40%{transform:translateY(3px);opacity:1}62%{transform:translateY(-2px)}80%{transform:translateY(1px)}100%{transform:translateY(0);opacity:1}}
.ri-digit__cell{display:grid;place-items:center}
.ri-punct{display:inline-grid;place-items:center;width:1ch;height:var(--ri-cell-h)}
.ri-punct--up{animation:riPUp 180ms cubic-bezier(.2,.9,.2,1)} .ri-punct--down{animation:riPDn 180ms cubic-bezier(.2,.9,.2,1)} .ri-punct--pop{animation:riPPop 160ms cubic-bezier(.2,.9,.2,1)} .ri-punct--dotIn{animation:riDotIn 220ms cubic-bezier(.2,.9,.2,1)}
@keyframes riPUp{from{transform:translateY(8px);opacity:.2}to{transform:translateY(0);opacity:1}} @keyframes riPDn{from{transform:translateY(-8px);opacity:.2}to{transform:translateY(0);opacity:1}} @keyframes riPPop{from{transform:scale(.85);opacity:.3}to{transform:scale(1);opacity:1}} @keyframes riDotIn{0%{transform:translateY(10px) scale(.6);opacity:0}60%{transform:translateY(-2px) scale(1.18);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
.ri-fall-layer{position:absolute;top:0;left:16px;right:92px;height:58px;display:flex;align-items:center;pointer-events:none;z-index:10;overflow:visible;font-size:22px;font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.ri-fall{position:absolute;top:50%;margin-top:calc(var(--ri-cell-h) / -2);width:1ch;height:var(--ri-cell-h);display:grid;place-items:center}
.ri-fall--delete{animation:riFDel 240ms cubic-bezier(.25,.6,.35,1) forwards} .ri-fall--delete-single{animation:riFDelS 240ms cubic-bezier(.25,.6,.35,1) forwards} .ri-fall--clear{animation:riFClr 220ms cubic-bezier(.25,.6,.35,1) forwards} .ri-fall--overflow{animation:riFOver 280ms cubic-bezier(.15,.7,.25,1) both} .ri-fall--sweep{animation:riFSweep 300ms cubic-bezier(.2,.7,.3,1) forwards;transform-origin:bottom right}
@keyframes riFDelS{0%{transform:perspective(800px) translateX(0) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateX(-.15ch) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(-.4ch) translateY(18px) rotateX(-8deg);opacity:0}}
@keyframes riFDel{0%{transform:perspective(800px) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateY(16px) rotateX(-6deg);opacity:0}} @keyframes riFClr{0%{transform:translateY(0);opacity:1}100%{transform:translateY(14px);opacity:0}} @keyframes riFOver{0%{transform:translateY(0) translateX(0) rotate(0deg);opacity:1}12%{transform:translateY(-1px) translateX(.4ch) rotate(3deg);opacity:.9}40%{transform:translateY(1px) translateX(.9ch) rotate(6deg);opacity:.5}100%{transform:translateY(4px) translateX(1.6ch) rotate(18deg);opacity:0}}
@keyframes riFSweep{0%{transform:translateX(0) translateY(0) rotate(0deg);opacity:1}8%{transform:translateX(4px) translateY(-3px) rotate(4deg);opacity:1}100%{transform:translateX(3ch) translateY(16px) rotate(45deg);opacity:0}}
.ri-fall--sweep-bw{animation:riFSweepBw 300ms cubic-bezier(.2,.7,.3,1) forwards;transform-origin:bottom left}
@keyframes riFSweepBw{0%{transform:translateX(0) translateY(0) rotate(0deg);opacity:1}8%{transform:translateX(-4px) translateY(-3px) rotate(-4deg);opacity:1}100%{transform:translateX(-3ch) translateY(16px) rotate(-45deg);opacity:0}}
.ri-fall--delete-bw{animation:riFDelBw 240ms cubic-bezier(.25,.6,.35,1) forwards}
@keyframes riFDelBw{0%{transform:perspective(800px) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(-.5ch) translateY(16px) rotateX(-6deg);opacity:0}}
.ri-fall--delete-single-bw{animation:riFDelSBw 240ms cubic-bezier(.25,.6,.35,1) forwards}
@keyframes riFDelSBw{0%{transform:perspective(800px) translateX(0) translateY(0) rotateX(0);opacity:1}15%{transform:perspective(800px) translateX(.15ch) translateY(-1px) rotateX(-2deg);opacity:1}100%{transform:perspective(800px) translateX(.4ch) translateY(18px) rotateX(-8deg);opacity:0}}

.ri-shift{will-change:transform} .ri-shift--right{animation:riShR 140ms cubic-bezier(.2,.9,.2,1)} .ri-shift--left{animation:riShL 140ms cubic-bezier(.2,.9,.2,1)}
@keyframes riShR{from{transform:translateX(-1ch)}to{transform:translateX(0)}} @keyframes riShL{from{transform:translateX(1ch)}to{transform:translateX(0)}}
.ri-controls{position:absolute;top:50%;right:12px;transform:translateY(-50%);display:flex;align-items:center;gap:10px;height:calc(100%-10px);z-index:3}
.ri-clear{width:30px;height:30px;border-radius:8px;border:1px solid transparent;background:transparent;cursor:pointer;display:grid;place-items:center;font-size:18px;line-height:1;color:rgba(255,255,255,.4);transition:all 120ms} .ri-clear:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7)}
.ri-stepper{display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,.1);padding-left:10px}
.ri-step{width:30px;height:14px;border:0;background:transparent;cursor:pointer;display:grid;place-items:center;color:rgba(255,255,255,.35);line-height:1;user-select:none;font-size:10px;transition:all 120ms} .ri-step:hover{background:rgba(255,255,255,.08);color:rgba(255,255,255,.7);border-radius:6px}

.cv-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:cvFadeIn 200ms ease}
.cv-modal{background:#1a1a24;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;width:100%;max-width:400px;animation:cvSlideUp 280ms cubic-bezier(.2,.8,.2,1);font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff}
@keyframes cvFadeIn{from{opacity:0}to{opacity:1}}
@keyframes cvSlideUp{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.cv-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.cv-row:last-child{border-bottom:none}
.cv-success{text-align:center;animation:cvPop 400ms cubic-bezier(.2,.8,.2,1)}
@keyframes cvPop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.03)}100%{transform:scale(1);opacity:1}}
.cv-check{width:56px;height:56px;border-radius:50%;display:inline-grid;place-items:center;font-size:28px;margin-bottom:12px}
.cv-shimmer{display:inline-block;height:14px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,.06) 25%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.06) 75%);background-size:200% 100%;animation:cvShimmer 1.2s ease infinite}
@keyframes cvShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes cvHdrOut{0%{transform:translateX(0);opacity:1}100%{transform:translateX(10px);opacity:0}}
@keyframes cvHdrIn{0%{transform:translateX(-10px);opacity:0}100%{transform:translateX(0);opacity:1}}
@keyframes cvSwapOutDown{0%{transform:translateY(0);opacity:1}100%{transform:translateY(22px);opacity:0}}
@keyframes cvSwapOutUp{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-22px);opacity:0}}
@keyframes cvSwapInUp{0%{transform:translateY(14px);opacity:0}100%{transform:translateY(0);opacity:1}}
@keyframes cvSwapInDown{0%{transform:translateY(-14px);opacity:0}100%{transform:translateY(0);opacity:1}}
`;
function injectCSS() { if (typeof document === "undefined" || document.getElementById(CSS_ID)) return; const s = document.createElement("style"); s.id = CSS_ID; s.textContent = STYLE_CSS; document.head.appendChild(s); }

// ═══════════════════════════════════════════════════════════════════
// RollingAmountInput (no built-in % buttons — parent provides)
// ═══════════════════════════════════════════════════════════════════
function RollingAmountInput({ value: cv, onChange: onVC, balance = 0, step = "0.0001", max = 100_000_000, placeholder = "Input Amount", suffix = "", showStepper = true, fadeColor = "rgba(18,18,24,1)", textColor = "rgba(255,255,255,.92)", warnExceedsBalance = false, displayAnim = null, onEnter = null }) {
  useEffect(injectCSS, []);
  const SN = Number(step), sD = countDecimals(step);
  const inputRef = useRef(null), pendCaretRef = useRef(null), selRef = useRef(null), lastCaretRef = useRef(0), selectAllRef = useRef(false);
  const [tokens, setTokens] = useState([]);
  const pv = useMemo(() => tokens.map(t => t.ch).join(""), [tokens]);
  const dv = useMemo(() => addCommas(pv), [pv]);
  const tRef = useLatest(tokens), vRef = useLatest(pv), psRef = useLatest(pv);
  const lastE = useRef(cv); const idC = useRef(1000); const mkId = useCallback(() => String(idC.current++), []);

  useEffect(() => { if (cv == null) return; const c = String(cv); if (c === pv || c === lastE.current) return; const san = sanitize(c, sD); if (san === pv) return; const pt = tRef.current, ps = pt.map(t => t.ch).join("");
    if (san === "" && pt.length > 0) { addFall(pt.map((t, i) => ({ ...t, index: i })), "clear", { withSuffix: true }); setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() })); setTokens([]); pendCaretRef.current = 0; lastE.current = c; return; }
    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: san, makeId: mkId, caretHint: san.length }); const dir = ps === "" && san === "" ? null : inferDir(ps, san); setAnim(a => ({ direction: dir, id: a.id + 1, cycles: 0, affectedIds: upd.affectedIds })); setTokens(upd.tokens); lastE.current = c; }, [cv]);
  useEffect(() => { if (onVC && pv !== lastE.current) { lastE.current = pv; onVC(pv); } }, [pv, onVC]);

  const [anim, setAnim] = useState({ direction: null, id: 0, cycles: 0, affectedIds: new Set() });
  const [falling, setFalling] = useState([]);
  const [shAnim, setShAnim] = useState({ movedIds: new Set(), dir: "right", tick: 0 });
  const shT = useRef(null);
  const trigSh = useCallback((ids, dir) => { if (shT.current) clearTimeout(shT.current); setShAnim({ movedIds: ids, dir, tick: Date.now() }); shT.current = setTimeout(() => setShAnim(s => ({ ...s, movedIds: new Set() })), 160); }, []);
  useEffect(() => () => { if (shT.current) clearTimeout(shT.current); }, []);
  const [hint, setHint] = useState(null); const hT = useRef(null); const [bumpId, setBumpId] = useState(0);
  const trigH = useCallback(m => { setBumpId(x => x + 1); setHint(m); if (hT.current) clearTimeout(hT.current); hT.current = setTimeout(() => setHint(null), 1400); }, []);
  useEffect(() => () => { if (hT.current) clearTimeout(hT.current); }, []);
  const exceeds = useMemo(() => { if (!warnExceedsBalance || !balance) return false; const n = Number(pv); return Number.isFinite(n) && n > balance; }, [pv, balance, warnExceedsBalance]);

  const focI = useCallback(() => inputRef.current?.focus(), []);
  const setFC = useCallback(pp => { requestAnimationFrame(() => { focI(); const el = inputRef.current; if (!el) return; const fp = plainToFmt(pp, vRef.current); try { el.setSelectionRange(fp, fp); } catch {} }); }, [focI, vRef]);
  const capSel = useCallback(() => { const el = inputRef.current; if (!el) return; const fs = el.selectionStart ?? 0, fe = el.selectionEnd ?? fs, fmt = el.value; if (fs === fe) { lastCaretRef.current = fs; selectAllRef.current = false; } let dir = el.selectionDirection || "none"; if ((dir === "none" || selectAllRef.current) && fe > fs) { const mid = fmt.length / 2; dir = lastCaretRef.current > mid ? "backward" : "forward"; } selRef.current = { start: fmtToPlain(fs, fmt), end: fmtToPlain(fe, fmt), prevStr: psRef.current, direction: dir }; }, [psRef]);
  const suffixRef = useLatest(suffix);
  const addFall = useCallback((rem, mode, { withSuffix = false, selDirection = "none" } = {}) => { if (!rem.length && !withSuffix) return; const cv2 = vRef.current, dp = cv2.indexOf("."), il = dp === -1 ? cv2.length : dp, now = Date.now(); const dirSuffix = selDirection === "backward" ? "-bw" : ""; const items = [...rem]; if (withSuffix && suffixRef.current) { const lastD = rem.length > 0 ? tokIdxToDisplay((rem[rem.length - 1].index ?? rem.length - 1), il) + 1 : 0; items.push({ id: 'suf-fall', ch: suffixRef.current, left: `${lastD + 0.32}ch`, isSuffix: true }); } const totalItems = items.length; setFalling(c => [...c, ...items.map((t, i) => ({ key: `${t.id}-${now}-${i}-${mode}`, ch: t.ch, left: t.left ?? `${tokIdxToDisplay(t.index ?? 0, il)}ch`, mode, delay: mode === "clear" ? i * 28 : mode === "sweep" ? (selDirection === "backward" ? (totalItems - 1 - i) * 22 : i * 22) : mode === "overflow" ? 30 : 0, dirSuffix, isSuffix: !!t.isSuffix }))]); }, [vRef, suffixRef]);

  const applyStr = useCallback(({ nextStr, cycles, direction = null, caretPos = null }) => { const ps = psRef.current, pt = tRef.current, pos = caretPos ?? nextStr.length; const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr, makeId: mkId, caretHint: pos }); setAnim(a => ({ direction: direction || (ps === nextStr ? null : inferDir(ps, nextStr)), id: a.id + 1, cycles, affectedIds: upd.affectedIds })); setTokens(upd.tokens); setFC(pos); }, [mkId, setFC, tRef, psRef]);

  const clear = useCallback(({ withFall = false } = {}) => { const ct = tRef.current; if (withFall && ct.length) addFall(ct.map((t, i) => ({ ...t, index: i })), "clear", { withSuffix: true }); setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() })); setTokens([]); pendCaretRef.current = 0; setFC(0); }, [addFall, setFC, tRef]);

  const adjOnce = useCallback((dir, mult, { cycles = 1 } = {}) => { const cur = Number(vRef.current), base = Number.isFinite(cur) ? cur : 0; let sb = base; if (!isAligned(base, SN)) { sb = roundToStep(base, SN, dir === "up" ? "up" : "down"); trigH(`Snapped to ${step}`); } let next = sb + (dir === "up" ? 1 : -1) * mult * SN; if (!Number.isFinite(next)) next = 0; if (next < 0) next = 0; if (next > max) next = max; const ns = next.toFixed(sD); applyStr({ nextStr: ns, direction: dir, cycles, caretPos: ns.length }); }, [applyStr, trigH, vRef, sD, SN, step, max]);

  const holdRef = useRef({ timer: null, active: false }); const supC = useRef(false);
  const stopH = useCallback(() => { holdRef.current.active = false; if (holdRef.current.timer) { clearTimeout(holdRef.current.timer); holdRef.current.timer = null; } }, []);
  useEffect(() => () => stopH(), [stopH]);
  const startH = useCallback((dir, mult) => { stopH(); holdRef.current.active = true; adjOnce(dir, mult, { cycles: 1 }); let iv = 90, ticks = 0; const rep = () => { if (!holdRef.current.active) return; ticks++; let sm = mult; if (ticks > 120) sm = mult * 1e7; else if (ticks > 100) sm = mult * 1e6; else if (ticks > 80) sm = mult * 1e5; else if (ticks > 60) sm = mult * 1e4; else if (ticks > 40) sm = mult * 1e3; else if (ticks > 20) sm = mult * 100; else if (ticks > 8) sm = mult * 10; adjOnce(dir, sm, { cycles: 0 }); iv = Math.max(30, iv * 0.95); holdRef.current.timer = setTimeout(rep, iv); }; holdRef.current.timer = setTimeout(rep, 300); }, [adjOnce, stopH]);

  const onKD = e => { capSel();
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) selectAllRef.current = true;
    if (e.key === "Backspace" || e.key === "Delete") { const el = inputRef.current; if (el && el.selectionStart === el.selectionEnd) { const fp = el.selectionStart, fmt = el.value, isBS = e.key === "Backspace"; if (isBS ? (fp > 0 && fmt[fp - 1] === ",") : (fp < fmt.length && fmt[fp] === ",")) { e.preventDefault(); const pp = fmtToPlain(fp, fmt), dp = isBS ? pp - 1 : pp, ps = psRef.current, pt = tRef.current; if (dp < 0 || dp >= ps.length) return; const ns = sanitize(ps.slice(0, dp) + ps.slice(dp + 1), sD); if (ns === ps) return; const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId: mkId, caretHint: dp }); if (upd.removedTokens.length) addFall(upd.removedTokens, "delete-single"); setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() })); setTokens(upd.tokens); pendCaretRef.current = dp; return; } } }
    if (e.key === "ArrowUp") { e.preventDefault(); if (!e.repeat) startH("up", e.shiftKey ? 10 : 1); return; } if (e.key === "ArrowDown") { e.preventDefault(); if (!e.repeat) startH("down", e.shiftKey ? 10 : 1); return; } if (e.key === "Escape") { e.preventDefault(); clear({ withFall: true }); } if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } };
  const onKU = e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") stopH(); };
  const onBl = () => { stopH(); const n = Number(vRef.current); if (Number.isFinite(n) && n > 0 && !isAligned(n, SN)) { const sn = roundToStep(n, SN, "nearest"), ss = sn.toFixed(sD); applyStr({ nextStr: ss, direction: sn >= n ? "up" : "down", cycles: 0, caretPos: ss.length }); trigH(`Snapped to ${step}`); } };
  const onBI = e => { capSel(); };

  const hChg = e => {
    const raw = e.target.value, caret = e.target.selectionStart ?? raw.length; const ps = psRef.current, pt = tRef.current, sSnap = selRef.current;
    const rawS = (() => { let s = raw.replace(/[^0-9.]/g, ""); const fd = s.indexOf("."); if (fd !== -1) s = s.slice(0, fd + 1) + s.slice(fd + 1).replace(/\./g, ""); if (s.startsWith(".")) s = "0" + s; return s; })();
    const ns = sanitize(rawS, sD);
    if (ns === "0" && ps !== "0" && ps !== "") { const sd = sSnap?.direction || "none"; addFall(pt.map((t, i) => ({ ...t, index: i })), pt.length > 2 ? "sweep" : "delete", { withSuffix: true, selDirection: sd }); setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() })); setTokens([]); pendCaretRef.current = 0; selRef.current = null; return; }
    if ((rawS.indexOf(".") === -1 ? 0 : rawS.length - rawS.indexOf(".") - 1) > sD) trigH(`Min increment is ${step}`);
    const nn = Number(ns), pn = Number(ps); if (Number.isFinite(nn) && nn > max && !(Number.isFinite(pn) && nn < pn)) { trigH(`Max is ${max.toLocaleString()}`); const el = inputRef.current; if (el) { const pf = addCommas(ps), pc = fmtToPlain(caret, addCommas(rawS)), rc = plainToFmt(Math.min(pc, ps.length), ps); el.value = pf; try { el.setSelectionRange(rc, rc); } catch {} } selRef.current = null; return; }
    const rb = raw.slice(0, caret), bs = sanitize(rb, sD); pendCaretRef.current = bs.length;
    if (rawS.length === ps.length + 1 && ns.length === ps.length && pt.length === ps.length && pt.length > 0) { const ip = bs.length - 1, ic = rawS[ip]; if (ic && /[0-9]/.test(ic) && ip >= 0 && ip <= ps.length) { const pr = ps.slice(0, ip) + ic + ps.slice(ip); if (pr === rawS) { const pc = sanitize(pr, sD); if (pc === ns && pr.length > ns.length) { const nt = { id: mkId(), ch: ic }, dr = pt[pt.length - 1], mv = pt.slice(ip, pt.length - 1), ntk = [...pt.slice(0, ip), nt, ...mv]; if (ntk.map(t => t.ch).join("") === ns) { addFall([{ ...dr, index: pt.length - 1 }], "overflow"); if (mv.length) trigSh(new Set(mv.map(t => t.id)), "right"); pendCaretRef.current = ip + 1; setAnim(a => ({ direction: "up", id: a.id + 1, cycles: 1, affectedIds: new Set([nt.id]) })); selRef.current = null; setTokens(ntk); return; } } } } }
    const sh = sSnap && sSnap.prevStr === ps && sSnap.end > sSnap.start ? { start: sSnap.start, end: sSnap.end } : null;
    const upd = applyTokensUpdate({ prevTokens: pt, prevStr: ps, nextStr: ns, makeId: mkId, caretHint: bs.length, selectionHint: sh }); selRef.current = null;
    if (ns.length < ps.length && upd.removedTokens.length) { const sd = sSnap?.direction || "none"; addFall(upd.removedTokens, upd.removedTokens.length === 1 ? "delete-single" : upd.removedTokens.length > 2 ? "sweep" : "delete", { withSuffix: !ns, selDirection: sd }); setAnim(a => ({ direction: null, id: a.id + 1, cycles: 0, affectedIds: new Set() })); }
    else { const isSingle = upd.affectedIds.size === 1 && ns.length >= ps.length && (ns.length - ps.length) <= 1; setAnim(a => ({ direction: ps === ns ? null : isSingle ? "snap" : inferDir(ps, ns), id: a.id + 1, cycles: 0, affectedIds: upd.affectedIds })); }
    setTokens(upd.tokens);
  };

  useLayoutEffect(() => { const pp = pendCaretRef.current; if (pp == null) return; pendCaretRef.current = null; const el = inputRef.current; if (!el || document.activeElement !== el) return; const fp = plainToFmt(pp, pv); try { el.setSelectionRange(fp, fp); } catch {} }, [dv]);

  const prevHadVal = useRef(false);
  const rendered = useMemo(() => {
    const af = anim.affectedIds || new Set(); if (!pv) { prevHadVal.current = false; if (falling.length) return null; const si = suffix ? placeholder.lastIndexOf(suffix) : -1; return placeholder.split("").map((ch, i) => { const inSuf = si !== -1 && i >= si; const base = inSuf ? 120 : 0; return <span key={inSuf ? `ph-${suffix}-${i}` : `ph-s-${i}`} className="ri-ph-char" style={{ animationDelay: `${base + (inSuf ? (i - si) : i) * 45}ms`, '--pl-c': PH_COLORS[i % PH_COLORS.length] }}>{ch === " " ? "\u00A0" : ch}</span>; }); }
    const di = tokens.findIndex(t => t.ch === "."), il = di === -1 ? tokens.length : di; const els = [];
    tokens.forEach((t, i) => { if (i > 0 && i < il && (il - i) % 3 === 0) els.push(<Punct key={`c-${il}-${i}`} ch="," animate={af.size > 0} direction={af.size > 0 ? anim.direction : null} height={CELL_H} />); const sa = af.has(t.id), sc = shAnim.movedIds.has(t.id) ? `ri-shift ri-shift--${shAnim.dir}` : ""; if (t.ch >= "0" && t.ch <= "9") { els.push(<DigitRoll key={t.id} digit={Number(t.ch)} animDirection={sa ? anim.direction : null} animTriggerId={sa ? anim.id : 0} spinCycles={sa ? anim.cycles : 0} height={CELL_H} className={sc} />); return; } if (t.ch === ".") { els.push(<Punct key={`${t.id}-${sa ? anim.id : "s"}`} ch="." animate={sa} direction={sa ? anim.direction : null} height={CELL_H} className={sc} />); return; } els.push(<span key={t.id} className={`ri-static ${sc}`.trim()} style={{ height: CELL_H }}>{t.ch}</span>); });
    if (suffix) { prevHadVal.current = true; suffix.split("").forEach((ch, i) => { els.push(<span key={`suf-${suffix}-${i}`} className="ri-suffix ri-suffix--enter" style={{ animationDelay: `${120 + i * 45}ms`, marginLeft: i === 0 ? ".5ch" : 0 }}>{ch}</span>); }); }
    return els;
  }, [anim, falling.length, tokens, pv, shAnim, placeholder, suffix]);

  const sD2 = dir => e => { e.preventDefault(); supC.current = true; focI(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} startH(dir, 1); };
  const sU2 = () => { stopH(); setTimeout(() => { supC.current = false; }, 0); };
  const sC2 = dir => () => { if (supC.current) return; adjOnce(dir, 1, { cycles: 1 }); };

  return (
    <div>
      <div className="ri-field" style={{ "--ri-fade-color": fadeColor }} onPointerDown={e => { if (!e.target?.closest?.(".ri-controls")) focI(); }}>
        <span key={bumpId} className="ri-bump" />
        <input ref={inputRef} className={`ri-input ${exceeds ? "ri-input--warn" : ""}`} value={dv} onBeforeInput={onBI} onPaste={capSel} onChange={hChg} onKeyDown={onKD} onKeyUp={onKU} onBlur={onBl} inputMode="decimal" spellCheck={false} autoComplete="off" />
        <div className="ri-display" style={{ color: exceeds ? "rgba(255,120,120,.9)" : textColor }}>
          <span className="ri-display__inner" style={displayAnim ? { display: "inline-block", animation: displayAnim } : undefined}>{rendered}</span>
        </div>
        <div className="ri-fall-layer">{falling.map(f => <span key={f.key} className={`ri-fall ri-fall--${f.mode}${f.dirSuffix || ""} ${f.ch === "." ? "ri-fall--dot" : ""}`} style={{ left: f.left, animationDelay: `${f.delay}ms`, color: f.isSuffix ? 'rgba(255,255,255,.22)' : textColor, ...(f.isSuffix ? { width: 'auto' } : {}) }} onAnimationEnd={() => setFalling(c => c.filter(x => x.key !== f.key))}>{f.isSuffix ? <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '.03em' }}>{f.ch}</span> : f.ch}</span>)}</div>
        {showStepper && <div className="ri-controls"><button className="ri-clear" type="button" tabIndex={-1} onClick={() => clear({ withFall: true })}>×</button><div className="ri-stepper"><button className="ri-step" type="button" tabIndex={-1} onPointerDown={sD2("up")} onPointerUp={sU2} onPointerCancel={sU2} onPointerLeave={sU2} onClick={sC2("up")}>▲</button><button className="ri-step" type="button" tabIndex={-1} onPointerDown={sD2("down")} onPointerUp={sU2} onPointerCancel={sU2} onPointerLeave={sU2} onClick={sC2("down")}>▼</button></div></div>}
      </div>
      {hint && <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,100,100,.85)" }}>{hint}</div>}
      {exceeds && !hint && <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,100,100,.85)" }}>Exceeds balance</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Rolling Rate mini-display
// ═══════════════════════════════════════════════════════════════════
function RollingRate({ rate, decimals = 2, direction }) {
  const str = rate >= 1 ? addCommas(rate.toFixed(decimals)) : rate.toFixed(Math.max(decimals, 6));
  const [chars, setChars] = useState(str.split("")); const [aid, setAid] = useState(0); const [dir, setDir] = useState(null); const prev = useRef(str);
  useEffect(() => { if (str === prev.current) return; setDir(Number(str.replace(/,/g, "")) > Number(prev.current.replace(/,/g, "")) ? "up" : "down"); prev.current = str; setChars(str.split("")); setAid(x => x + 1); }, [str]);
  return <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(255,255,255,.5)" }}>{chars.map((ch, i) => { if (ch >= "0" && ch <= "9") return <DigitRoll key={`r-${i}`} digit={Number(ch)} animDirection={dir} animTriggerId={aid} spinCycles={0} height={16} />; return <span key={`p-${i}`} style={{ display: "inline-grid", placeItems: "center", width: ch === "," ? "0.5ch" : "0.7ch", height: 16, fontSize: 12, textAlign: "center" }}>{ch}</span>; })}{direction && <span style={{ marginLeft: 3, fontSize: 8, color: direction === "up" ? "#4ade80" : "#f87171" }}>{direction === "up" ? "▲" : "▼"}</span>}</span>;
}

// ═══════════════════════════════════════════════════════════════════
// +/- Percent Adjuster
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
  const pill = { height: 20, padding: "0 5px", borderRadius: 4, border: "1px solid rgba(255,255,255,.08)", background: "transparent", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 500, transition: "all 100ms", lineHeight: "18px" };
  const neg = { ...pill, color: negDisabled ? "rgba(255,130,130,.2)" : "rgba(255,130,130,.6)", cursor: negDisabled ? "default" : "pointer", borderColor: negDisabled ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.08)" };
  const pos = { ...pill, color: "rgba(130,255,170,.6)" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {PCT_STEPS.slice().reverse().map(p => (
        <button key={`m${p}`} type="button" tabIndex={-1} style={neg} onClick={() => { if (!negDisabled) adjust(-p); }}
          onMouseEnter={e => { if (!negDisabled) { e.currentTarget.style.background = "rgba(255,100,100,.1)"; e.currentTarget.style.color = "rgba(255,130,130,.9)"; } }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = negDisabled ? "rgba(255,130,130,.2)" : "rgba(255,130,130,.6)"; }}>
          −{p}%
        </button>
      ))}
      <span style={{ width: 0, margin: "0 1px" }} />
      {PCT_STEPS.map(p => (
        <button key={`p${p}`} type="button" tabIndex={-1} style={pos} onClick={() => adjust(p)}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(100,255,150,.08)"; e.currentTarget.style.color = "rgba(130,255,170,.9)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(130,255,170,.6)"; }}>
          +{p}%
        </button>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// Crypto Converter
// ═══════════════════════════════════════════════════════════════════
const COINS = {
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
const BASE_RATES = { "BTC/USDT": 67432.50, "ETH/USDT": 3521.80, "SOL/USDT": 142.65, "BNB/USDT": 612.40, "XRP/USDT": 0.5214, "USDC/USDT": 1.0001 };

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

// ── Coin selector with search + hotkeys ──
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

  const filtered = Object.entries(COINS).filter(([k, v]) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.toLowerCase().includes(q) || v.name.toLowerCase().includes(q);
  });

  const handleKey = e => {
    if (e.key === "Escape") { e.preventDefault(); setShow(false); }
    if (e.key === "Enter" && filtered.length > 0) { e.preventDefault(); const pick = filtered[0][0]; onSelect(pick); setShow(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <button tabIndex={-1} onClick={() => { closeAll(); setShow(!show); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "all 120ms" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: COINS[current].color, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>{COINS[current].icon}</span>
          {current}
          <span style={{ fontSize: 9, opacity: 0.35, marginLeft: 1, transition: "transform 150ms", transform: show ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {show && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, background: "#1e1e2a", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 6, minWidth: 190, boxShadow: "0 12px 40px rgba(0,0,0,.6)" }}>
            <div style={{ position: "relative", marginBottom: 4 }}>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleKey} placeholder="Search..."
                style={{ width: "100%", height: 30, borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: 12, fontFamily: "inherit", padding: "0 26px 0 8px", outline: "none", boxSizing: "border-box" }} />
              {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, color: "rgba(255,255,255,.35)", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 2, lineHeight: 1 }}>×</button>}
            </div>
            {filtered.length === 0 && <div style={{ padding: "8px 10px", fontSize: 11, color: "rgba(255,255,255,.3)" }}>No results</div>}
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {filtered.map(([k, v]) => {
                const isCur = k === current, isOther = k === exclude;
                return (
                <button key={k} onClick={() => { if (isCur) { setShow(false); return; } onSelect(k); setShow(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: 0, background: isCur ? "rgba(255,255,255,.08)" : "transparent", borderRadius: 8, cursor: isCur ? "default" : "pointer", color: "#fff", fontSize: 13, fontFamily: "inherit", textAlign: "left", transition: "background 120ms", opacity: isCur ? 0.6 : 1 }}
                  onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
                  onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: v.color, display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{v.icon}</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{k}</div><div style={{ fontSize: 10, opacity: 0.4 }}>{v.name}</div></div>
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
        <div style={{ display: "flex", gap: 3 }}>
          {(hotkeyList || HOTKEY_COINS).map(k => {
            const isCur = k === current, isExcl = k === exclude;
            return (
            <button key={k} tabIndex={-1} onClick={() => { onSelect(k); setShow(false); }} title={COINS[k].name}
              style={{
                width: 24, height: 24, borderRadius: "50%", padding: 0, fontSize: 10, fontWeight: 700,
                border: isCur ? `2px solid ${COINS[k].color}` : isExcl ? `2px solid ${COINS[k].color}44` : "2px solid rgba(255,255,255,.08)",
                background: isCur ? `${COINS[k].color}22` : isExcl ? `${COINS[k].color}11` : "rgba(255,255,255,.03)",
                color: isCur ? COINS[k].color : isExcl ? `${COINS[k].color}88` : "rgba(255,255,255,.35)",
                cursor: "pointer", display: "grid", placeItems: "center", transition: "all 150ms",
              }}
              onMouseEnter={e => { if (!isCur) { e.currentTarget.style.borderColor = `${COINS[k].color}66`; e.currentTarget.style.color = COINS[k].color; } }}
              onMouseLeave={e => { if (!isCur) { e.currentTarget.style.borderColor = isExcl ? `${COINS[k].color}44` : "rgba(255,255,255,.08)"; e.currentTarget.style.color = isExcl ? `${COINS[k].color}88` : "rgba(255,255,255,.35)"; } }}>
              {COINS[k].icon}
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Review Modal ──
function ReviewModal({ buyAsset, spendAsset, buyValue, spendValue, rate, onConfirm, onBack }) {
  const bInfo = COINS[buyAsset], sInfo = COINS[spendAsset];
  return (
    <div className="cv-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onBack(); }}>
      <div className="cv-modal">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Review Order</span>
          <button onClick={onBack} style={{ background: "none", border: 0, color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 18, fontFamily: "inherit", lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>

        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div className="cv-row">
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>You buy</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              <span style={{ color: bInfo.color, marginRight: 6 }}>{bInfo.icon}</span>
              {addCommas(buyValue)} {buyAsset}
            </span>
          </div>
          <div className="cv-row">
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>You spend</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              <span style={{ color: sInfo.color, marginRight: 6 }}>{sInfo.icon}</span>
              {addCommas(spendValue)} {spendAsset}
            </span>
          </div>
          <div className="cv-row">
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Rate</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>
              1 {buyAsset} = {(1/rate) >= 1 ? addCommas((1/rate).toFixed((1/rate) >= 100 ? 2 : 4)) : (1/rate).toFixed(8)} {spendAsset}
            </span>
          </div>
          <div className="cv-row" style={{ borderBottom: "none" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)" }}>Fee</span>
            <span style={{ fontSize: 12, color: "#4ade80" }}>0.00 (Free)</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.6)", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", transition: "all 150ms" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            Back
          </button>
          <button onClick={onConfirm} style={{ flex: 2, height: 44, borderRadius: 10, border: 0, background: `linear-gradient(135deg, ${bInfo.color}, ${bInfo.color}cc)`, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all 150ms", boxShadow: `0 4px 16px ${bInfo.color}33` }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
            Confirm Buy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success sound ──
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, start, dur, vol = 0.12) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
    };
    play(523, 0, 0.15, 0.1); play(659, 0.08, 0.15, 0.1); play(784, 0.16, 0.25, 0.12); play(1047, 0.28, 0.35, 0.08);
  } catch {}
}

// ── Confetti ──
function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const W = cvs.width = cvs.parentElement.offsetWidth, H = cvs.height = cvs.parentElement.offsetHeight;
    const colors = ["#f7931a","#627eea","#26a17b","#9945ff","#f0b90b","#00aae4","#ff6b6b","#4ade80","#facc15","#38bdf8"];
    const pieces = Array.from({ length: 80 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.3,
      y: H * 0.35,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 14 - 4,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rv: (Math.random() - 0.5) * 12,
      opacity: 1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      pieces.forEach(p => {
        p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.rot += p.rv;
        p.vx *= 0.99; p.opacity -= 0.006;
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
      if (alive > 0) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return React.createElement("canvas", { ref: canvasRef, style: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 } });
}

// ── Success Modal ──
function SuccessModal({ buyAsset, buyValue, onDone }) {
  const info = COINS[buyAsset];
  useEffect(() => { playSuccessSound(); }, []);
  return (
    <div className="cv-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onDone(); }}>
      <Confetti />
      <div className="cv-modal cv-success" style={{ position: "relative", zIndex: 2 }}>
        <div className="cv-check" style={{ background: `${info.color}22`, color: info.color }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Purchase Complete</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", marginBottom: 20 }}>
          You bought <span style={{ color: info.color, fontWeight: 600 }}>{addCommas(buyValue)} {buyAsset}</span>
        </div>
        <button onClick={onDone} style={{ width: "100%", height: 44, borderRadius: 10, border: 0, background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", transition: "all 150ms" }}>
          Done
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════════
export default function CryptoConverter() {
  const [buyAsset, setBuyAsset] = useState("BTC"), [spendAsset, setSpendAsset] = useState("USDT");
  const [spendValue, setSpendValue] = useState(""), [buyValue, setBuyValue] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [showBuySelect, setShowBuySelect] = useState(false), [showSpendSelect, setShowSpendSelect] = useState(false);
  const [rates, setRates] = useState(BASE_RATES), [rateDir, setRateDir] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "review" | "success"

  const closeAll = () => { setShowBuySelect(false); setShowSpendSelect(false); };

  // Clear both fields with staggered animation (top first, then bottom)
  const clearAllRef = useRef(null);
  const clearAllFields = () => {
    setActiveField(null);
    setBuyValue("");
    if (clearAllRef.current) clearTimeout(clearAllRef.current);
    clearAllRef.current = setTimeout(() => setSpendValue(""), 280);
  };
  useEffect(() => () => { if (clearAllRef.current) clearTimeout(clearAllRef.current); }, []);

  // Rate loading on coin change
  useEffect(() => { setRateLoading(true); const t = setTimeout(() => setRateLoading(false), 600); return () => clearTimeout(t); }, [buyAsset, spendAsset]);

  // Live rate ticker
  useEffect(() => {
    const id = setInterval(() => {
      setRates(prev => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) next[k] = Math.round(v * (1 + (Math.random() - 0.48) * 0.003) * 100) / 100;
        const rk = `${spendAsset}/USDT`;
        if (next[rk] && prev[rk]) setRateDir(next[rk] > prev[rk] ? "up" : "down");
        return next;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [spendAsset, buyAsset]);

  const rate = getRate(rates, spendAsset, buyAsset);
  const buyInfo = COINS[buyAsset], spendInfo = COINS[spendAsset];

  // Cross-compute
  useEffect(() => { if (activeField !== "spend") return; const n = Number(spendValue); if (!spendValue || !Number.isFinite(n) || n === 0) { setBuyValue(""); return; } setBuyValue((n * rate).toFixed(countDecimals(buyInfo.decimals))); }, [spendValue, rate, activeField, buyInfo]);
  useEffect(() => { if (activeField !== "buy") return; const n = Number(buyValue); if (!buyValue || !Number.isFinite(n) || n === 0) { setSpendValue(""); return; } setSpendValue((n / rate).toFixed(countDecimals(spendInfo.decimals))); }, [buyValue, rate, activeField, spendInfo]);
  useEffect(() => { if (activeField === "spend") return; const n = Number(buyValue); if (buyValue && Number.isFinite(n) && n > 0) setSpendValue((n / rate).toFixed(countDecimals(spendInfo.decimals))); }, [rate]);

  // Swap
  const [swapPhase, setSwapPhase] = useState(null);
  const [swapRot, setSwapRot] = useState(0);
  const swap = () => {
    if (swapPhase) return;
    setSwapRot(r => r + 180);
    setSwapPhase("out");
    setTimeout(() => {
      const sb = spendAsset, ba = buyAsset, sv = spendValue, bv = buyValue;
      setBuyAsset(sb); setSpendAsset(ba); setBuyValue(sv); setSpendValue(bv);
      setActiveField(null);
      setSwapPhase("in");
      setTimeout(() => setSwapPhase(null), 240);
    }, 180);
  };

  // Swap-aware coin selection — if user picks the other field's coin, swap assets + clear values
  const selectBuyCoin = k => {
    if (k === buyAsset) return;
    if (k === spendAsset) {
      setSwapRot(r => r + 180);
      setSwapPhase("out");
      setTimeout(() => {
        setBuyAsset(k); setSpendAsset(buyAsset);
        setBuyValue(""); setSpendValue("");
        setActiveField(null);
        setSwapPhase("in");
        setTimeout(() => setSwapPhase(null), 240);
      }, 180);
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
      setTimeout(() => {
        setSpendAsset(k); setBuyAsset(spendAsset);
        setBuyValue(""); setSpendValue("");
        setActiveField(null);
        setSwapPhase("in");
        setTimeout(() => setSwapPhase(null), 240);
      }, 180);
    } else {
      setSpendAsset(k);
      if (buyValue || spendValue) { setBuyValue(""); setSpendValue(""); setActiveField(null); }
    }
  };

  // Balance click = 100%
  const spendMax = () => { setActiveField("spend"); setSpendValue(spendInfo.balance.toFixed(countDecimals(spendInfo.decimals))); };
  const buyMax = () => { setActiveField("buy"); setBuyValue(buyInfo.balance.toFixed(countDecimals(buyInfo.decimals))); };

  // Pct adjusters
  const handleSpendPct = val => { setActiveField("spend"); setSpendValue(val); };
  const handleBuyPct = val => { setActiveField("buy"); setBuyValue(val); };

  const spendExceeds = spendValue && Number(spendValue) > spendInfo.balance;
  const canBuy = spendValue && Number(spendValue) > 0 && buyValue && Number(buyValue) > 0 && !spendExceeds;

  const cardBase = { borderRadius: 14, padding: "12px 14px 10px", border: "1px solid rgba(255,255,255,.06)", position: "relative", background: "rgba(255,255,255,.03)", overflow: "visible", transition: "transform 280ms cubic-bezier(.2,.8,.2,1), opacity 280ms ease" };

  return (
    <div style={{ minHeight: "100vh", background: "#121218", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'JetBrains Mono',ui-monospace,monospace" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 460 }}>
        {/* ── Compact header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span key={`hs-${spendAsset}-${buyAsset}`} style={{ display: "inline-block", fontSize: 17, fontWeight: 700, color: COINS[spendAsset].color, animation: swapPhase === "out" ? "cvHdrOut 170ms ease 60ms forwards" : swapPhase === "in" ? "cvHdrIn 220ms ease 40ms both" : "none" }}>{spendAsset}</span>
          <span key={`ha-${spendAsset}-${buyAsset}`} style={{ display: "inline-block", fontSize: 13, color: "rgba(255,255,255,.35)", animation: swapPhase === "out" ? "cvHdrOut 170ms ease 90ms forwards" : swapPhase === "in" ? "cvHdrIn 220ms ease 70ms both" : "none" }}>→</span>
          <span key={`hb-${spendAsset}-${buyAsset}`} style={{ display: "inline-block", fontSize: 17, fontWeight: 700, color: COINS[buyAsset].color, animation: swapPhase === "out" ? "cvHdrOut 170ms ease 120ms forwards" : swapPhase === "in" ? "cvHdrIn 220ms ease 100ms both" : "none" }}>{buyAsset}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>1 {buyAsset} =</span>
          {rateLoading ? <span className="cv-shimmer" style={{ width: 64 }} /> : <RollingRate rate={1 / rate} decimals={(1 / rate) >= 100 ? 2 : (1 / rate) >= 1 ? 4 : 8} direction={rateDir === "up" ? "down" : rateDir === "down" ? "up" : null} />}
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>{spendAsset}</span>
        </div>

        {/* ── Cards with notch ── */}
        <div style={{ position: "relative", overflow: "visible" }}>

          {/* BUY card (TOP) */}
          <div style={{ ...cardBase, zIndex: 12, paddingBottom: 20, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, transform: swapPhase === "out" ? "translateY(2px)" : "none", opacity: swapPhase === "out" ? 0.95 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.3)" }}>You buy <span style={{ color: buyInfo.color, opacity: 0.6 }}>{buyInfo.name}</span></div>
              <button tabIndex={-1} onClick={buyMax} title="Use full balance" style={{ fontSize: 11, color: "rgba(255,255,255,.3)", background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "2px 0", transition: "color 120ms" }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}>
                Bal: <span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{addCommas(buyInfo.balance.toFixed(countDecimals(buyInfo.decimals)))}</span>
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(3px)" : "none" }}>
              <CoinSelect current={buyAsset} onSelect={selectBuyCoin} show={showBuySelect} setShow={setShowBuySelect} closeAll={closeAll} exclude={spendAsset} hotkeys={true} />
              <PctAdjuster balance={buyInfo.balance} decimals={buyInfo.decimals} currentValue={buyValue} onSet={handleBuyPct} />
            </div>
            <div onFocus={() => setActiveField("buy")} style={{ transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(3px)" : "none" }}>
              <RollingAmountInput value={buyValue} onChange={setBuyValue} balance={buyInfo.balance} step={buyInfo.decimals} max={100_000_000} placeholder={`0.00 ${buyAsset}`} suffix={buyAsset} fadeColor="rgb(25,25,31)" displayAnim={swapPhase === "out" ? "cvSwapOutDown 170ms ease forwards" : swapPhase === "in" ? "cvSwapInUp 220ms ease both" : null} onEnter={() => { if (canBuy) setModal("review"); }} />
            </div>
          </div>

          {/* ── Swap notch: card borders wrap around the button ── */}
          <div style={{ display: "flex", justifyContent: "center", position: "relative", zIndex: 15, height: 16 }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(-50%, -50%) scale(${swapPhase === "out" ? 0.92 : 1})`,
              width: 42, height: 42, borderRadius: "50%",
              background: "#121218",
              display: "grid", placeItems: "center",
              transition: "transform 300ms cubic-bezier(.2,.8,.2,1)",
            }}>
              <button tabIndex={-1} onClick={swap} title="Swap assets"
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,.04)",
                  color: "rgba(255,255,255,.4)", cursor: "pointer",
                  display: "grid", placeItems: "center",
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

          {/* SPEND card (BOTTOM) */}
          <div style={{ ...cardBase, zIndex: 2, paddingTop: 20, borderTopLeftRadius: 14, borderTopRightRadius: 14, transform: swapPhase === "out" ? "translateY(-2px)" : "none", opacity: swapPhase === "out" ? 0.95 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,.3)" }}>You spend <span style={{ color: spendInfo.color, opacity: 0.6 }}>{spendInfo.name}</span></div>
              <button tabIndex={-1} onClick={spendMax} title="Use full balance" style={{ fontSize: 11, color: "rgba(255,255,255,.3)", background: "none", border: 0, cursor: "pointer", fontFamily: "inherit", padding: "2px 0", transition: "color 120ms" }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.3)"}>
                Bal: <span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{addCommas(spendInfo.balance.toFixed(countDecimals(spendInfo.decimals)))}</span>
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(-3px)" : "none" }}>
              <CoinSelect current={spendAsset} onSelect={selectSpendCoin} show={showSpendSelect} setShow={setShowSpendSelect} closeAll={closeAll} exclude={buyAsset} hotkeys={true} hotkeyList={HOTKEY_COINS_SPEND} />
              <PctAdjuster balance={spendInfo.balance} decimals={spendInfo.decimals} currentValue={spendValue} onSet={handleSpendPct} />
            </div>
            <div onFocus={() => setActiveField("spend")} style={{ transition: "opacity 180ms ease, transform 180ms ease", opacity: swapPhase === "out" ? 0.88 : 1, transform: swapPhase === "out" ? "translateY(-3px)" : "none" }}>
              <RollingAmountInput value={spendValue} onChange={setSpendValue} balance={spendInfo.balance} step={spendInfo.decimals} max={100_000_000} placeholder={`0.00 ${spendAsset}`} suffix={spendAsset} fadeColor="rgb(25,25,31)" warnExceedsBalance={true} displayAnim={swapPhase === "out" ? "cvSwapOutUp 170ms ease forwards" : swapPhase === "in" ? "cvSwapInDown 220ms ease both" : null} onEnter={() => { if (canBuy) setModal("review"); }} />
            </div>
          </div>
        </div>

        {/* ── Buy button ── */}
        <button tabIndex={-1} onClick={() => canBuy && setModal("review")}
          style={{
            width: "100%", height: 48, marginTop: 16, borderRadius: 12, border: spendExceeds ? "1px solid rgba(255,80,80,.25)" : 0, fontFamily: "inherit",
            background: spendExceeds ? "rgba(255,60,60,.08)" : `linear-gradient(135deg, ${COINS[buyAsset].color}, ${COINS[buyAsset].color}cc)`,
            color: spendExceeds ? "rgba(255,100,100,.7)" : "#fff", fontSize: 15, fontWeight: 700, cursor: canBuy ? "pointer" : "default",
            letterSpacing: "0.02em", transition: "all 200ms",
            boxShadow: canBuy ? `0 4px 20px ${COINS[buyAsset].color}33` : "none",
            opacity: canBuy ? 1 : spendExceeds ? 1 : 0.35,
          }}
          onMouseEnter={e => { if (canBuy) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 24px ${COINS[buyAsset].color}55`; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = canBuy ? `0 4px 20px ${COINS[buyAsset].color}33` : "none"; }}>
          {spendExceeds ? "Insufficient balance" : `Buy ${buyAsset}`}
        </button>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 10, gap: 8 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,.15)" }}>↑↓ step · SHIFT ×10 · Hold to accelerate · ESC clear · ENTER confirm</span>
          {(buyValue || spendValue) && <button tabIndex={-1} onClick={clearAllFields} style={{ fontSize: 10, color: "rgba(255,255,255,.25)", background: "none", border: "1px solid rgba(255,255,255,.08)", borderRadius: 4, padding: "1px 6px", cursor: "pointer", fontFamily: "inherit", transition: "all 120ms" }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,.25)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.08)"; }}>Clear All</button>}
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "review" && (
        <ReviewModal
          buyAsset={buyAsset} spendAsset={spendAsset}
          buyValue={buyValue} spendValue={spendValue} rate={rate}
          onBack={() => setModal(null)}
          onConfirm={() => setModal("success")}
        />
      )}
      {modal === "success" && (
        <SuccessModal buyAsset={buyAsset} buyValue={buyValue} onDone={() => { setModal(null); setSpendValue(""); setBuyValue(""); }} />
      )}
    </div>
  );
}
