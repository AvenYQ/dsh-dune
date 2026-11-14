import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { createReferenceFX } from './reasoning-fx.js';
import css from './reasoning.css';
import whale from './deepseek-whale.svg';

const clamp = n => Math.max(0, Math.min(1, n));
const styleText = css.replaceAll('/assets/deepseek-whale.svg', 'data:image/svg+xml,' + encodeURIComponent(whale));

function Slider({ directory, state, reasoning }) {
  const efforts = reasoning.efforts;
  const effective = state.current.reasoningEffort ?? reasoning.defaultEffort;
  const current = Math.max(0, efforts.findIndex(x => x.id === effective));
  const [position, setPosition] = useState(current / (efforts.length - 1));
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const track = useRef(null), travel = useRef(null), band = useRef(null), aura = useRef(null), fx = useRef(null), gesture = useRef(null);
  const selected = Math.round(position * (efforts.length - 1));
  const maximum = position >= .985;
  useEffect(() => { if (!gesture.current) setPosition(current / (efforts.length - 1)); }, [current, efforts.length, state.current.model]);
  useEffect(() => {
    let effect;
    try { effect = createReferenceFX(band.current, aura.current); fx.current = effect; } catch (_) { return; }
    return () => { fx.current = null; effect.destroy(); };
  }, []);
  useEffect(() => {
    const width = band.current?.getBoundingClientRect().width || 300;
    fx.current?.update({ position: (14 + position * (width - 28)) / width, maximum, dragging, dark: true });
  }, [position, maximum, dragging]);
  function fraction(e) { const box = travel.current.getBoundingClientRect(); return clamp((e.clientX - box.left) / box.width); }
  async function commit(index, reset = false) {
    const p = index / (efforts.length - 1); setPosition(p); setDragging(false); setError('');
    const selection = { provider: state.current.provider, model: state.current.model };
    if (!reset) selection.reasoningEffort = efforts[index].id;
    try {
      const result = await directory.select(selection);
      if (!result?.ok) throw new Error(result?.error?.message || '切换失败');
    } catch (e) { setPosition(current / (efforts.length - 1)); setError(e.message || '切换失败'); }
  }
  function start(e) {
    if (!e.isPrimary || e.button !== 0 || state.pending) return;
    e.preventDefault(); e.stopPropagation(); track.current.focus();
    gesture.current = e.pointerId; track.current.setPointerCapture(e.pointerId);
    setDragging(true); setPosition(fraction(e));
  }
  function move(e) { if (gesture.current === e.pointerId) { e.stopPropagation(); setPosition(fraction(e)); } }
  function finish(e) { if (gesture.current !== e.pointerId) return; e.stopPropagation(); gesture.current = null; commit(Math.round(fraction(e) * (efforts.length - 1))); }
  function cancel() { if (gesture.current === null) return; gesture.current = null; setDragging(false); setPosition(current / (efforts.length - 1)); }
  function key(e) {
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? efforts.length - 1 : ['ArrowLeft','ArrowDown'].includes(e.key) ? Math.max(0, selected - 1) : ['ArrowRight','ArrowUp'].includes(e.key) ? Math.min(efforts.length - 1, selected + 1) : null;
    if (index !== null) { e.preventDefault(); e.stopPropagation(); if (!state.pending) commit(index); }
  }
  useEffect(() => {
    const onMenuKey = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target?.isContentEditable) return;
      const menu = track.current?.closest('[role="menu"]');
      const rows = menu ? [...menu.children].filter(el => el.matches('button[role="menuitem"]')) : [];
      if (rows.length !== 2) return;
      const index = e.key === 'Home' ? 0 : e.key === 'End' ? efforts.length - 1 : e.key === 'ArrowLeft' ? Math.max(0, selected - 1) : e.key === 'ArrowRight' ? Math.min(efforts.length - 1, selected + 1) : null;
      if (index === null) return;
      e.preventDefault(); e.stopPropagation(); if (!state.pending) commit(index);
    };
    document.addEventListener('keydown', onMenuKey, true);
    return () => document.removeEventListener('keydown', onMenuKey, true);
  }, [selected, state.pending, efforts]);
  const label = efforts[selected]?.name || efforts[selected]?.id;
  return <section className="reference-control dune-reasoning" data-effort={selected === 0 ? 'Low' : 'High'} data-maximum={maximum} data-dragging={dragging} onClick={e => e.stopPropagation()}>
    <div className="reference-card"><div className="reference-heading"><span>Effort</span><strong aria-live="polite">{label}</strong></div>
    <div className="reference-directions"><span>Faster</span><span>Smarter</span></div>
    <div className="reference-rail" ref={track} role="slider" tabIndex={0} aria-label="推理等级" aria-valuemin={0} aria-valuemax={efforts.length - 1} aria-valuenow={selected} aria-valuetext={label} aria-disabled={!!state.pending} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={key} style={{'--position': position}}>
      <div className="reference-band"><div className="reference-fill"/><canvas ref={band} aria-hidden="true"/></div>
      <div className="reference-travel" ref={travel}>{efforts.map((level, i) => <span className="reference-tick" key={level.id} style={{left: `${i / (efforts.length - 1) * 100}%`}}/>)}<span className="reference-knob"/></div><canvas className="reference-aura" ref={aura} aria-hidden="true"/>
    </div><div className="reference-footer"><button type="button" disabled={!!state.pending} onClick={() => commit(Math.max(0, efforts.findIndex(x => x.id === reasoning.defaultEffort)), true)}>
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
        <path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6" />
      </svg>
      Default
    </button></div>
    {error && <div role="alert">{error}</div>}</div></section>;
}

export function ModelLabel({ provider, model, placement, directory }) {
  const anchor = useRef(null);
  const state = useSyncExternalStore(fn => directory.store.subscribe(fn), () => directory.store.getSnapshot());
  const [target, setTarget] = useState(null);
  const choice = state.groups?.find(g => g.id === state.current?.provider)?.models?.find(m => m.id === state.current?.model);
  const reasoning = choice?.reasoning;
  const supported = placement === 'trigger' && Array.isArray(reasoning?.efforts) && reasoning.efforts.length >= 2;
  useEffect(() => {
    if (!supported) return;
    const trigger = anchor.current?.closest('button[aria-haspopup="menu"]');
    if (!trigger) return;
    let hidden = null, portal = null, menuObserver = null, observedMenu = null;
    const restore = () => { if (hidden) { hidden.style.display = ''; hidden = null; } if (portal) { portal.remove(); portal = null; } };
    const observeMenu = menu => {
      if (menu === observedMenu) return;
      menuObserver?.disconnect();
      menuObserver = null;
      observedMenu = menu;
      if (!menu) return;
      menuObserver = new MutationObserver(schedule);
      menuObserver.observe(menu, {childList:true, subtree:true});
    };
    const sync = () => {
      const menu = trigger.getAttribute('aria-expanded') === 'true' && document.getElementById(trigger.getAttribute('aria-controls'));
      observeMenu(menu || null);
      const cells = menu ? [...menu.children].filter(el => el.matches('button[role="menuitem"]')) : [];
      const row = cells.length === 2 ? cells[1] : null;
      if (hidden === row && portal?.isConnected) return;
      restore();
      if (row) { portal = document.createElement('div'); portal.dataset.duneReasoning = ''; row.after(portal); hidden = row; hidden.style.display = 'none'; setTarget(portal); }
      else setTarget(null);
    };
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; sync(); }); };
    const observer = new MutationObserver(schedule);
    observer.observe(trigger, {attributes:true, attributeFilter:['aria-expanded','aria-controls']});
    observer.observe(document.body, {childList:true}); sync();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); menuObserver?.disconnect(); restore(); };
  }, [supported, state.current?.provider, state.current?.model]);
  return <><span ref={anchor}>{model.badge ? `${model.badge} ` : ''}{model.name}</span>{supported && target && createPortal(<Slider directory={directory} state={state} reasoning={reasoning}/>, target)}</>;
}
export function installStyle() {
  const node = document.createElement('style'); node.dataset.duneReasoningStyle = ''; node.textContent = styleText + '\n.dune-reasoning{width:300px;max-width:calc(100vw - 40px)}.dune-bot-effort .dune-reasoning{width:auto;max-width:100%}.dune-reasoning .reference-card{padding:14px 12px 12px;border:0;box-shadow:none;background:transparent}.dune-reasoning .reference-heading{font-size:14px;line-height:20px}.dune-reasoning .reference-directions{font-size:12px;line-height:16px;margin-top:12px}.dune-reasoning .reference-rail{margin-top:8px}.dune-reasoning .reference-footer{margin-top:10px}.dune-reasoning .reference-footer button{font-size:12px}.dune-reasoning .reference-rail:focus-visible{outline:2px solid #9a7de8;outline-offset:3px}'; document.head.appendChild(node); return () => node.remove();
}

// DS Bot's model menu (Bot mode) fills its `ds-bot.model.effort` place with this: the same
// slider, driven by the Bot's own thinking level instead of the shell's model directory.
// `current` undefined is the model's default; a reset picks undefined again.
export function BotEffort({ efforts, defaultEffort, current, onPick }) {
  const pick = useRef(onPick);
  pick.current = onPick;
  const [directory] = useState(() => ({ select: async selection => { await pick.current?.(selection.reasoningEffort); return { ok: true }; } }));
  if (!Array.isArray(efforts) || efforts.length < 2) return null;
  const state = { current: { provider: 'ds-bot', model: 'bot', reasoningEffort: current }, pending: false };
  return <div className="dune-bot-effort"><Slider directory={directory} state={state} reasoning={{ efforts, defaultEffort }}/></div>;
}
