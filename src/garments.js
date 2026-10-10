/* Garment factory — floating "ghost" garments in true 3D, all from real garment meshes.
   tee    : models/tee.glb        (T-shirt mesh)            + decal prints
   jorts  : models/shortpant.glb  (tailored shorts mesh)    + denim re-colour of its real fabric texture
   hoodie : models/hoodie.glb     (hooded sweatshirt mesh)  + decal prints
   Everything is data-driven: colour, wash, prints — an admin upload only has to supply those values. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

const FONT = '"Archivo Variable", Archivo, Inter, Helvetica, Arial, sans-serif';
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function tex(c, { srgb = true, repeat, flipY = true } = {}) {
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.flipY = flipY;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

/* ── decals (prints) ─────────────────────────────────────────────── */
function decal(mesh, pos, rot, size, map, o = {}) {
  mesh.updateWorldMatrix(true, false);
  const g = new DecalGeometry(mesh, new THREE.Vector3(...pos), new THREE.Euler(...rot), new THREE.Vector3(...size));
  if (!g.attributes.position || !g.attributes.position.count) return null;
  const m = new THREE.MeshStandardMaterial({ map, transparent: true, roughness: o.rough ?? 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false, side: THREE.DoubleSide });
  const d = new THREE.Mesh(g, m); d.userData.isDecal = true; return d;
}
export function textTex(text, ink, { w = 1024, h = 512, size = 190, weight = 800, spacing = 4, wdth = 100, lines } = {}) {
  const c = cvs(w, h), x = c.getContext('2d'); x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${weight} ${size}px ${FONT}`; x.letterSpacing = `${spacing}px`;
  const L = lines || [text]; const lh = size * 1.02;
  const fit = Math.min(1, (w * 0.9) / (Math.max(...L.map((t) => x.measureText(t).width)) * wdth / 100 || 1));
  L.forEach((t, i) => { x.save(); x.translate(w / 2, h / 2 + (i - (L.length - 1) / 2) * lh); x.scale(fit * wdth / 100, fit); x.fillText(t, 0, 0); x.restore(); });
  return tex(c);
}


/* ── uploaded graphics (admin): a PNG url/dataURL becomes a decal texture ─ */
const imgCache = {};
const loadImg = (url) => imgCache[url] || (imgCache[url] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => { delete imgCache[url]; rej(new Error('image failed: ' + url.slice(0, 60))); }; i.src = url; }));
async function imgPrint(url) {
  const im = await loadImg(url), k = Math.min(1, 1024 / Math.max(im.naturalWidth, im.naturalHeight));
  const c = cvs(Math.max(2, Math.round(im.naturalWidth * k)), Math.max(2, Math.round(im.naturalHeight * k))); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return { map: tex(c), asp: c.height / c.width };
}
/* one print on one side. S = { k:'front'|'back', c:[x,y,z] centre, rot, K (slider range, m), dir (+1 front, -1 back), depth, imgW, text?, ink, tex, size } */
async function addPrint(g, meshes, S, P) {
  const pos = { x: 0, y: 0, s: 1, ...(P[S.k + 'Pos'] || {}) }; let map, size; const url = P[S.k + 'Img'];
  if (url) { try { const im = await imgPrint(url); map = im.map; const w = S.imgW * pos.s; size = [w, w * im.asp, S.depth]; } catch (e) { console.warn(e); } }
  if (!map) { if (!S.text) return; map = textTex(S.text, S.ink, S.tex); size = [S.size[0] * pos.s, S.size[1] * pos.s, S.depth]; }
  const c = [S.c[0] + pos.x * S.K * S.dir, S.c[1] + pos.y * S.K, S.c[2]];
  meshes.forEach((m) => { const d = decal(m, c, [0, S.rot, 0], size, map); d && g.add(d); });
}

/* ── model loading (each GLB is fetched once; every View clones it) ─ */
const MODELS = {};
function loadModel(url) {
  return MODELS[url] || (MODELS[url] = new Promise((res, rej) => new GLTFLoader().load(url, (g) => {
    const root = g.scene; root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    root.traverse((o) => { if (o.isMesh) { o.geometry.userData.shared = true; Object.values(o.material).forEach((v) => { if (v && v.isTexture) v.userData.shared = true; }); } });
    res({ root, src: (() => { let b = null; root.traverse((o) => { if (o.isMesh && (!b || o.geometry.attributes.position.count > b.geometry.attributes.position.count)) b = o; }); return b; })(), box, size: box.getSize(new THREE.Vector3()), centre: box.getCenter(new THREE.Vector3()) });
  }, undefined, rej)));
}
/* clone a loaded model, centre it on the origin (optionally stretched x/z for fit) and give every mesh its own material */
function instance(model, sx = 1, sz = 1) {
  const root = model.root.clone(true);
  root.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
  root.scale.set(sx, 1, sz); root.position.set(-model.centre.x * sx, -model.centre.y, -model.centre.z * sz);
  const hs = model.size.clone().multiply(new THREE.Vector3(sx, 1, sz)).multiplyScalar(0.5);
  return { root, meshes: (() => { const a = []; root.traverse((o) => o.isMesh && a.push(o)); return a; })(), min: hs.clone().negate(), max: hs, size: hs.clone().multiplyScalar(2) };
}

/* ── jorts: re-colour the real twill texture into denim ──────────── */
const denimCache = {};
function denimMap(img, hex, wash = 0.35) {
  const key = hex + '|' + wash; if (denimCache[key]) return denimCache[key];
  const W = 1024, H = 1024, c = cvs(W, H), x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H), p = d.data, base = new THREE.Color(hex).convertSRGBToLinear();
  let mean = 0; for (let i = 0; i < p.length; i += 4) mean += (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11); mean /= p.length / 4;
  const lin = (v) => Math.pow(v / 255, 2.2), toS = (v) => Math.round(255 * Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2));
  let km = 0; for (let i = 0; i < p.length; i += 4) km += Math.pow((p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / mean, 1.5); km /= p.length / 4;
  for (let i = 0; i < p.length; i += 4) {                                         // keep the stitching/seams/fabric detail as luminance, swap the hue
    const l = Math.pow((p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / mean, 1.5) / km * 0.82;
    p[i] = toS(base.r * l); p[i + 1] = toS(base.g * l); p[i + 2] = toS(base.b * l);
  }
  x.putImageData(d, 0, 0);
  for (let i = 0; i < 90; i++) {                                                  // mottled wash
    const px = rnd() * W, py = rnd() * H, r = 30 + rnd() * 140, g = x.createRadialGradient(px, py, 0, px, py, r), l = rnd() > 0.45;
    g.addColorStop(0, l ? `rgba(255,255,255,${wash * 0.2})` : `rgba(0,0,0,${wash * 0.22})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  const t = tex(c, { flipY: false }); t.userData.shared = true; return (denimCache[key] = t);
}

/* ── public: build a garment group centred on the origin ─────────── */
export async function buildGarment(spec) {
  if (document.fonts) { try { await document.fonts.load(`800 100px ${FONT}`); await document.fonts.load(`700 100px ${FONT}`); } catch (e) {} }
  const g = new THREE.Group(); const ink = spec.ink || '#111'; const P = spec.prints || {};
  const tx = (v, d) => (v === false || v === '' ? null : (v ?? d));         // false / empty string = no text; undefined = default

  if (spec.type === 'tee') {
    const src = (await loadModel('models/tee.glb')).root.getObjectByProperty('isMesh', true); const tee = new THREE.Mesh(src.geometry, src.material.clone()); g.add(tee);
    const m = tee.material; m.color.set(spec.color); m.roughness = 0.9; m.side = THREE.DoubleSide; m.aoMapIntensity = 0.45; if (m.normalMap) m.normalScale.set(1.1, 1.1);
    g.updateMatrixWorld(true); tee.updateMatrixWorld(true);
    const tf = P.front ?? P.chest;
    await addPrint(g, [tee], { k: 'front', c: [0, 0.035, 0.16], rot: 0, K: 0.18, dir: 1, depth: 0.3, imgW: 0.2, ink, text: tx(tf, 'SWITCH'), tex: { size: 180, spacing: 6, wdth: 92 }, size: [0.2, 0.1] }, P);
    await addPrint(g, [tee], { k: 'back', c: [0, 0.15, -0.16], rot: Math.PI, K: 0.18, dir: -1, depth: 0.3, imgW: 0.22, ink, text: tx(P.back, 'ALWAYS ON'), tex: { w: 1024, h: 256, size: 80, weight: 700, spacing: 12 }, size: [0.11, 0.055] }, P);
    g.userData.frame = { h: 0.62, w: 0.62, cy: -0.045 };      // the tee keeps its original framing (its origin is not centred)
    return g;
  }

  if (spec.type === 'jorts') {
    const model = await loadModel('models/shortpant.glb'); const it = instance(model, 1.14, 1.1); g.add(it.root);
    it.meshes.forEach((m) => {
      const mt = m.material; mt.metalnessMap = null; mt.metalness = 0; mt.side = THREE.DoubleSide;
      if (m.geometry.attributes.position.count > 1000) {
        mt.roughness = 1; mt.normalScale.set(1.6, 1.6);
        try { mt.map = denimMap(model.src.material.map.image, spec.color, spec.wash); mt.color.set(0xffffff); }
        catch (e) { console.warn('denim recolour failed, using flat colour', e); mt.map = null; mt.color.set(spec.color); }    // never leave the garment blank
      }
      else { mt.color.set(0xd8d4cb); }                       // the button
    });
    g.updateMatrixWorld(true);
    const main = it.meshes.filter((m) => m.geometry.attributes.position.count > 1000);
    await addPrint(g, main, { k: 'front', c: [it.min.x * 0.62, it.min.y + it.size.y * 0.62, it.max.z], rot: 0, K: 0.1, dir: 1, depth: 0.2, imgW: 0.09, ink: '#f1ece0', text: P.patch || null, tex: { w: 512, h: 256, size: 90, spacing: 8 }, size: [0.07, 0.035] }, P);
    g.userData.frame = { h: it.size.y * 1.02, w: it.size.x * 1.0, cy: 0 };
    return g;
  }

  if (spec.type === 'hoodie') {
    const [model, teeModel] = await Promise.all([loadModel('models/hoodie.glb'), loadModel('models/tee.glb')]);
    const it = instance(model); g.add(it.root);
    const nm = teeModel.root.getObjectByProperty('isMesh', true).material.normalMap;       // fine knit grain borrowed from the tee fabric
    let knit = null; if (nm) { knit = nm.clone(); knit.userData.shared = false; knit.wrapS = knit.wrapT = THREE.RepeatWrapping; knit.repeat.set(6, 6); knit.needsUpdate = true; }
    it.meshes.forEach((m) => { const mt = m.material; mt.color.set(spec.color); mt.roughness = 0.96; mt.metalness = 0; mt.side = THREE.DoubleSide; if (knit) { mt.normalMap = knit; mt.normalScale.set(0.7, 0.7); } });
    g.updateMatrixWorld(true);
    const yc = it.min.y + it.size.y * 0.63, zf = it.max.z * 0.9, zb = it.min.z * 0.9, hf = P.front ?? P.chest;
    await addPrint(g, it.meshes, { k: 'front', c: [0, yc, zf], rot: 0, K: 0.18, dir: 1, depth: 0.3, imgW: 0.22, ink, text: tx(hf, 'SWITCH'), tex: { w: 1024, h: 512, size: 190, spacing: 6, wdth: 92 }, size: [0.2, 0.1] }, P);
    await addPrint(g, it.meshes, { k: 'back', c: [0, it.min.y + it.size.y * 0.6, zb], rot: Math.PI, K: 0.18, dir: -1, depth: 0.3, imgW: 0.32, ink, text: tx(P.back, 'SWITCH'), tex: { w: 1024, h: 512, size: 230, spacing: 6, wdth: 92 }, size: [0.34, 0.17] }, P);
    g.userData.frame = { h: it.size.y, w: it.size.x * 0.76, cy: 0 };
    return g;
  }
  throw new Error('unknown garment ' + spec.type);
}
