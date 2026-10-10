/* SWITCH — catalogue. Plain data: an admin page only has to write objects of this shape (JSON) and the site renders them.
   type: tee | jorts | hoodie          days: negative = already released, positive = drops in N days (or give `date`)
   colorways[i]: { id, name, hex, ink (print colour), wash?, thread?, raw? } — everything the 3D garment needs */
export const CURRENCY = '$';
/* Store settings — overridden by `settings` inside catalogue.json . whatsapp = international number, digits only. */
export const SETTINGS = { whatsapp: '2340000000000', currency: '$', brand: 'SWITCH' };
export const DEFAULTS = {
  tee: { sizes: ['S', 'M', 'L', 'XL', '2XL'], details: [['Fabric', '280gsm combed cotton jersey'], ['Fit', 'Boxy, dropped shoulder'], ['Print', 'Water-based, soft hand'], ['Care', 'Cold wash, hang dry']] },
  jorts: { sizes: ['28', '30', '32', '34', '36'], details: [['Fabric', '14oz rigid cotton denim'], ['Fit', 'Relaxed, falls to the knee'], ['Detail', 'Button fly, belt loops, pockets'], ['Care', 'Wash inside out, cold']] },
  hoodie: { sizes: ['S', 'M', 'L', 'XL'], details: [['Fabric', '450gsm brushed-back fleece'], ['Trim', 'Ribbed cuffs and hem, lined hood'], ['Pocket', 'Kangaroo hand pocket'], ['Fit', 'Boxy, dropped shoulder']] },
};
export const TYPE_CAT = { tee: 'tees', jorts: 'jorts', hoodie: 'jackets' };
export const TYPE_NAME = { tee: 'Tee', jorts: 'Jorts', hoodie: 'Hoodie' };
export const CATS = {
  tees: { name: 'Tees', blurb: 'Heavyweight cotton, boxy cut, prints that mean it.', type: 'tee' },
  jorts: { name: 'Jorts', blurb: 'Rigid denim, baggy to the knee. Built to be worn out.', type: 'jorts' },
  jackets: { name: 'Jackets', blurb: 'Heavy hoodies and layers with the volume turned up.', type: 'hoodie' },
};
const tee = (id, name, price, days, blurb, cw, prints) => ({ id, name, cat: 'tees', type: 'tee', price, days, blurb, colorways: cw, prints, sizes: ['S', 'M', 'L', 'XL', '2XL'],
  details: [['Fabric', '280gsm combed cotton jersey'], ['Fit', 'Boxy, dropped shoulder'], ['Print', 'Water-based, soft hand'], ['Care', 'Cold wash, hang dry']] });
const jorts = (id, name, price, days, blurb, cw, prints) => ({ id, name, cat: 'jorts', type: 'jorts', price, days, blurb, colorways: cw, prints, sizes: ['28', '30', '32', '34', '36'],
  details: [['Fabric', '14oz rigid cotton denim'], ['Fit', 'Relaxed, falls to the knee'], ['Detail', 'Button fly, belt loops, pockets'], ['Care', 'Wash inside out, cold']] });
const jacket = (id, name, price, days, blurb, cw, prints) => ({ id, name, cat: 'jackets', type: 'hoodie', price, days, blurb, colorways: cw, prints, sizes: ['S', 'M', 'L', 'XL'],
  details: [['Fabric', '450gsm brushed-back fleece'], ['Trim', 'Ribbed cuffs and hem, lined hood'], ['Pocket', 'Kangaroo hand pocket'], ['Fit', 'Boxy, dropped shoulder']] });

export const PRODUCTS = [
  tee('standby-tee', 'Standby Tee', 48, -40, 'The one that started it. A boxy heavyweight tee with SWITCH across the chest and ALWAYS ON written small on the back of the neck.', [
    { id: 'chalk', name: 'Chalk', hex: '#efece4', ink: '#111111' }, { id: 'onyx', name: 'Onyx', hex: '#1b1b1d', ink: '#ecebe4' },
    { id: 'sage', name: 'Sage', hex: '#94a58a', ink: '#111111' }, { id: 'clay', name: 'Clay', hex: '#b4694a', ink: '#f3eadb' },
    { id: 'navy', name: 'Navy', hex: '#25355a', ink: '#ecebe4' }, { id: 'volt', name: 'Volt', hex: '#c8ff2e', ink: '#111111' }], { front: 'SWITCH', back: 'ALWAYS ON' }),
  tee('voltage-tee', 'Voltage Tee', 52, -12, 'Louder. The Voltage tee wears the wordmark huge across the chest — a signal you can read from across the street.', [
    { id: 'onyx', name: 'Onyx', hex: '#1b1b1d', ink: '#c8ff2e' }, { id: 'chalk', name: 'Chalk', hex: '#efece4', ink: '#111111' },
    { id: 'rust', name: 'Rust', hex: '#8c3b24', ink: '#f3eadb' }, { id: 'sand', name: 'Sand', hex: '#d2bd98', ink: '#111111' }], { front: 'VOLTAGE', back: 'HIGH VOLTAGE' }),
  tee('overload-tee', 'Overload Tee', 55, 6, 'Dropping soon. Washed-out colour, oversized body and a back print you will have to see to believe.', [
    { id: 'butter', name: 'Butter', hex: '#e8d08a', ink: '#111111' }, { id: 'sage', name: 'Sage', hex: '#94a58a', ink: '#111111' }, { id: 'onyx', name: 'Onyx', hex: '#1b1b1d', ink: '#ecebe4' }], { front: 'OVERLOAD', back: 'NO LIMIT' }),

  jorts('baseline-jorts', 'Baseline Jorts', 85, -35, 'Rigid indigo denim cut loose to the knee with pockets, belt loops and a button fly. The everyday pair.', [
    { id: 'indigo', name: 'Indigo', hex: '#2c4670', wash: 0.35, thread: '#e0a85f', ink: '#111111' }, { id: 'stone', name: 'Stone wash', hex: '#6f8db3', wash: 0.55, thread: '#f0d49a', ink: '#111111' },
    { id: 'black', name: 'Washed black', hex: '#232427', wash: 0.4, thread: '#8f8f8f', ink: '#111111' }], { patch: 'SWITCH' }),
  jorts('bleach-jorts', 'Bleach Jorts', 92, -9, 'Sun-faded and sand-blasted. The Bleach Jorts are the lightest wash in the range, with a frayed hem that gets better every wear.', [
    { id: 'bleach', name: 'Bleached', hex: '#8fa9c8', wash: 0.7, thread: '#f2e3bf', raw: true, ink: '#111111' }, { id: 'ecru', name: 'Ecru', hex: '#cbbf9f', wash: 0.4, thread: '#8a6a3a', raw: true, ink: '#111111' }], { patch: 'ON' }),
  jorts('blackout-jorts', 'Blackout Jorts', 95, 11, 'Dropping soon. Heavy black denim, tonal stitching, the stealth version of the Baseline.', [
    { id: 'black', name: 'Black', hex: '#1e1f22', wash: 0.25, thread: '#4a4a4c', ink: '#111111' }, { id: 'graphite', name: 'Graphite', hex: '#4a4d52', wash: 0.4, thread: '#a9a9a9', ink: '#111111' }], { patch: 'OFF' }),

  jacket('relay-hoodie', 'Relay Hoodie', 140, -20, 'Heavyweight fleece with a deep hood, kangaroo pocket and bunched rib cuffs. SWITCH on the chest, and a back print that does the talking.', [
    { id: 'olive', name: 'Olive', hex: '#4d5a42', ink: '#14120f', rib: '#3d4834' }, { id: 'black', name: 'Black', hex: '#1d1e20', ink: '#ecebe4', rib: '#161617' },
    { id: 'navy', name: 'Navy', hex: '#223152', ink: '#ecebe4', rib: '#1a2640' }, { id: 'bone', name: 'Bone', hex: '#d9d3c4', ink: '#111111', rib: '#c3bba8' }], { chest: 'SWITCH', back: 'SWITCH' }),
  jacket('nightshift-hoodie', 'Night Shift Hoodie', 155, 4, 'Dropping soon. A blacked-out hoodie with volt graphics, made for after dark.', [
    { id: 'black', name: 'Black', hex: '#161719', ink: '#c8ff2e', rib: '#c8ff2e' }, { id: 'graphite', name: 'Graphite', hex: '#3a3c40', ink: '#c8ff2e', rib: '#202225' }], { chest: 'SWITCH', back: 'NIGHT SHIFT' }),
];
