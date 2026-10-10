/* One shared WebGL renderer draws every garment (cards, hero, product view) into plain 2D canvases —
   no per-card WebGL contexts, so phones stay happy. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGarment } from './garments.js';

let R, ENV;
export const look = { dark: true };
function gl() {
  if (R) return R;
  R = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.outputColorSpace = THREE.SRGBColorSpace; R.setClearColor(0x000000, 0);
  ENV = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
  return R;
}
let shadowTex;
function shadowMap() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return (shadowTex = new THREE.CanvasTexture(c));
}
function dispose(o) {
  o.traverse((m) => { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); const mt = m.material; if (mt) [].concat(mt).forEach((q) => { ['map', 'bumpMap', 'normalMap'].forEach((k) => q[k] && q[k].dispose && !q[k].userData.shared && q[k].dispose()); q.dispose(); }); });
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class View {
  constructor(canvas, o = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.o = { speed: 0.5, drag: false, maxW: 720, ...o };
    this.angle = o.phase || 0; this.scene = new THREE.Scene(); this.cam = new THREE.PerspectiveCamera(26, 1, 0.05, 10);
    this.key = new THREE.DirectionalLight(0xfff3e2, 2.1); this.key.position.set(0.6, 1.2, 1.4);
    this.rim = new THREE.DirectionalLight(0xdfe8ff, 1); this.rim.position.set(-1.2, 0.5, -1.2); this.scene.add(this.key, this.rim);
    this.pivot = new THREE.Group(); this.scene.add(this.pivot);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowMap(), transparent: true, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.scene.add(this.shadow);
    this.g = null; this.tok = 0; this.fade = 1; this.zoom = 1; this.zt = 1; this.ly = 0; this.lyt = 0; this.at = null; this.paused = false; this.slow = 1;
    this.dragging = false; this.resumeAt = 0; this.running = false; this.dirty = true;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas); this.resize();
    if (this.o.drag) this.bindDrag();
  }
  resize() {
    const w = this.c.clientWidth, h = this.c.clientHeight; if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, this.o.maxW / (w * dpr));
    this.w = Math.round(w * dpr * k); this.h = Math.round(h * dpr * k); this.c.width = this.w; this.c.height = this.h; this.dirty = true;
  }
  async load(spec) {
    const t = ++this.tok; let g; try { g = await buildGarment(spec); } catch (e) { console.error(e); return; }
    if (t !== this.tok) { dispose(g); return; }
    if (this.g) { this.pivot.remove(this.g); dispose(this.g); }
    this.g = g; this.f = g.userData.frame; g.position.y = -this.f.cy; this.pivot.add(g); this.fade = this.o.instant && this.c.classList.contains('on') ? 1 : 0; this.dirty = true; this.c.classList.add('on');
    this.shadow.scale.set(this.f.w * 1.15, this.f.w * 1.15, 1); this.shadow.position.y = -this.f.h / 2 - 0.012;
  }
  focus({ angle = null, zoom = 1, y = 0 } = {}) { this.at = angle; this.zt = zoom; this.lyt = y; }
  bindDrag() {
    const c = this.c; let x0 = 0, a0 = 0;
    c.addEventListener('pointerdown', (e) => { this.dragging = true; x0 = e.clientX; a0 = this.angle; this.at = null; c.setPointerCapture(e.pointerId); c.classList.add('grab'); });
    c.addEventListener('pointermove', (e) => { if (this.dragging) { this.angle = a0 + (e.clientX - x0) * 0.011; this.dirty = true; } });
    const up = () => { if (!this.dragging) return; this.dragging = false; this.resumeAt = performance.now() + 1300; c.classList.remove('grab'); };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }
  start() { if (this.running) return; this.running = true; ACTIVE.add(this); loopStart(); }
  stop() { this.running = false; ACTIVE.delete(this); }
  dispose() { this.stop(); this.ro.disconnect(); if (this.g) dispose(this.g); }
  tick(dt, now) {
    if (!this.g || !this.w) return;
    if (this.at !== null && !this.dragging) { const d = ((this.at - this.angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; this.angle += d * (1 - Math.exp(-dt * 5)); if (Math.abs(d) < 0.003) this.angle += d; }
    else if (!this.dragging && !this.paused && now > this.resumeAt) this.angle += this.o.speed * this.slow * dt;
    const e = 1 - Math.exp(-dt * 6); this.zoom += (this.zt - this.zoom) * e; this.ly += (this.lyt - this.ly) * e;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 2.2);
    this.draw(now);
  }
  draw(now) {
    const r = gl(); const { w, h } = this; if (!w) return;
    if (r.domElement.width !== w || r.domElement.height !== h) r.setSize(w, h, false);
    const asp = w / h, f = this.f, fov = this.cam.fov * Math.PI / 180;
    const need = Math.max(f.h, f.w / asp) * 1.16;
    const d = need / (2 * Math.tan(fov / 2)) / this.zoom;
    this.cam.aspect = asp; this.cam.position.set(0, this.ly * f.h, d); this.cam.lookAt(0, this.ly * f.h, 0); this.cam.updateProjectionMatrix();
    this.scene.environment = ENV; this.scene.environmentIntensity = look.dark ? 0.55 : 0.78;
    this.rim.color.set(look.dark ? 0xc8ff2e : 0xdfe8ff); this.rim.intensity = look.dark ? 1.5 : 0.9; this.key.intensity = look.dark ? 1.8 : 2.1;
    this.shadow.material.opacity = look.dark ? 0.5 : 1;
    this.pivot.rotation.y = this.angle; this.pivot.position.y = Math.sin(now / 1500 + (this.o.phase || 0) * 6) * 0.01; this.pivot.rotation.z = Math.sin(now / 2300) * 0.01;
    const s = 0.94 + 0.06 * (1 - Math.pow(1 - this.fade, 3)); this.pivot.scale.setScalar(s);
    r.render(this.scene, this.cam);
    const c = this.ctx; c.clearRect(0, 0, w, h); c.globalAlpha = Math.min(1, this.fade * 1.4); c.drawImage(r.domElement, 0, 0, w, h); c.globalAlpha = 1;
  }
}
const ACTIVE = new Set(); let raf = 0, last = 0;
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; ACTIVE.forEach((v) => v.tick(dt, now)); raf = ACTIVE.size ? requestAnimationFrame(loop) : 0; }
function loopStart() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } }
export function specOf(p, cw) { return { type: p.type, color: cw.hex, ink: cw.ink, wash: cw.wash, thread: cw.thread, raw: cw.raw, rib: cw.rib, prints: { ...p.prints, ...(cw.prints || {}) } }; }
