/* SWITCH admin — runs entirely in the browser (static hosting, no backend).
   Photo → model: pick/auto-detect the fabric colour, cut the print out of the photo (or upload a graphic), place it on the 3D garment.
   Drafts live in this browser (localStorage). "Publish" writes catalogue.json + uploads/*.png to the site (GitHub API) or downloads them as a zip. */
import { View, look, specOf } from './stage.js';
import { PRODUCTS as BASE, DEFAULTS, TYPE_CAT, TYPE_NAME, SETTINGS } from './data.js';
import { DRAFT_KEY, readDraft, slug } from './catalogue.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clone = (o) => JSON.parse(JSON.stringify(o));
const attr = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
look.dark = true;

/* ── toast ─────────────────────────────────────────────────────── */
let tT; const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('show'), 3200); };

/* ── store (drafts in this browser) ───────────────────────────── */
let store = readDraft(); store.settings = store.settings || {}; store.products = store.products || [];
const persist = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(store)); return true; } catch (e) { toast('Browser storage is full — publish, or remove some graphics'); return false; } };
const isBase = (id) => BASE.some((b) => b.id === id);
const saved = (id) => store.products.find((p) => p.id === id);

function items() {
  const out = BASE.map((b) => { const o = saved(b.id); return { id: b.id, base: b, custom: o && !o.hidden ? o : null, hidden: !!(o && o.hidden) }; });
  store.products.filter((c) => !isBase(c.id)).forEach((c) => out.push({ id: c.id, base: null, custom: c, hidden: !!c.hidden }));
  return out;
}
function fromBase(b) {
  const p = clone(b); p.date = new Date(Date.now() + (p.days || 0) * 864e5).toISOString(); delete p.days; ['cat', 'ts', 'i', 'ci', 'no'].forEach((k) => delete p[k]);
  p.prints = p.prints || {}; if (p.type === 'hoodie' && p.prints.chest !== undefined && p.prints.front === undefined) { p.prints.front = p.prints.chest; delete p.prints.chest; }
  return p;
}

/* ── working copy ─────────────────────────────────────────────── */
let cur = null, ci = 0, side = 'front', dirty = false, photo = null, tool = 'crop', gres = null;
const gopt = { knock: true, tol: 40, mode: 'keep', ink: '#111111' };
const cw = () => cur.colorways[ci];
const mark = () => { dirty = true; const b = $('#dirty'); if (b) b.style.display = ''; };
const toLocal = (iso) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const isUp = () => cur && Date.parse(cur.date) > Date.now();

function select(id) {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  const it = items().find((x) => x.id === id); if (!it) return;
  cur = clone(it.custom || fromBase(it.base)); ci = 0; side = 'front'; dirty = false; photo = null; gres = null; renderAll();
}
function newPiece() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  let id = 'new-piece', n = 2; while (items().some((x) => x.id === id)) id = 'new-piece-' + n++;
  cur = { id, name: 'New piece', type: 'tee', price: 50, blurb: '', date: new Date().toISOString(), sizes: DEFAULTS.tee.sizes.slice(), prints: { front: 'SWITCH', back: 'ALWAYS ON' }, colorways: [{ id: 'colour-1', name: 'Colour 1', hex: '#efece4', ink: '#111111' }], _new: true };
  ci = 0; side = 'front'; dirty = true; photo = null; gres = null; renderAll();
}
function setType(t) {
  const old = DEFAULTS[cur.type]; cur.type = t;
  if (JSON.stringify(cur.sizes) === JSON.stringify(old.sizes)) cur.sizes = DEFAULTS[t].sizes.slice();
  cur.details = undefined;
  cur.prints = t === 'jorts' ? { patch: 'SWITCH' } : { front: 'SWITCH', back: t === 'hoodie' ? 'SWITCH' : 'ALWAYS ON' };
  cur.colorways.forEach((c) => { c.prints = {}; }); if (t === 'jorts') { side = 'front'; cur.colorways.forEach((c) => { c.wash = c.wash ?? 0.35; }); }
  mark(); renderEd(); refresh();
}

/* ── 3D preview ───────────────────────────────────────────────── */
let view, rT;
function initView() { view = new View($('#adCanvas'), { drag: true, speed: 0.5, maxW: 1100, instant: true }); view.start(); }
function refresh() { clearTimeout(rT); rT = setTimeout(() => { if (cur) view.load(specOf(cur, cw())); }, 120); }
function turnTo(s) { $$('#adVb button').forEach((b) => b.classList.toggle('on', b.dataset.v === s)); if (s === 'spin') { view.paused = false; view.focus({}); } else { view.paused = true; view.focus({ angle: s === 'back' ? Math.PI : 0 }); } }

/* ── list ─────────────────────────────────────────────────────── */
function renderList() {
  const rows = items().map((it) => {
    const p = it.custom || it.base, c = p.colorways[0];
    return `<button class="li${cur && cur.id === it.id ? ' on' : ''}${it.hidden ? ' off' : ''}" data-id="${attr(it.id)}"><i style="--c:${c.hex}"></i><div><b>${attr(p.name)}</b><span>${TYPE_NAME[p.type]} · ${p.colorways.length} colour${p.colorways.length > 1 ? 's' : ''}</span></div>${it.hidden ? '<em>Hidden</em>' : it.custom ? '<em class="c">Edited</em>' : ''}</button>`;
  });
  const fresh = cur && cur._new && !saved(cur.id) ? `<button class="li on" data-id="${attr(cur.id)}"><i style="--c:${cw().hex}"></i><div><b>${attr(cur.name)}</b><span>${TYPE_NAME[cur.type]} · unsaved</span></div><em class="c">New</em></button>` : '';
  $('#adList').innerHTML = `<button class="btn btn-volt sm" id="bNew" style="justify-content:center;margin-bottom:6px">+ New piece</button><h4>Catalogue</h4>${fresh}${rows.join('')}`;
}

/* ── editor ───────────────────────────────────────────────────── */
function textVal(k) { const v = cur.prints[k]; return v === false ? '' : (v ?? ''); }
function renderEd() {
  const el = $('#adEd'); if (!cur) { el.innerHTML = '<div class="empty"><p>Pick a piece on the left to edit it, or start a new one.</p><button class="btn btn-volt sm" data-a="new">+ New piece</button></div>'; return; }
  const c = cw(), P = c.prints || {}, jorts = cur.type === 'jorts', pos = { x: 0, y: 0, s: 1, ...(P[side + 'Pos'] || {}) };
  const hidden = saved(cur.id) && saved(cur.id).hidden;
  const sideBtns = jorts ? '' : `<div class="seg" id="sideSeg"><button data-a="side" data-s="front" class="${side === 'front' ? 'on' : ''}">Front</button><button data-a="side" data-s="back" class="${side === 'back' ? 'on' : ''}">Back</button></div>`;
  const sideName = jorts ? 'front leg patch' : side;
  const gi = P[side + 'Img'];
  el.innerHTML = `
  ${hidden ? '<div class="ed-sec"><p class="warn">This piece is hidden from the shop.</p><button class="btn btn-ghost sm" data-a="restore" style="width:fit-content">Show it again</button></div>' : ''}
  <div class="ed-sec"><h3>Piece</h3>
    <div class="seg" id="typeSeg">${['tee', 'jorts', 'hoodie'].map((t) => `<button data-a="type" data-t="${t}" class="${cur.type === t ? 'on' : ''}">${t === 'hoodie' ? 'Hoodie / jacket' : TYPE_NAME[t]}</button>`).join('')}</div>
    <label class="fld"><span>Name</span><input type="text" data-f="name" value="${attr(cur.name)}" maxlength="40"></label>
    <div class="row2"><label class="fld"><span>Price</span><input type="number" data-f="price" min="0" step="1" value="${attr(cur.price)}"></label>
      <label class="fld"><span>Sizes (comma separated)</span><input type="text" data-f="sizes" value="${attr(cur.sizes.join(', '))}"></label></div>
    <label class="fld"><span>Description</span><textarea data-f="blurb" maxlength="300">${attr(cur.blurb)}</textarea></label>
    <div class="fld"><span>Release</span><div class="seg"><button data-a="rel" data-r="now" class="${isUp() ? '' : 'on'}">Available now</button><button data-a="rel" data-r="up" class="${isUp() ? 'on' : ''}">Upcoming drop</button></div></div>
    ${isUp() ? `<label class="fld"><span>Drops on</span><input type="datetime-local" data-f="date" value="${toLocal(cur.date)}"></label>` : ''}
  </div>
  <div class="ed-sec"><h3>Colours <small>each colour has its own prints</small></h3>
    <div class="cws" id="cwBox"></div>
    <div class="fld"><span>Colour name</span><input type="text" data-f="cw.name" id="cwName" value="${attr(c.name)}" maxlength="24"></div>
    <div class="fld"><span>Fabric colour</span><div class="hexrow"><input type="color" data-f="cw.hexc" id="cwHexC" value="${c.hex}"><input type="text" data-f="cw.hex" id="cwHex" value="${c.hex}" maxlength="7"><button class="btn btn-ghost sm" data-a="detect" ${photo ? '' : 'disabled style="opacity:.4"'}>Detect from photo</button></div></div>
    ${jorts ? `<div class="rng"><span>Wash</span><input type="range" min="0" max="100" data-f="cw.wash" value="${Math.round((c.wash ?? 0.35) * 100)}"><output>${Math.round((c.wash ?? 0.35) * 100)}</output></div>` : ''}
    <div class="fld"><span>Print / text colour</span><div class="hexrow"><input type="color" data-f="cw.ink" value="${c.ink || '#111111'}"><span class="ed-hint">Used for typed text prints</span></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost sm" data-a="addcw">+ Add colour</button>${cur.colorways.length > 1 ? '<button class="btn btn-ghost sm" data-a="rmcw">Remove this colour</button>' : ''}</div>
  </div>
  <div class="ed-sec"><h3>Model it from a photo <small>${attr(c.name)}</small></h3>
    <p class="ed-hint">Upload a photo of the real piece (or a graphic file). Detect the fabric colour, drag a box over the print to cut it out, then apply it to the 3D ${TYPE_NAME[cur.type].toLowerCase()}. Shapes come from the 3D model — photos supply colour and artwork.</p>
    <div class="drop" id="drop"><b>Drop a photo here</b><span>or</span>
      <div class="tools" style="justify-content:center"><label class="btn btn-ghost" style="cursor:pointer">Choose photo<input type="file" id="fPhoto" accept="image/*" hidden></label><label class="btn btn-ghost" style="cursor:pointer">Upload graphic file<input type="file" id="fGraphic" accept="image/*" hidden></label></div></div>
    <div id="photoBox"></div>
  </div>
  <div class="ed-sec"><h3>Prints <small>${jorts ? 'jorts' : ''}</small></h3>
    ${sideBtns}
    <div class="fld"><span>${jorts ? 'Patch text' : 'Typed text on the ' + side}</span>
      ${jorts ? `<input type="text" data-f="text.patch" value="${attr(cur.prints.patch ?? '')}" maxlength="16" placeholder="e.g. SWITCH — leave empty for none">`
        : `<input type="text" data-f="text.${side}" value="${attr(textVal(side))}" maxlength="24" placeholder="Leave empty for no text"${cur.prints[side] === false ? ' disabled' : ''}>
           <label class="chk"><input type="checkbox" data-f="notext.${side}" ${cur.prints[side] === false ? 'checked' : ''}> No text on the ${side}</label>`}</div>
    ${gi ? `<div class="cur"><img src="${gi}" alt=""><span>Graphic on ${sideName}</span><button data-a="rmimg">Remove</button></div>` : '<p class="ed-hint">No graphic yet on this side — the typed text is used.</p>'}
    <div class="lbl2">Placement — ${sideName}</div>
    <div class="rng"><span>Left / right</span><input type="range" min="-100" max="100" data-f="pos.x" value="${Math.round(pos.x * 100)}"><output>${Math.round(pos.x * 100)}</output></div>
    <div class="rng"><span>Up / down</span><input type="range" min="-100" max="100" data-f="pos.y" value="${Math.round(pos.y * 100)}"><output>${Math.round(pos.y * 100)}</output></div>
    <div class="rng"><span>Size</span><input type="range" min="30" max="260" data-f="pos.s" value="${Math.round(pos.s * 100)}"><output>${Math.round(pos.s * 100)}</output></div>
  </div>
  <div class="savebar"><span id="dirty" class="ed-hint" style="display:${dirty ? '' : 'none'};align-self:center;flex:none">● Unsaved</span>
    <button class="btn btn-volt" data-a="save">Save piece</button>
    ${isBase(cur.id) ? (saved(cur.id) && !hidden ? '<button class="btn btn-ghost" data-a="revert">Revert</button>' : '') + (hidden ? '' : '<button class="btn btn-danger" data-a="del">Hide</button>') : '<button class="btn btn-danger" data-a="del">Delete</button>'}
  </div>`;
  renderCws(); renderPhotoBox();
}
function renderCws() {
  const b = $('#cwBox'); if (!b) return;
  b.innerHTML = cur.colorways.map((c, i) => `<button class="cwb${i === ci ? ' on' : ''}" data-a="cw" data-i="${i}"><i style="--c:${c.hex}"></i>${attr(c.name)}</button>`).join('');
}
function renderAll() { renderList(); renderEd(); if (cur) { view.load(specOf(cur, cw())); turnTo('spin'); } }

/* ── colour + graphic maths ───────────────────────────────────── */
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lumOf = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };
const inkFor = (hex) => (lumOf(hex) > 0.55 ? '#111111' : '#ecebe4');
function autoColour(src, rect) {
  const r = rect || { x: src.width * 0.3, y: src.height * 0.3, w: src.width * 0.4, h: src.height * 0.4 };
  const W = Math.max(1, Math.round(r.w)), H = Math.max(1, Math.round(r.h)), d = src.getContext('2d').getImageData(Math.round(r.x), Math.round(r.y), W, H).data, B = new Map();
  for (let i = 0; i < d.length; i += 16) { const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4), e = B.get(k) || [0, 0, 0, 0]; e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2]; B.set(k, e); }
  let best = null; B.forEach((e) => { if (!best || e[0] > best[0]) best = e; }); return toHex(best[1] / best[0], best[2] / best[0], best[3] / best[0]);
}
function sampleAt(src, x, y) { const s = 3, d = src.getContext('2d').getImageData(Math.max(0, Math.round(x) - s), Math.max(0, Math.round(y) - s), s * 2 + 1, s * 2 + 1).data; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } return toHex(r / n, g / n, b / n); }
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
/* crop → (optionally) knock out the fabric colour → trim → PNG */
function makeGraphic(src, rect, o) {
  const r = rect || { x: 0, y: 0, w: src.width, h: src.height }, k = Math.min(1, 720 / r.w);
  const W = Math.max(8, Math.round(r.w * k)), H = Math.max(8, Math.round(r.h * k)), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, W, H);
  const im = x.getImageData(0, 0, W, H), p = im.data, ink = parseInt(o.ink.slice(1), 16);
  if (o.knock) {
    const R = [], G = [], B = [], t = 3;                                          // fabric colour = median of the crop's border
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) if (i < t || j < t || i >= W - t || j >= H - t) { const q = (j * W + i) * 4; R.push(p[q]); G.push(p[q + 1]); B.push(p[q + 2]); }
    const fr = med(R), fg = med(G), fb = med(B), t1 = (o.tol / 100) * 230 + 1, t0 = t1 * 0.45;
    for (let q = 0; q < p.length; q += 4) { const d = Math.hypot(p[q] - fr, p[q + 1] - fg, p[q + 2] - fb), a = Math.min(1, Math.max(0, (d - t0) / (t1 - t0))); p[q + 3] = Math.round(255 * a * a * (3 - 2 * a)); }
  }
  if (o.mode === 'mono') for (let q = 0; q < p.length; q += 4) { p[q] = ink >> 16; p[q + 1] = (ink >> 8) & 255; p[q + 2] = ink & 255; }
  x.putImageData(im, 0, 0);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (p[(j * W + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 <= x0 || y1 <= y0) return null;
  const pad = 2; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return { canvas: out, url: out.toDataURL('image/png'), asp: out.height / out.width };
}

/* ── photo box ────────────────────────────────────────────────── */
function loadFile(file) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { const k = Math.min(1, 1600 / Math.max(i.naturalWidth, i.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(i.naturalWidth * k); c.height = Math.round(i.naturalHeight * k); c.getContext('2d', { willReadFrequently: true }).drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c); }; i.onerror = () => rej(new Error('Could not read that image')); i.src = u; });
}
async function takeFile(file, asPhoto) {
  if (!file || !file.type.startsWith('image/')) return toast('Please choose an image file');
  try { photo = { src: await loadFile(file), rect: null }; } catch (e) { return toast(e.message); }
  tool = 'crop'; gres = null; renderPhotoBox();
  if (asPhoto) { const hex = autoColour(photo.src); setHex(hex); toast('Fabric colour detected: ' + hex + ' — drag a box over the print to cut it out'); const b = $('[data-a=detect]'); if (b) { b.disabled = false; b.style.opacity = ''; } }
  else toast('Graphic loaded — adjust, then press “Apply to ' + (cur.type === 'jorts' ? 'patch' : side) + '”');
  previewGraphic();
}
function setHex(hex) { const c = cw(); c.hex = hex; c.ink = inkFor(hex); const a = $('#cwHex'), b = $('#cwHexC'); if (a) a.value = hex; if (b) b.value = hex; const ik = $('[data-f="cw.ink"]'); if (ik) ik.value = c.ink; renderCws(); renderList(); mark(); refresh(); }
function renderPhotoBox() {
  const box = $('#photoBox'); if (!box) return; if (!photo) { box.innerHTML = ''; return; }
  box.innerHTML = `<div class="photo"><canvas id="photoCv"></canvas></div>
  <div class="tools"><button class="btn btn-ghost ${tool === 'crop' ? 'on' : ''}" data-a="tool" data-t="crop">Select print area</button><button class="btn btn-ghost ${tool === 'pick' ? 'on' : ''}" data-a="tool" data-t="pick">Pick fabric colour</button><button class="btn btn-ghost" data-a="clrect">Use whole image</button><button class="btn btn-ghost" data-a="rmphoto">Clear photo</button></div>
  <div class="ed-hint">${tool === 'pick' ? 'Tap the fabric to use its colour.' : 'Drag a box around the print. Leave it empty to use the whole image.'}</div>
  <label class="chk"><input type="checkbox" data-f="g.knock" ${gopt.knock ? 'checked' : ''}> Remove the fabric colour around the print</label>
  <div class="rng"><span>Strength</span><input type="range" min="5" max="90" data-f="g.tol" value="${gopt.tol}"><output>${gopt.tol}</output></div>
  <div class="seg"><button data-a="gmode" data-m="keep" class="${gopt.mode === 'keep' ? 'on' : ''}">Keep colours</button><button data-a="gmode" data-m="mono" class="${gopt.mode === 'mono' ? 'on' : ''}">One colour</button></div>
  ${gopt.mode === 'mono' ? `<div class="hexrow"><input type="color" data-f="g.ink" value="${gopt.ink}"><span class="ed-hint">Print colour — good for logos and text</span></div>` : ''}
  <div class="gprev" id="gprev"></div>
  <button class="btn btn-volt" data-a="apply" style="justify-content:center">Apply to ${cur.type === 'jorts' ? 'the patch' : 'the ' + side}</button>`;
  const cv = $('#photoCv'); cv.width = Math.min(photo.src.width, 900); cv.height = Math.round(cv.width * photo.src.height / photo.src.width);
  let st = null; const pt = (e) => { const b = cv.getBoundingClientRect(); return { x: Math.max(0, Math.min(photo.src.width, (e.clientX - b.left) / b.width * photo.src.width)), y: Math.max(0, Math.min(photo.src.height, (e.clientY - b.top) / b.height * photo.src.height)) }; };
  cv.addEventListener('pointerdown', (e) => { const q = pt(e); if (tool === 'pick') { setHex(sampleAt(photo.src, q.x, q.y)); return; } cv.setPointerCapture(e.pointerId); st = q; photo.rect = null; drawPhoto(); });
  cv.addEventListener('pointermove', (e) => { if (!st) return; const q = pt(e); photo.rect = { x: Math.min(st.x, q.x), y: Math.min(st.y, q.y), w: Math.abs(q.x - st.x), h: Math.abs(q.y - st.y) }; drawPhoto(); });
  const up = () => { if (!st) return; st = null; if (photo.rect && (photo.rect.w < 12 || photo.rect.h < 12)) photo.rect = null; drawPhoto(); previewGraphic(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  drawPhoto(); previewGraphic();
}
function drawPhoto() {
  const cv = $('#photoCv'); if (!cv || !photo) return; const x = cv.getContext('2d'), k = cv.width / photo.src.width; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(photo.src, 0, 0, cv.width, cv.height);
  const r = photo.rect; if (!r) return; x.save(); x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.rect(0, 0, cv.width, cv.height); x.rect(r.x * k, r.y * k, r.w * k, r.h * k); x.fill('evenodd'); x.strokeStyle = '#c8ff2e'; x.lineWidth = 2; x.setLineDash([8, 5]); x.strokeRect(r.x * k, r.y * k, r.w * k, r.h * k); x.restore();
}
let gT; function previewGraphic() {
  clearTimeout(gT); gT = setTimeout(() => {
    const g = $('#gprev'); if (!g || !photo) return; gres = makeGraphic(photo.src, photo.rect, gopt); g.innerHTML = '';
    if (!gres) { g.innerHTML = '<span class="ed-hint">Nothing left after removing the fabric colour — lower the strength.</span>'; return; }
    g.appendChild(gres.canvas);
  }, 80);
}

/* ── editor events ────────────────────────────────────────────── */
const ensureP = () => { const c = cw(); c.prints = c.prints || {}; return c.prints; };
const out = (el) => { const o = el.parentElement && el.parentElement.querySelector('output'); if (o) o.textContent = el.value; };
function onInput(e) {
  const t = e.target, f = t.dataset.f; if (!f || !cur) return; const v = t.type === 'checkbox' ? t.checked : t.value;
  if (['name', 'blurb'].includes(f)) { cur[f] = v; if (f === 'name' && cur._new && !saved(cur.id)) { let id = slug(v) || 'new-piece', n = 2; const base = id; while (items().some((x) => x.id === id)) id = base + '-' + n++; cur.id = id; } }
  else if (f === 'price') cur.price = +v;
  else if (f === 'sizes') cur.sizes = v.split(',').map((s) => s.trim()).filter(Boolean);
  else if (f === 'date') { const d = new Date(v); if (!isNaN(d)) cur.date = d.toISOString(); }
  else if (f === 'cw.name') { cw().name = v; renderCws(); }
  else if (f === 'cw.hex') { if (/^#[0-9a-f]{6}$/i.test(v)) { cw().hex = v.toLowerCase(); const b = $('#cwHexC'); if (b) b.value = cw().hex; renderCws(); } else return; }
  else if (f === 'cw.hexc') { cw().hex = v; const b = $('#cwHex'); if (b) b.value = v; renderCws(); }
  else if (f === 'cw.ink') cw().ink = v;
  else if (f === 'cw.wash') { cw().wash = +v / 100; out(t); }
  else if (f.startsWith('text.')) { const k = f.slice(5); cur.prints[k] = v; if (k === 'patch' && !v) delete cur.prints.patch; }
  else if (f.startsWith('notext.')) { const k = f.slice(7); if (v) cur.prints[k] = false; else cur.prints[k] = ''; const i = $(`[data-f="text.${k}"]`); if (i) { i.disabled = v; i.value = ''; } }
  else if (f.startsWith('pos.')) { const P = ensureP(), k = f.slice(4), key = side + 'Pos', o = { x: 0, y: 0, s: 1, ...(P[key] || {}) }; o[k] = k === 's' ? +v / 100 : +v / 100; P[key] = o; out(t); }
  else if (f === 'g.knock') { gopt.knock = v; previewGraphic(); return; }
  else if (f === 'g.tol') { gopt.tol = +v; out(t); previewGraphic(); return; }
  else if (f === 'g.ink') { gopt.ink = v; previewGraphic(); return; }
  mark(); if (f === 'name' || f.startsWith('cw.')) renderList(); refresh();
}
function onClick(e) {
  const b = e.target.closest('[data-a]'); if (!b || !cur && b.dataset.a !== 'new') return; const a = b.dataset.a;
  if (a === 'new') newPiece();
  else if (a === 'type') setType(b.dataset.t);
  else if (a === 'rel') { cur.date = b.dataset.r === 'now' ? new Date(Date.now() - 6e4).toISOString() : new Date(Date.now() + 7 * 864e5).toISOString(); mark(); renderEd(); }
  else if (a === 'cw') { ci = +b.dataset.i; renderEd(); refresh(); }
  else if (a === 'addcw') { const n = cur.colorways.length + 1; cur.colorways.push({ id: 'colour-' + n + '-' + Date.now().toString(36), name: 'Colour ' + n, hex: '#8a8f98', ink: '#111111', wash: cur.type === 'jorts' ? 0.35 : undefined }); ci = cur.colorways.length - 1; mark(); renderEd(); refresh(); }
  else if (a === 'rmcw') { cur.colorways.splice(ci, 1); ci = 0; mark(); renderEd(); refresh(); }
  else if (a === 'side') { side = b.dataset.s; renderEd(); turnTo(side); }
  else if (a === 'tool') { tool = b.dataset.t; renderPhotoBox(); }
  else if (a === 'clrect') { photo.rect = null; drawPhoto(); previewGraphic(); }
  else if (a === 'rmphoto') { photo = null; gres = null; renderEd(); }
  else if (a === 'detect') { if (photo) setHex(autoColour(photo.src, photo.rect)); }
  else if (a === 'gmode') { gopt.mode = b.dataset.m; renderPhotoBox(); }
  else if (a === 'apply') {
    if (!gres) return toast('Nothing to apply yet'); const P = ensureP(); P[side + 'Img'] = gres.url; P[side + 'Pos'] = P[side + 'Pos'] || { x: 0, y: 0, s: 1 }; mark(); renderEd(); refresh(); turnTo(side); toast('Applied — adjust the placement below');
  }
  else if (a === 'rmimg') { const P = ensureP(); delete P[side + 'Img']; mark(); renderEd(); refresh(); }
  else if (a === 'save') save();
  else if (a === 'del') del();
  else if (a === 'revert') { if (confirm('Throw away your edits and go back to the original piece?')) { store.products = store.products.filter((p) => p.id !== cur.id); persist(); dirty = false; select(cur.id); } }
  else if (a === 'restore') { store.products = store.products.filter((p) => p.id !== cur.id); persist(); dirty = false; select(cur.id); }
}
function validate() {
  if (!cur.name.trim()) { toast('Give the piece a name'); return false; }
  if (!(cur.price >= 0)) { toast('Enter a price'); return false; }
  if (!cur.colorways.length) { toast('Add at least one colour'); return false; }
  return true;
}
function save(quiet) {
  if (!cur || !validate()) return false;
  const p = clone(cur); delete p._new; p.price = +p.price; p.name = p.name.trim();
  cur.colorways.forEach((c, i) => { if (!c.id) c.id = 'c' + i; });
  if (p.details === undefined) delete p.details;
  const i = store.products.findIndex((x) => x.id === p.id); if (i >= 0) store.products[i] = p; else store.products.push(p);
  if (!persist()) return false; dirty = false; const d = $('#dirty'); if (d) d.style.display = 'none'; renderList(); if (!quiet) toast('Saved to drafts — use Preview shop to see it, Publish to put it live'); return true;
}
function del() {
  if (isBase(cur.id)) { if (!confirm('Hide this piece from the shop?')) return; const i = store.products.findIndex((x) => x.id === cur.id); const h = { id: cur.id, hidden: true }; if (i >= 0) store.products[i] = h; else store.products.push(h); }
  else { if (!confirm('Delete this piece?')) return; store.products = store.products.filter((x) => x.id !== cur.id); }
  persist(); dirty = false; cur = null; renderList(); renderEd(); toast('Done');
}

/* ── packaging: catalogue.json + uploads/*.png ────────────────── */
const dataBytes = (u) => { const b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
function pack() {
  const files = [], cat = { settings: { ...SETTINGS, ...store.settings }, products: [] }; delete cat.settings.brand;
  store.products.forEach((p0) => {
    const p = clone(p0);
    (p.colorways || []).forEach((c) => { ['frontImg', 'backImg'].forEach((k) => { const u = c.prints && c.prints[k]; if (u && u.startsWith('data:')) { const path = `uploads/${slug(p.id)}-${slug(c.id)}-${k.slice(0, -3)}.png`; files.push({ path, bytes: dataBytes(u) }); c.prints[k] = path; } }); });
    cat.products.push(p);
  });
  files.unshift({ path: 'catalogue.json', bytes: new TextEncoder().encode(JSON.stringify(cat, null, 1)) });
  return files;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u) => { let c = -1; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0; const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  files.forEach((f) => {
    const n = enc.encode(f.path), crc = crc32(f.bytes), sz = f.bytes.length;
    const lh = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(n.length), ...u16(0), ...n]);
    parts.push(lh, f.bytes);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(n.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off), ...n]));
    off += lh.length + sz;
  });
  const cs = cen.reduce((a, c) => a + c.length, 0);
  return new Blob([...parts, ...cen, new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), 0, 0])], { type: 'application/zip' });
}
const b64 = (u) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function ghPut(gh, path, bytes, log) {
  const url = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${(gh.dir ? gh.dir.replace(/^\/|\/$/g, '') + '/' : '') + path}`, H = { Authorization: 'Bearer ' + gh.token, Accept: 'application/vnd.github+json' };
  let sha; const r = await fetch(url + '?ref=' + encodeURIComponent(gh.branch), { headers: H }); if (r.ok) sha = (await r.json()).sha; else if (r.status === 401 || r.status === 403) throw new Error('GitHub refused the token (check it has Contents: write for this repo)');
  const put = await fetch(url, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'SWITCH admin: update ' + path, content: b64(bytes), branch: gh.branch, sha }) });
  if (!put.ok) throw new Error(((await put.json().catch(() => ({}))).message) || 'GitHub error ' + put.status); log('✓ ' + path);
}

/* ── dialogs ──────────────────────────────────────────────────── */
const dlg = (html) => { $('#dlgBox').innerHTML = html; $('#dlg').classList.add('open'); $('#dlg').setAttribute('aria-hidden', 'false'); };
const closeDlg = () => { $('#dlg').classList.remove('open'); $('#dlg').setAttribute('aria-hidden', 'true'); };
function settingsDlg() {
  const s = { ...SETTINGS, ...store.settings };
  dlg(`<h3>Store settings</h3>
  <label class="fld"><span>WhatsApp number for orders</span><input type="text" id="sWa" inputmode="numeric" value="${attr(s.whatsapp)}" placeholder="2348012345678"></label>
  <p class="ed-hint">International format, digits only, no + or spaces. Nigerian 0801 234 5678 becomes 2348012345678. Every order and “notify me” message opens a chat with this number.</p>
  <label class="fld"><span>Currency symbol</span><input type="text" id="sCur" value="${attr(s.currency)}" maxlength="3"></label>
  <label class="fld"><span>Instagram link (optional)</span><input type="text" id="sIg" value="${attr(s.instagram || '')}" placeholder="https://instagram.com/yourbrand"></label>
  <label class="fld"><span>TikTok link (optional)</span><input type="text" id="sTt" value="${attr(s.tiktok || '')}" placeholder="https://tiktok.com/@yourbrand"></label>
  <p class="ed-hint">Links appear in the website footer. Leave blank to hide them.</p>
  <div class="dlg-x"><button class="btn btn-ghost sm" data-d="close">Cancel</button><button class="btn btn-volt sm" data-d="set">Save settings</button></div>`);
}
function publishDlg() {
  const files = pack(), imgs = files.length - 1, gh = (() => { try { return JSON.parse(localStorage.getItem('sw_admin_gh')) || {}; } catch (e) { return {}; } })();
  dlg(`<h3>Publish</h3>
  <p class="ed-hint">${store.products.length} piece${store.products.length === 1 ? '' : 's'} in your drafts, ${imgs} uploaded graphic${imgs === 1 ? '' : 's'}. Publishing writes <b>catalogue.json</b> and the <b>uploads/</b> images into the site. Built-in pieces are untouched unless you edited or hid them.</p>
  <button class="btn btn-ghost" data-d="zip" style="justify-content:center">Download package (.zip)</button>
  <p class="ed-hint">Unzip into the site folder (next to index.html) and upload/commit it — works on any static host.</p>
  <div class="hr"></div>
  <p class="lbl2">Or publish straight to GitHub Pages</p>
  <div class="row2"><label class="fld"><span>GitHub user / org</span><input type="text" id="gOwner" value="${attr(gh.owner || '')}" placeholder="yourname"></label><label class="fld"><span>Repository</span><input type="text" id="gRepo" value="${attr(gh.repo || '')}" placeholder="switch-site"></label></div>
  <div class="row2"><label class="fld"><span>Branch</span><input type="text" id="gBranch" value="${attr(gh.branch || 'main')}"></label><label class="fld"><span>Site folder in repo (blank = root)</span><input type="text" id="gDir" value="${attr(gh.dir || '')}" placeholder="docs"></label></div>
  <label class="fld"><span>Access token</span><input type="password" id="gTok" value="${attr(gh.token || '')}" placeholder="github_pat_…" autocomplete="off"></label>
  <p class="warn">Use a fine-grained token limited to this one repository with “Contents: Read and write”. It is kept only in this browser. GitHub Pages redeploys about a minute after publishing.</p>
  <div class="lg" id="gLog" style="display:none"></div>
  <div class="dlg-x"><button class="btn btn-ghost sm" data-d="close">Close</button><button class="btn btn-volt sm" data-d="gh">Publish to GitHub</button></div>`);
}
async function onDlg(e) {
  const b = e.target.closest('[data-d]'); if (e.target.classList.contains('dlg-shade')) return closeDlg(); if (!b) return; const d = b.dataset.d;
  if (d === 'close') closeDlg();
  else if (d === 'set') { const w = $('#sWa').value.replace(/\D/g, ''); if (w.length < 8) return toast('Enter the full WhatsApp number'); store.settings = { whatsapp: w, currency: $('#sCur').value.trim() || '$', instagram: $('#sIg').value.trim(), tiktok: $('#sTt').value.trim() }; persist(); closeDlg(); toast('Settings saved — publish to make them live'); }
  else if (d === 'zip') { const a = document.createElement('a'); a.href = URL.createObjectURL(zip(pack())); a.download = 'switch-catalogue.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  else if (d === 'gh') {
    const gh = { owner: $('#gOwner').value.trim(), repo: $('#gRepo').value.trim(), branch: $('#gBranch').value.trim() || 'main', dir: $('#gDir').value.trim(), token: $('#gTok').value.trim() };
    if (!gh.owner || !gh.repo || !gh.token) return toast('Fill in the user, repository and token'); try { localStorage.setItem('sw_admin_gh', JSON.stringify(gh)); } catch (x) {}
    const lg = $('#gLog'); lg.style.display = ''; const log = (m) => { lg.textContent += m + '\n'; lg.scrollTop = 1e6; }; b.disabled = true; log('Publishing…');
    try { for (const f of pack()) await ghPut(gh, f.path, f.bytes, log); log('\nDone. The live site updates in about a minute.'); toast('Published'); } catch (err) { log('✗ ' + err.message); toast('Publish failed'); }
    b.disabled = false;
  }
}

/* ── boot ─────────────────────────────────────────────────────── */
function boot() {
  initView(); renderList(); renderEd();
  $('#adList').addEventListener('click', (e) => { if (e.target.closest('#bNew')) return newPiece(); const b = e.target.closest('.li'); if (b && !(cur && b.dataset.id === cur.id)) select(b.dataset.id); });
  const ed = $('#adEd'); ed.addEventListener('input', onInput); ed.addEventListener('change', (e) => { if (e.target.type === 'checkbox' || e.target.type === 'color') onInput(e); }); ed.addEventListener('click', onClick);
  ed.addEventListener('change', (e) => { if (e.target.id === 'fPhoto') takeFile(e.target.files[0], true); else if (e.target.id === 'fGraphic') takeFile(e.target.files[0], false); });
  ed.addEventListener('dragover', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  ed.addEventListener('dragleave', (e) => { const d = e.target.closest('#drop'); if (d) d.classList.remove('over'); });
  ed.addEventListener('drop', (e) => { const d = e.target.closest('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); takeFile(e.dataTransfer.files[0], true); } });
  $('#adVb').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) turnTo(b.dataset.v); });
  $('#bSet').addEventListener('click', settingsDlg); $('#bPub').addEventListener('click', () => { if (dirty && cur && !save(true)) return; publishDlg(); });
  $('#bPrev').addEventListener('click', () => { if (dirty && cur && !save(true)) return; window.open('tees.html?preview=1', '_blank'); });
  $('#dlg').addEventListener('click', onDlg);
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  if (items().length) select(items()[0].id);
}
boot();
