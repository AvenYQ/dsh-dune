/** Pixel-galaxy and fine radial glints, measured from the supplied video. */
export function createReferenceFX(bandCanvas, auraCanvas, options = {}) {
  const band = bandCanvas.getContext('2d');
  const aura = auraCanvas.getContext('2d');
  if (!band || !aura) throw new Error('Reference effects need Canvas 2D.');
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(Number(n)) ? Number(n) : a));
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const state = { position: 0, maximum: false, dragging: false, disabled: false, dark: true, ...options };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['146,201,255', '162,222,246', '213,175,247', '242,160,212', '155,160,245', '225,220,255'];
  const rays = Array.from({ length: 25 }, (_, i) => ({
    angle: i / 25 * Math.PI * 2 + (hash(i + 110) - .5) * .08,
    length: 31 + hash(i + 230) * 15,
    start: 15 + hash(i + 310) * 3,
    phase: hash(i + 410) * Math.PI * 2,
    alpha: .30 + hash(i + 510) * .40,
  }));
  const sparks = Array.from({ length: 12 }, (_, index) => ({
    angle: hash(index + 1201) * Math.PI * 2,
    radius: 7 + hash(index + 1301) * 27,
    phase: hash(index + 1401),
    period: 1.1 + hash(index + 1501) * 1.9,
    travel: 2 + hash(index + 1601) * 5,
    color: index % 3 === 0 ? '251,225,255' : '199,226,255',
  }));
  let bw = 1, bh = 1, aw = 1, ah = 1, dpr = 1, pixels = [];
  let raf = 0, destroyed = false, lastDraw = -1000;
  let pulseAt = state.maximum ? performance.now() : -Infinity;

  function makePixels() {
    const step = Math.max(4, Math.round(bh / 5));
    const rows = Math.max(4, Math.floor(bh / step));
    const rowOffset = (bh - (rows - 1) * step) / 2;
    const cols = Math.ceil(bw / step);
    pixels = [];
    for (let col = 0; col < cols; col++) {
      const horizontal = col / Math.max(1, cols - 1);
      for (let row = 0; row < rows; row++) {
        const seed = col * 31 + row * 173;
        const v = rows <= 1 ? .5 : row / (rows - 1);
        const center = 1 - Math.abs(v - .5) * 1.65;
        const density = .065 + Math.pow(horizontal, .92) * .81 + center * horizontal * .12;
        if (hash(seed + 1) > density) continue;
        const size = Math.round(step * (.69 + hash(seed + 2) * .20));
        const initial = .4 + hash(seed + 5) * .65;
        pixels.push({
          x: col * step + step * .25, y: rowOffset + row * step,
          size, alpha: Math.min(.96, .19 + Math.pow(horizontal, 1.25) * .70 + hash(seed + 4) * .17),
          color: colors[Math.floor(hash(seed + 3) * colors.length)],
          seed, cycle: 0, from: initial, to: initial,
          changedAt: 0, transition: 1, nextAt: performance.now() + hash(seed + 6) * 470,
        });
      }
    }
  }

  function clear() {
    band.setTransform(dpr, 0, 0, dpr, 0, 0);
    aura.setTransform(dpr, 0, 0, dpr, 0, 0);
    band.clearRect(0, 0, bw, bh);
    aura.clearRect(0, 0, aw, ah);
  }
  function draw(now) {
    clear();
    bandCanvas.dataset.effect = state.maximum ? 'pixel-galaxy' : 'empty';
    bandCanvas.dataset.phase = state.maximum ? (now - pulseAt < 180 && !reduced.matches ? 'ignite' : 'steady') : 'normal';
    if (!state.maximum) return;
    const still = reduced.matches || state.disabled;
    const t = still ? 0 : now / 1000;
    const flash = still ? 0 : Math.max(0, 1 - (now - pulseAt) / 180);
    const bg = band.createLinearGradient(0, 0, bw, 0);
    bg.addColorStop(0, '#08061a'); bg.addColorStop(.5, '#120b25'); bg.addColorStop(1, '#201438');
    band.fillStyle = bg; band.fillRect(0, 0, bw, bh);
    for (const p of pixels) {
      const progress = clamp((now - p.changedAt) / p.transition);
      const brightness = p.from + (p.to - p.from) * progress * progress * (3 - 2 * progress);
      if (!still && now >= p.nextAt) {
        p.cycle += 1;
        p.from = brightness;
        p.to = .4 + hash(p.seed + p.cycle * 7919) * .65;
        p.changedAt = now;
        p.transition = 50 + hash(p.seed + p.cycle * 4231) * 70;
        p.nextAt = now + p.transition + 90 + hash(p.seed + p.cycle * 3253) * 350;
      }
      const shimmer = still ? .86 : brightness;
      const glint = still ? 0 : Math.max(0, shimmer - .8) / .25;
      const opacity = Math.min(1, p.alpha * shimmer + flash * .23);
      band.fillStyle = `rgba(${p.color},${opacity})`;
      if (p.alpha > .7) {
        band.shadowColor = `rgba(${p.color},${opacity * (.18 + glint * .30)})`;
        band.shadowBlur = 1.5 + glint;
      } else { band.shadowBlur = 0; }
      band.fillRect(Math.round(p.x), Math.round(p.y - p.size / 2), p.size, p.size);
    }
    band.shadowBlur = 0;
    const cx = (aw - bw) / 2 + clamp(state.position) * bw;
    const cy = (ah - bh) / 2 + bh / 2;
    const radius = 34 + flash * 9;
    const glow = aura.createRadialGradient(cx, cy, 3, cx, cy, radius);
    glow.addColorStop(0, `rgba(210,219,255,${.16 + flash * .28})`);
    glow.addColorStop(.28, `rgba(143,112,255,${.13 + flash * .20})`);
    glow.addColorStop(.62, `rgba(100,64,190,${.04 + flash * .08})`);
    glow.addColorStop(1, 'rgba(93,55,173,0)');
    aura.fillStyle = glow; aura.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    for (const ray of rays) {
      const breathe = still ? .87 : .68 + Math.sin(t * 5.2 + ray.phase) * .32;
      const end = ray.length + flash * 7;
      for (let r = ray.start; r < end; r += 4.0) {
        const fade = (.28 + .72 * (1 - (r - ray.start) / (end - ray.start))) * breathe;
        aura.fillStyle = `rgba(167,193,241,${ray.alpha * fade + flash * .16 * fade})`;
        const size = r < 26 ? 1.1 : 1.0;
        aura.fillRect(cx + Math.cos(ray.angle) * r - size / 2, cy + Math.sin(ray.angle) * r - size / 2, size, size);
      }
    }
    if (!still) {
      for (const spark of sparks) {
        const age = (t / spark.period + spark.phase) % 1;
        const brightness = Math.pow(Math.sin(Math.PI * age), 10);
        if (brightness < .03) continue;
        const distance = spark.radius + (age - .5) * spark.travel;
        const x = Math.round(cx + Math.cos(spark.angle) * distance);
        const y = Math.round(cy + Math.sin(spark.angle) * distance);
        aura.fillStyle = `rgba(${spark.color},${brightness * .85})`;
        aura.fillRect(x, y, 1.5, 1.5);
        if (brightness > .65) {
          aura.fillStyle = `rgba(${spark.color},${(brightness - .65) * .7})`;
          aura.fillRect(x - 2, y + .5, 5, .5);
          aura.fillRect(x + .5, y - 2, .5, 5);
        }
      }
    }
  }
  function animated() { return state.maximum && !state.disabled && !reduced.matches; }
  function tick(now) {
    raf = 0;
    if (destroyed || document.hidden) return;
    if (now - lastDraw >= 1000 / 30 - 1) { draw(now); lastDraw = now; }
    if (animated()) raf = requestAnimationFrame(tick);
  }
  function wake(force = false) {
    if (destroyed || document.hidden) return;
    if (force || !animated()) { draw(performance.now()); lastDraw = performance.now(); }
    if (animated() && !raf) raf = requestAnimationFrame(tick);
  }
  function resize() {
    const b = bandCanvas.getBoundingClientRect(), a = auraCanvas.getBoundingClientRect();
    bw = Math.max(1, b.width); bh = Math.max(1, b.height);
    aw = Math.max(1, a.width); ah = Math.max(1, a.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const [canvas, w, h] of [[bandCanvas, bw, bh], [auraCanvas, aw, ah]]) {
      const pxw = Math.round(w * dpr), pxh = Math.round(h * dpr);
      if (canvas.width !== pxw) canvas.width = pxw;
      if (canvas.height !== pxh) canvas.height = pxh;
    }
    makePixels(); wake(true);
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function visibility() { if (document.hidden) stop(); else { lastDraw = -1000; wake(true); } }
  function motion() { stop(); pulseAt = -Infinity; lastDraw = -1000; wake(true); }
  const observer = new ResizeObserver(resize);
  observer.observe(bandCanvas); observer.observe(auraCanvas);
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', motion);
  resize();
  return {
    update(next = {}) {
      if (destroyed) return;
      const wasMax = state.maximum;
      Object.assign(state, next); state.position = clamp(state.position);
      state.maximum = Boolean(state.maximum); state.disabled = Boolean(state.disabled);
      if (!wasMax && state.maximum) pulseAt = performance.now();
      if (!animated()) stop();
      wake(!animated() || !wasMax);
    },
    pulse() { if (!destroyed) { pulseAt = performance.now(); wake(true); } },
    destroy() {
      if (destroyed) return;
      destroyed = true; stop(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', motion);
      clear(); delete bandCanvas.dataset.effect; delete bandCanvas.dataset.phase; pixels = [];
    },
  };
}
