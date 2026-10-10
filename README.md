# SWITCH — multipage 3D clothing site (static, no backend)

Pages: `index` · `tees` · `jorts` · `jackets` · `upcoming`. Host the `site/` folder anywhere (GitHub Pages, Netlify, Cloudflare Pages).

* Every garment is a real 3D mesh rendered live with three.js: tee = `site/models/tee.glb`, jorts = `site/models/shortpant.glb` (tailored shorts, fabric texture re-coloured to denim in code), hoodie = `site/models/hoodie.glb`. Nothing is generated procedurally. Colour, wash and prints come from `src/data.js`.
* **Licences:** the three GLBs were found in public GitHub repos (Sketchfab-origin exports) with no stated licence. Replace them with licensed/commissioned meshes (same file names) before a public launch.
* The jackets section currently shows a hoodie mesh (no free realistic jacket mesh exists). Drop a `jacket.glb` in and add a `jacket` branch in `src/garments.js` when you have one.
* Models were compressed with gltf-transform (simplify 40%, WebP textures, quantised): 6 MB total.
* Catalogue = `src/data.js` (plain objects: type, price, drop date, colourways, prints). An admin page only needs to write this shape.
* Light/dark "switch" in the nav, mobile bottom tab bar, product view with colours/sizes/notify.
* Build: `npm i && node build.mjs` → `site/`.
* Licence note: `tee.glb` is a sample tee mesh from a public GitHub tutorial — replace with a licensed/commissioned model before launch.


## Orders (WhatsApp) and the admin page

**Bag + orders.** "Add to bag" fills a real bag (saved on the customer's device: colour, size, quantity). "Order on WhatsApp" opens a chat with the store number containing the whole order, total, name and delivery area. Each product view also has a one-tap WhatsApp button, and upcoming pieces have "Notify me on WhatsApp". No payment is taken on the site — the owner confirms stock, delivery and payment in the chat.

**Admin: `admin.html`** (not linked from the shop, `noindex`). Everything runs in the browser; there is no server.
1. *Settings* — set the WhatsApp number (digits, international format, e.g. 2348012345678) and currency symbol. The demo number is `2340000000000`.
2. *New piece* — choose Tee / Jorts / Hoodie, name, price, sizes, description, release (now or a drop date).
3. *Model it from a photo* — upload a photo of the real piece: the fabric colour is detected (or tap the fabric), drag a box over the print to cut it out (the fabric colour is removed, optionally forced to one ink colour), apply it to the front/back (jorts: pocket patch), then place and scale it live on the 3D model. A separate graphic file can be uploaded the same way. Every colourway has its own prints.
4. *Save* keeps a draft in that browser; *Preview shop* opens the real shop with the drafts (banner shown, only on that device).
5. *Publish* writes `catalogue.json` and `uploads/*.png` into the site — either by committing to a GitHub repo (user, repo, branch, folder, fine-grained token with Contents read/write; GitHub Pages then redeploys) or as a downloadable zip to unzip next to `index.html`.

`catalogue.json` shape: `{ settings: { whatsapp, currency }, products: [ { id, name, type: tee|jorts|hoodie, price, blurb, date (ISO), sizes?, prints?, colorways: [ { id, name, hex, ink, wash?, prints: { frontImg, backImg, frontPos: {x,y,s}, backPos } } ], hidden? } ] }`. A product whose `id` matches a built-in one replaces it; `hidden: true` removes it.

Limits: photos supply colour and artwork — a *new silhouette* (cargo shorts, puffer…) needs its own 3D base model. The admin page has no login: only someone with the GitHub token can publish, but treat the URL as private. Drafts live in one browser's storage until published.


## Launch checklist

Before you point a domain at the site:

1. **WhatsApp number** — admin page → Settings. The demo number is a placeholder, so orders will not reach you until you change it. Settings also take your Instagram and TikTok links, which appear in the footer only when filled in.
2. **Help page** — `src/pages/help.html` holds placeholder text for the FAQ, size tables, delivery and returns. Edit it to match your real policies and measurements, then run `node build.mjs`.
3. **Currency** — admin page → Settings.
4. **Share preview** — `site/og.jpg` is the image shown when the link is shared. Social sites need an absolute URL, so after you know your domain, change `content="og.jpg"` in `src/pages/_head.html` to `https://your-domain/og.jpg` (two places).
5. **404 page** — `404.html` is picked up automatically by GitHub Pages and Netlify.
6. **Domain** — GitHub Pages: upload the contents of `site/` (not the folder itself) and add a `CNAME` file if you use a custom domain.

## Landing page (editorial, story-led)

`index.html` is a photo-led landing page: full-bleed campaign hero → three portrait doors (Tees / Jorts / Hoodies) → the brand statement → new arrivals in 3D → three story chapters (The idea, The fabric, The making) → a full-bleed community panel → next drop with countdown → how ordering works → join the early-access list on WhatsApp.

- **Copy:** all story text lives in `src/pages/index.html`. It is placeholder wording that matches the product data (280gsm / 14oz / 450gsm). Rewrite it with your real story, then run `node build.mjs`.
- **Photos:** `site/img/*.jpg` (hero, tees, jorts, hoodie, idea, fabric, making, community, drop) are AI-generated stand-ins. Replace each file with your real photography, keeping the same file name. The hero and drop images should be landscape (about 16:9), the three door images and `fabric.jpg` portrait (about 4:5), and `idea.jpg` and `making.jpg` landscape (about 3:2). Sources are in `img_src/`.
- **Fonts:** headings use Instrument Serif (`site/fonts/`, SIL Open Font License); body text uses Archivo.
