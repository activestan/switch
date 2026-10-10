/* Catalogue = built-in pieces (data.js) + whatever the admin published in catalogue.json (or, in preview mode, the draft in this browser).
   catalogue.json: { settings: { whatsapp, currency }, products: [ { id, name, type, price, blurb, date (ISO), sizes?, details?, prints?, colorways:[{id,name,hex,ink,prints?}], hidden? } ] } */
import { PRODUCTS as BASE, SETTINGS, DEFAULTS, TYPE_CAT } from './data.js';

export const DRAFT_KEY = 'sw_admin_cat';
export const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)) || { settings: {}, products: [] }; } catch (e) { return { settings: {}, products: [] }; } };
export const slug = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
export function hydrate(c) {
  const d = DEFAULTS[c.type] || DEFAULTS.tee;
  return { ...c, name: esc(c.name), blurb: esc(c.blurb), cat: TYPE_CAT[c.type] || 'tees', sizes: c.sizes && c.sizes.length ? c.sizes : d.sizes, details: c.details || d.details, prints: c.prints || {},
    colorways: (c.colorways || []).map((w, i) => ({ id: w.id || 'c' + i, ink: '#111111', ...w, name: esc(w.name) })) };
}
export function merge(base, cat) {
  const list = base.map((p) => JSON.parse(JSON.stringify(p))); const hidden = new Set();
  (cat.products || []).forEach((c) => {
    if (c.hidden) { hidden.add(c.id); return; }
    const h = hydrate(c); const i = list.findIndex((p) => p.id === c.id); if (i >= 0) list[i] = h; else list.push(h);
  });
  return list.filter((p) => !hidden.has(p.id) && p.colorways.length);
}
export const previewOn = () => {
  const q = new URLSearchParams(location.search).get('preview');
  try { if (q === '1') sessionStorage.setItem('sw_preview', '1'); if (q === '0') sessionStorage.removeItem('sw_preview'); return sessionStorage.getItem('sw_preview') === '1'; } catch (e) { return q === '1'; }
};
export async function loadCatalogue() {
  const preview = previewOn(); let cat = { settings: {}, products: [] };
  if (preview) cat = readDraft();
  else { try { const r = await fetch('catalogue.json', { cache: 'no-cache' }); if (r.ok) cat = await r.json(); } catch (e) {} }
  return { products: merge(BASE, cat), settings: { ...SETTINGS, ...(cat.settings || {}) }, preview };
}
