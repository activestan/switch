import { build } from 'esbuild';
import fs from 'fs';
for (const [i, o] of [['src/main.js', 'site/app.js'], ['src/admin.js', 'site/admin.js']]) await build({ entryPoints: [i], bundle: true, minify: true, format: 'iife', target: 'es2020', outfile: o, legalComments: 'none', logLevel: 'info' });
fs.mkdirSync('site/models',{recursive:true}); for (const f of fs.existsSync('assets')?fs.readdirSync('assets'):[]) fs.copyFileSync('assets/'+f,'site/models/'+f);
const P = 'src/pages/'; const part = (n) => fs.readFileSync(`${P}_${n}.html`, 'utf8');
for (const f of fs.readdirSync(P).filter((f) => !f.startsWith('_') && f.endsWith('.html'))) {
  let s = fs.readFileSync(P + f, 'utf8'); const m = s.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\n/); const meta = m ? JSON.parse(m[1]) : {}; if (m) s = s.slice(m[0].length);
  let out = meta.standalone ? s : part('head') + s + part('foot'); out = out.replace('{{modal}}', part('modal'));
  for (const [k, v] of Object.entries(meta)) out = out.replaceAll(`{{${k}}}`, v);
  fs.writeFileSync(`site/${f}`, out); console.log('page', f);
}
