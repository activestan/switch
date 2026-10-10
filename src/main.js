import { View, look, specOf } from './stage.js';
import { CATS, SETTINGS, TYPE_NAME } from './data.js';
import { loadCatalogue } from './catalogue.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const PRODUCTS = []; let S = { ...SETTINGS };
const money = (n) => S.currency + n.toLocaleString('en-US');
const page = document.body.dataset.page, pageCat = document.body.dataset.cat;
const NOW = Date.now(), pad = (n) => String(n).padStart(2, '0');
const isUp = (p) => p.ts > Date.now();
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const cw = (p) => p.colorways[p.ci];
const mon = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const nextDrop = () => PRODUCTS.filter(isUp).sort((a, b) => a.ts - b.ts)[0];
const swHTML = (p) => p.colorways.length < 2 ? '' : p.colorways.map((c, i) => `<button type="button" class="sw${i === p.ci ? ' on' : ''}" data-ci="${i}" style="--c:${c.hex}" aria-label="${c.name}" title="${c.name}"></button>`).join('');

/* ───────── theme (the SWITCH) ───────── */
function applyTheme(t, save) {
  document.documentElement.dataset.theme = t; look.dark = t === 'dark';
  const b = $('#themeBtn'); if (b) b.setAttribute('aria-checked', look.dark); const l = $('#themeLbl'); if (l) l.textContent = look.dark ? 'ON' : 'OFF';
  if (save) try { localStorage.setItem('sw_theme', t); } catch (e) {}
  $('meta[name=theme-color]')?.setAttribute('content', look.dark ? '#09090a' : '#ece8df');
}
applyTheme(document.documentElement.dataset.theme || 'dark');
$('#themeBtn')?.addEventListener('click', () => { document.body.classList.add('flick'); setTimeout(() => document.body.classList.remove('flick'), 380); applyTheme(look.dark ? 'light' : 'dark', true); });

/* ───────── toast / bag ───────── */
let toastT; const toast = (m) => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };
/* cart (saved on this device) → drawer → one WhatsApp message with the whole order */
const CART_KEY = 'sw_cart', load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
let cart = load(CART_KEY, []);
const cartLines = () => cart.map((l) => { const p = byId(l.id); return p && p.colorways[l.ci] ? { ...l, p, c: p.colorways[l.ci] } : null; }).filter(Boolean);
const cartCount = () => cartLines().reduce((a, l) => a + l.q, 0), cartTotal = () => cartLines().reduce((a, l) => a + l.q * l.p.price, 0);
const paintBag = () => { const c = $('#bagCount'); if (c) c.textContent = cartCount(); };
const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} paintBag(); };
const waUrl = (text) => `https://wa.me/${String(S.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const openWa = (text) => { if (/^0+$/.test(String(S.whatsapp).replace(/\D/g, ''))) toast('Demo number — set the real WhatsApp number in the admin settings'); window.open(waUrl(text), '_blank', 'noopener'); };
const orderText = () => {
  const L = cartLines(), nm = ($('#bdName') || {}).value || '', ar = ($('#bdArea') || {}).value || '';
  return `Hi ${S.brand}! I'd like to order:\n\n${L.map((l, i) => `${i + 1}. ${l.p.name} — ${l.c.name}, size ${l.size} × ${l.q} — ${money(l.p.price * l.q)}`).join('\n')}\n\nTotal: ${money(cartTotal())}\n\nName: ${nm || '—'}\nDelivery area: ${ar || '—'}`;
};
function addToCart(p, ci, size) {
  const l = cart.find((x) => x.id === p.id && x.ci === ci && x.size === size); if (l) l.q++; else cart.push({ id: p.id, ci, size, q: 1 });
  saveCart(); openBag(true);
}
function paintBagDrawer() {
  const L = cartLines(), box = $('#bdItems'); if (!box) return;
  $('#bdN').textContent = cartCount(); $('#bdFoot').style.display = L.length ? '' : 'none';
  box.innerHTML = L.length ? L.map((l, i) => `<div class="bd-item" data-i="${cart.indexOf(cart.find((x) => x.id === l.id && x.ci === l.ci && x.size === l.size))}">
      <i class="bd-sw" style="--c:${l.c.hex}"></i>
      <div class="bd-info"><b>${l.p.name}</b><span>${l.c.name} · ${l.size}</span>
        <div class="bd-q"><button data-a="dec" aria-label="Less">−</button><em>${l.q}</em><button data-a="inc" aria-label="More">+</button></div></div>
      <div class="bd-price">${money(l.p.price * l.q)}<button data-a="rm" aria-label="Remove">Remove</button></div></div>`).join('')
    : `<div class="bd-empty"><p>Your bag is empty.</p><a class="btn btn-ghost" href="tees.html">Shop tees</a></div>`;
  $('#bdTotal').textContent = money(cartTotal());
}
function openBag(on = true) { const d = $('#bagd'); if (!d) return; paintBagDrawer(); d.classList.toggle('open', on); d.setAttribute('aria-hidden', String(!on)); document.body.classList.toggle('bag-open', on); }
function bindBag() {
  const d = $('#bagd'); if (!d) return; $('#bdName').value = load('sw_name', ''); $('#bdArea').value = load('sw_area', '');
  $('#bagBtn')?.addEventListener('click', () => openBag(true)); $('#bdClose').addEventListener('click', () => openBag(false)); $('#bagShade').addEventListener('click', () => openBag(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && d.classList.contains('open')) openBag(false); });
  ['#bdName', '#bdArea'].forEach((s) => $(s).addEventListener('input', (e) => { try { localStorage.setItem(e.target.id === 'bdName' ? 'sw_name' : 'sw_area', JSON.stringify(e.target.value)); } catch (x) {} }));
  $('#bdItems').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return; const it = cart[+b.closest('.bd-item').dataset.i]; if (!it) return;
    if (b.dataset.a === 'inc') it.q++; else if (b.dataset.a === 'dec') it.q = Math.max(1, it.q - 1); else cart.splice(cart.indexOf(it), 1);
    saveCart(); paintBagDrawer();
  });
  $('#bdWa').addEventListener('click', (e) => { e.preventDefault(); if (cartCount()) openWa(orderText()); });
}

/* ───────── 3D views registry (cards, hero, tiles): only visible ones render, and none while the product view is open ───────── */
const views = []; let pvOpen = false;
function sync() { views.forEach((v) => { (v.vis && !pvOpen && !document.hidden) ? v.view.start() : v.view.stop(); }); }
document.addEventListener('visibilitychange', sync);
const io = new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target._v; if (!v) return; v.vis = e.isIntersecting;
  if (v.vis && !v.loaded) { v.loaded = true; v.view.load(v.spec()); }
  sync();
}), { rootMargin: '260px 0px' });
function addView(canvas, spec, o) { const view = new View(canvas, o); const v = { view, spec, vis: false, loaded: false }; views.push(v); canvas._v = v; io.observe(canvas); return v; }

/* ───────── grids ───────── */
function cardHTML(p) {
  return `<article class="card" tabindex="0" role="button" aria-label="View ${p.name}" data-id="${p.id}">
    <div class="card-media"><canvas></canvas>
      <span class="tag ${isUp(p) ? 'up' : ''}">${isUp(p) ? 'Drops ' + mon(p.ts) : 'Available'}</span><span class="live"><i></i>3D</span><span class="view-btn">View</span></div>
    <div class="card-meta"><span class="no">${p.no}</span><h3>${p.name}</h3><span class="price">${money(p.price)}</span>
      <div class="sws">${swHTML(p)}${p.colorways.length > 1 ? `<em class="swn">${p.colorways.length} colours</em>` : ''}</div></div></article>`;
}
function buildGrid() {
  const grid = $('#grid'); if (!grid) return; const mode = grid.dataset.mode;
  let list = PRODUCTS.slice();
  if (mode === 'cat') list = list.filter((p) => p.cat === pageCat);
  else if (mode === 'upcoming') list = list.filter(isUp).sort((a, b) => a.ts - b.ts);
  else if (mode === 'latest') list = list.filter((p) => !isUp(p)).sort((a, b) => b.ts - a.ts).slice(0, +grid.dataset.n || 3);
  grid.innerHTML = list.map(cardHTML).join('');
  if ($('#cAll')) { $('#cAll').textContent = list.length; $('#cRel').textContent = list.filter((p) => !isUp(p)).length; $('#cUp').textContent = list.filter(isUp).length; }
  $$('.card', grid).forEach((c, i) => {
    const p = byId(c.dataset.id), canvas = $('canvas', c);
    const v = addView(canvas, () => specOf(p, cw(p)), { phase: i * 1.7, speed: 0.4 + (i % 3) * 0.05 });
    c.addEventListener('pointerenter', () => { v.view.slow = 0.25; }); c.addEventListener('pointerleave', () => { v.view.slow = 1; });
    c.addEventListener('click', (e) => {
      const b = e.target.closest('.sw');
      if (b) { e.stopPropagation(); p.ci = +b.dataset.ci; $$('.sw', c).forEach((x) => x.classList.toggle('on', x === b)); v.view.load(specOf(p, cw(p))); return; }
      openPV(p.id);
    });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPV(p.id); } });
  });
  $$('#filters .chip').forEach((b) => b.addEventListener('click', () => {
    $$('#filters .chip').forEach((x) => x.classList.toggle('on', x === b));
    $$('.card', grid).forEach((c) => { const p = byId(c.dataset.id), f = b.dataset.f; c.classList.toggle('gone', !(f === 'all' || (f === 'upcoming' ? isUp(p) : !isUp(p)))); });
  }));
}

/* ───────── home: hero, pinned showcase, category tiles ───────── */
const pick = (id, cat) => byId(id) || PRODUCTS.find((p) => p.cat === cat);
function buildDoors() { Object.keys(CATS).forEach((id) => { const n = PRODUCTS.filter((p) => p.cat === id).length, el = $('#n' + id[0].toUpperCase() + id.slice(1)); if (el) el.textContent = `${n} piece${n === 1 ? '' : 's'}`; }); }
function buildHome() {
  const hc = $('#heroCanvas'); if (!hc) return;
  const feats = [pick('standby-tee', 'tees'), pick('baseline-jorts', 'jorts'), pick('relay-hoodie', 'jackets')].filter(Boolean); if (!feats.length) return;
  let k = 0, timer; const n = feats.length;
  const v = addView(hc, () => specOf(feats[k], cw(feats[k])), { drag: true, speed: 0.5, maxW: 1500 });
  const paint = () => { const p = feats[k]; $('#hiNo').textContent = `0${k + 1} / 0${n}`; $('#hiName').textContent = p.name; $('#hiPrice').textContent = money(p.price); $('#hiSw').innerHTML = swHTML(p); $$('#heroSw button').forEach((b, i) => b.classList.toggle('on', i === k)); $('#heroSw').style.setProperty('--k', k); };
  const go = (i) => { k = i; paint(); v.view.load(specOf(feats[k], cw(feats[k]))); };
  const auto = () => { clearInterval(timer); timer = setInterval(() => { if (!pvOpen && v.vis && !v.view.dragging) go((k + 1) % n); }, 8000); };
  $$('#heroSw button').forEach((b) => b.addEventListener('click', () => { go(+b.dataset.i); auto(); }));
  $('#hiSw').addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (!b) return; const p = feats[k]; p.ci = +b.dataset.ci; paint(); v.view.load(specOf(p, cw(p))); auto(); });
  $('#hiView').addEventListener('click', () => openPV(feats[k].id));
  paint(); auto();
  addEventListener('scroll', () => { if (scrollY < innerHeight * 1.2) $('#hero').style.setProperty('--sy', scrollY.toFixed(0)); }, { passive: true });

  buildShowcase();

  const cats = $('#cats'); if (!cats) return;
  cats.innerHTML = Object.entries(CATS).map(([id, c], i) => { const m = PRODUCTS.filter((p) => p.cat === id).length; return `<a class="cat" href="${id}.html"><span class="cat-no">0${i + 1}</span><div class="cat-media"><canvas></canvas></div><div class="cat-meta"><h3>${c.name}</h3><span class="cat-n">${m} piece${m === 1 ? '' : 's'} <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div></a>`; }).join('');
  $$('.cat canvas', cats).forEach((cv, i) => { const id = Object.keys(CATS)[i]; const p = PRODUCTS.find((q) => q.cat === id); if (p) addView(cv, () => specOf(p, cw(p)), { phase: i * 2.1, speed: 0.45 }); });
}
function buildShowcase() {
  const cv = $('#scCanvas'), sec = $('#showcase'); if (!cv || !sec) return;
  const items = [pick('voltage-tee', 'tees'), pick('bleach-jorts', 'jorts'), pick('relay-hoodie', 'jackets')].filter(Boolean); if (!items.length) { sec.hidden = true; return; }
  const n = items.length; let idx = -1;
  const v = addView(cv, () => specOf(items[Math.max(idx, 0)], cw(items[Math.max(idx, 0)])), { speed: 0, maxW: 1100 });
  const steps = $$('#scSteps li');
  const paint = () => {
    const p = items[idx], t = $('#scText'); t.classList.remove('in'); void t.offsetWidth;
    $('#scNo').textContent = `0${idx + 1} / 0${n}`; $('#scName').textContent = p.name; $('#scBlurb').textContent = p.blurb || ''; $('#scPrice').textContent = money(p.price); $('#scSw').innerHTML = swHTML(p);
    $('#scShop').href = p.cat + '.html'; steps.forEach((li, i) => li.classList.toggle('on', i === idx)); t.classList.add('in');
  };
  const set = (i) => { if (i === idx) return; idx = i; paint(); if (v.loaded) { v.view.load(specOf(items[i], cw(items[i]))); v.view.angle = -0.5; } };
  $('#scSw').addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (!b) return; const p = items[idx]; p.ci = +b.dataset.ci; paint(); v.view.load(specOf(p, cw(p))); });
  $('#scView').addEventListener('click', () => openPV(items[idx].id));
  let raf = 0;
  const upd = () => {
    raf = 0; const r = sec.getBoundingClientRect(), vh = innerHeight; if (r.bottom < -vh || r.top > vh * 2) return;
    const pr = Math.min(0.9999, Math.max(0, -r.top / Math.max(1, r.height - vh))), f = pr * n, i = Math.floor(f);
    set(i); v.view.focus({ angle: -0.5 + (f - i) * 3.5 }); sec.style.setProperty('--p', pr.toFixed(3));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); addEventListener('resize', upd); set(0); upd();
}

/* ───────── countdown / notify ───────── */
function bindJoin() { $('#joinForm')?.addEventListener('submit', (e) => { e.preventDefault(); const nm = $('input', e.target).value.trim(); openWa(`Hi ${S.brand}! Please add me to the early-access list.${nm ? ' My name is ' + nm + '.' : ''}`); }); }
function bindDrop() {
  const d = nextDrop(), sec = $('#dropSec'), up = $('.up'); if (!$('#dropName')) return;
  if (!d) { if (sec) sec.hidden = true; if (up) { $('#dropName').textContent = 'Next drop soon'; $('#dropDate').textContent = 'Nothing scheduled yet. Message us to get early access.'; $('#homeCd').hidden = true; $('#dropView').hidden = true; $('.drop-media').hidden = true; $('#dropWa').onclick = () => openWa(`Hi ${S.brand}! Add me to the early-access list.`); } return; }
  $('#dropName').textContent = d.name;
  if ($('#dropDate')) $('#dropDate').textContent = 'Drops ' + new Date(d.ts).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const dc = $('#dropCanvas'); if (dc) addView(dc, () => specOf(d, cw(d)), { drag: true, speed: 0.45, maxW: 900 });
  $('#dropView')?.addEventListener('click', () => openPV(d.id));
  $('#dropWa')?.addEventListener('click', () => openWa(`Hi ${S.brand}! Add me to the early-access list for the ${d.name} (${mon(d.ts)}).`));
}
function tick() {
  const set = (root, ts) => { const t = Math.max(0, ts - Date.now()), s = Math.floor(t / 1000); const v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; $$('[data-u]', root).forEach((n) => { n.textContent = pad(v[n.dataset.u]); }); };
  const d = nextDrop(); if (d && $('#homeCd')) set($('#homeCd'), d.ts); if (pvCur && isUp(pvCur)) set($('#pvCd'), pvCur.ts);
}
setInterval(tick, 1000);

/* ───────── product view ───────── */
const pvSizeI = (p) => Math.min(1, p.sizes.length - 1); let pvSize = '';
let pv, pvCur = null, pvList = [], pvI = 0, closing = false;
const WA_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9.5L5 20v-4H4z"/></svg>';
const DET = { tee: { y: 0.14, z: 2.0 }, jorts: { y: 0.2, z: 1.9 }, hoodie: { y: 0.24, z: 1.9 } };
function paintPV(p, swap) {
  pvCur = p; const body = $('#pvBody'); const up = isUp(p);
  const fill = () => {
    $('#pvCount').textContent = `${pad(pvI + 1)} / ${pad(pvList.length)}`;
    $('#pvTag').textContent = up ? 'Drops ' + mon(p.ts) : 'Available now'; $('#pvTag').className = 'pv-tag' + (up ? ' up' : '');
    $('#pvName').textContent = p.name; $('#pvType').textContent = ({ tee: 'Tee', jorts: 'Jorts', hoodie: 'Hoodie' })[p.type] + ' · ' + p.colorways.length + ' colours'; $('#pvPrice').textContent = money(p.price);
    $('#pvBlurb').textContent = p.blurb; $('#pvColorName').textContent = cw(p).name;
    $('#pvColorRow').style.display = p.colorways.length > 1 ? '' : 'none'; $('#pvSwatches').innerHTML = swHTML(p);
    $('#pvSizes').innerHTML = p.sizes.map((s, i) => `<button type="button" class="${i === pvSizeI(p) ? 'on' : ''}">${s}</button>`).join('');
    $('#pvDetails').innerHTML = p.details.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#pvCd').classList.toggle('show', up); $('#pvSizeRow').style.display = '';
    pvSize = p.sizes[pvSizeI(p)];
    $('#pvCta').innerHTML = up ? `<button class="btn btn-volt" id="pvNotifyWa">${WA_ICON}Notify me on WhatsApp</button>`
      : `<button class="btn btn-volt" id="pvAdd">Add to bag — ${money(p.price)}</button><button class="btn btn-ghost" id="pvWa" aria-label="Order on WhatsApp">${WA_ICON}WhatsApp</button>`;
    tick();
  };
  if (swap) { body.classList.add('swap'); setTimeout(() => { fill(); body.classList.remove('swap'); }, 220); } else fill();
}
function openPV(id, push = true) {
  const p = byId(id); if (!p) return; pvOpen = true; sync();
  const el = $('#pv'); if (!pv) {
    pv = new View($('#pvCanvas'), { drag: true, speed: 0.5, maxW: 1200 });
    $$('#pvViews button').forEach((b) => b.addEventListener('click', () => {
      $$('#pvViews button').forEach((x) => x.classList.toggle('on', x === b)); const m = b.dataset.v, t = pvCur.type;
      if (m === 'spin') { pv.paused = false; pv.focus({}); } else if (m === 'front') { pv.paused = true; pv.focus({ angle: 0 }); } else if (m === 'back') { pv.paused = true; pv.focus({ angle: Math.PI }); } else { pv.paused = true; pv.focus({ angle: 0, zoom: DET[t].z, y: DET[t].y }); }
    }));
    $('#pvNext').addEventListener('click', () => stepPV(1)); $('#pvPrev').addEventListener('click', () => stepPV(-1));
    $('#pvClose').addEventListener('click', closePV);
    $('#pvSwatches').addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (!b) return; pvCur.ci = +b.dataset.ci; $$('#pvSwatches .sw').forEach((x) => x.classList.toggle('on', x === b)); $('#pvColorName').textContent = cw(pvCur).name; pv.load(specOf(pvCur, cw(pvCur))); syncCards(pvCur); });
    $('#pvSizes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; pvSize = b.textContent; $$('#pvSizes button').forEach((x) => x.classList.toggle('on', x === b)); });
    $('#pvCta').addEventListener('click', (e) => {
      if (e.target.closest('#pvAdd')) addToCart(pvCur, pvCur.ci, pvSize);
      else if (e.target.closest('#pvWa')) openWa(`Hi ${S.brand}! I'd like to order:\n\n1. ${pvCur.name} — ${cw(pvCur).name}, size ${pvSize} × 1 — ${money(pvCur.price)}\n\nName: \nDelivery area: `);
      else if (e.target.closest('#pvNotifyWa')) openWa(`Hi ${S.brand}! Please message me when the ${pvCur.name} drops (${mon(pvCur.ts)}).`);
    });
  }
  pvList = PRODUCTS.filter((q) => q.cat === p.cat); pvI = pvList.indexOf(p);
  $$('#pvViews button').forEach((x) => x.classList.toggle('on', x.dataset.v === 'spin')); pv.paused = false; pv.focus({});
  el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('pv-open'); setTimeout(() => el.classList.add('shown'), 450);
  paintPV(p, false); pv.load(specOf(p, cw(p))); pv.start();
  if (push && location.hash !== '#p=' + id) history.replaceState(null, '', '#p=' + id);
}
function stepPV(d) { pvI = (pvI + d + pvList.length) % pvList.length; const p = pvList[pvI]; pv.focus({}); pv.paused = false; $$('#pvViews button').forEach((x) => x.classList.toggle('on', x.dataset.v === 'spin')); paintPV(p, true); pv.load(specOf(p, cw(p))); history.replaceState(null, '', '#p=' + p.id); }
function syncCards(p) { $$('.card').forEach((c) => { if (c.dataset.id !== p.id) return; $$('.sw', c).forEach((x, i) => x.classList.toggle('on', i === p.ci)); const v = $('canvas', c)._v; v.loaded && v.view.load(specOf(p, cw(p))); }); }
function closePV() {
  const el = $('#pv'); if (!el || !el.classList.contains('open')) return; el.classList.remove('open', 'shown'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('pv-open');
  pv.stop(); pvOpen = false; pvCur = null; sync(); history.replaceState(null, '', location.pathname + location.search);
}
addEventListener('keydown', (e) => { if (!pvOpen) return; if (e.key === 'Escape') closePV(); else if (e.key === 'ArrowRight') stepPV(1); else if (e.key === 'ArrowLeft') stepPV(-1); });
addEventListener('hashchange', () => { const m = location.hash.match(/^#p=(.+)$/); if (m && !pvOpen) openPV(m[1], false); });

/* ───────── chrome: nav hide, active links, reveal, preloader ───────── */
function chrome() {
  const nav = $('#nav'); let lastY = 0;
  addEventListener('scroll', () => { const y = scrollY; if (!pvOpen) nav.classList.toggle('hide', y > lastY && y > 300); nav.classList.toggle('solid', y > 24); document.documentElement.style.setProperty('--sy', y.toFixed(0)); lastY = y; }, { passive: true });
  $$('[data-p]').forEach((a) => a.classList.toggle('cur', a.dataset.p === page));
  const rv = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.rv').forEach((n) => rv.observe(n));
  // soft page transitions
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || a.target === '_blank') return;
    const u = new URL(a.href, location.href); if (u.origin !== location.origin || u.pathname === location.pathname) return;
    e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 320);
  });
  addEventListener('pageshow', () => document.body.classList.remove('leaving'));
}
function boot() {
  const seen = sessionStorage.getItem('sw_seen'); const go = () => { document.body.classList.remove('is-loading'); setTimeout(() => document.body.classList.add('ready'), 60); const m = location.hash.match(/^#p=(.+)$/); if (m) openPV(m[1], false); };
  if (seen) { $('#pre').classList.add('skip'); go(); } else { sessionStorage.setItem('sw_seen', '1'); setTimeout(go, 1100); }
}
function init({ products, settings, preview }) {
  S = settings; PRODUCTS.push(...products); PRODUCTS.forEach((p, i) => { p.ts = p.date ? Date.parse(p.date) : NOW + (p.days || 0) * 864e5; p.i = i; p.ci = 0; p.no = pad(i + 1); });
  if (preview) { const b = document.createElement('div'); b.className = 'prevbar'; b.innerHTML = 'Draft preview — only visible on this device · <a href="admin.html">Back to admin</a> · <a href="?preview=0">Exit preview</a>'; document.body.prepend(b); }
  $$('[data-wa]').forEach((a) => { a.href = waUrl(`Hi ${S.brand}!`); a.target = '_blank'; a.rel = 'noopener'; });
  const soc = $('#footSocial'); if (soc) soc.innerHTML = [['Instagram', S.instagram], ['TikTok', S.tiktok]].filter((x) => /^https?:\/\//.test(x[1] || '')).map(([nm, u]) => `<a href="${u}" target="_blank" rel="noopener">${nm}</a>`).join('');
  paintBag(); bindBag(); chrome(); buildGrid(); buildHome(); buildDoors(); bindDrop(); bindJoin(); tick(); boot();
}
loadCatalogue().then(init).catch((e) => console.error(e));
