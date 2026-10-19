// Renders a 540x960 cover for every card with the portfolio's own fonts/colours,
// then turns each cover into a short seamless looping preview video with ffmpeg.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { CARDS } from '../src/cards.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const out = path.join(root, 'out/assets/hero');
const photo = pathToFileURL(path.resolve(process.argv[2] || '')).href;
mkdirSync(path.join(out, 'covers'), { recursive: true });
mkdirSync(path.join(out, 'video'), { recursive: true });

const font = (n, f, w) => `@font-face{font-family:'${n}';font-weight:${w};src:url('${pathToFileURL(path.join(here, f)).href}') format('woff2')}`;
const FONTS = [
  font('Bebas Neue', 'bebas-neue-latin-400-normal.woff2', 400),
  font('Space Grotesk', 'space-grotesk-latin-500-normal.woff2', 500),
  font('Space Grotesk', 'space-grotesk-latin-700-normal.woff2', 700),
  font('Inter', 'inter-latin-500-normal.woff2', 500),
  font('Inter', 'inter-latin-700-normal.woff2', 700),
].join('\n');

// Site palette
const INK = '#111111', CANVAS = '#C8D0D8', VERM = '#FF321F', CORAL = '#FF765F', SIG = '#743BFF', MUTED = '#50545A';

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// font size so the longest single word fits the 452px text column (Bebas ~0.40em/char)
const fit = (t) => {
  const longest = Math.max(...t.split(/\s+/).map((w) => w.length));
  const byWidth = 440 / (longest * 0.42);
  const byLines = t.length > 18 ? 130 : t.length > 11 ? 170 : 230;
  return Math.floor(Math.min(230, byWidth, byLines));
};

const themes = {
  project: (c) => `
    <div class="bg" style="background:radial-gradient(120% 70% at 80% 0%, ${VERM}55, transparent 60%), ${INK}"></div>
    <div class="top"><span class="mono" style="color:${CORAL}">PROJECT ${c.n}</span><span class="mono dim">(${c.n})</span></div>
    <div class="mid"><h1 style="color:#fff;font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:#fff9">${esc(c.sub)}</p></div>
    <div class="tags">${c.tags.map((t) => `<span style="background:#ffffff1f;color:#fff">${esc(t)}</span>`).join('')}</div>`,
  work: (c) => `
    <div class="bg" style="background:linear-gradient(160deg,#fff 0%, ${CANVAS} 100%)"></div>
    <div class="top"><span class="mono" style="color:${VERM}">EXPERIENCE</span></div>
    <div class="mid"><h1 style="color:${INK};font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:${MUTED}">${esc(c.sub)}</p></div>
    <div class="tags"><span style="background:${INK};color:#fff">${esc(c.meta)}</span></div>`,
  honor: (c) => `
    <div class="bg" style="background:linear-gradient(160deg,${VERM} 0%, ${CORAL} 100%)"></div>
    <div class="top"><span class="mono" style="color:#fff">ACHIEVEMENT</span></div>
    <div class="mid"><h1 style="color:#fff;font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:#fff">${esc(c.sub)}</p></div>
    <div class="tags"><span style="background:${INK};color:#fff">WINNER</span></div>`,
  edu: (c) => `
    <div class="bg" style="background:${INK}"></div>
    <div class="top"><span class="mono" style="color:${CORAL}">EDUCATION</span></div>
    <div class="mid"><h1 style="color:#fff;font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:#fff9">${esc(c.sub)}</p></div>
    <div class="tags"><span style="background:#ffffff1f;color:#fff">${esc(c.meta)}</span></div>`,
  cert: (c) => `
    <div class="bg" style="background:radial-gradient(110% 60% at 15% 0%, #ffffff30, transparent 60%), ${SIG}"></div>
    <div class="top"><span class="mono" style="color:#fff">VERIFIED CERTIFICATION</span></div>
    <div class="mid"><h1 style="color:#fff;font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:#fffc">${esc(c.sub)}</p></div>
    <div class="tags"><span style="background:#ffffff26;color:#fff">${esc(c.meta)}</span></div>`,
  skill: (c, i) => {
    const alt = i % 3;
    const bg = alt === 0 ? `background:${CANVAS}` : alt === 1 ? `background:${INK}` : `background:#fff`;
    const fg = alt === 1 ? '#fff' : INK;
    return `
    <div class="bg" style="${bg}"></div>
    <div class="blob" style="background:${alt === 2 ? SIG : VERM}"></div>
    <div class="top"><span class="mono" style="color:${alt === 1 ? CORAL : VERM}">${esc(c.group)}</span></div>
    <div class="mid"><h1 style="color:${fg};font-size:${fit(c.title)}px">${esc(c.title)}</h1></div>
    <div class="tags"><span style="background:${alt === 1 ? '#ffffff1f' : INK};color:#fff">SKILL</span></div>`;
  },
  photo: (c) => `
    <div class="bg" style="background:url('${photo}') center 18%/cover"></div>
    <div class="bg" style="background:linear-gradient(180deg,transparent 45%, ${INK}ee 100%)"></div>
    <div class="top"><span class="mono" style="color:#fff">HELLO</span><span class="mono" style="color:#fff;background:${VERM};padding:6px 12px;border-radius:8px;font-size:18px">ABOUT ME</span></div>
    <div class="mid" style="justify-content:flex-end;padding-bottom:44px"><h1 style="color:#fff;font-size:${fit(c.title)}px">${esc(c.title)}</h1><p style="color:#fffc;font-size:26px">${esc(c.sub)}</p></div>`,
};

const page = (inner) => `<!doctype html><meta charset="utf-8"><style>
${FONTS}
*{box-sizing:border-box;margin:0}
body{width:540px;height:960px;position:relative;overflow:hidden;font-family:Inter,sans-serif}
.bg{position:absolute;inset:0}
.blob{position:absolute;width:420px;height:420px;border-radius:50%;right:-150px;bottom:-120px;opacity:.9}
.top{position:absolute;top:44px;left:44px;right:44px;display:flex;justify-content:space-between}
.mono{font:700 22px 'Space Grotesk',monospace;letter-spacing:.14em}
.dim{color:#fff7;font:500 22px 'Space Grotesk'}
.mid{position:absolute;left:44px;right:44px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:24px}
h1{font-family:'Bebas Neue',sans-serif;font-weight:400;line-height:.88;letter-spacing:.01em;overflow-wrap:normal}
p{font:500 30px/1.25 Inter,sans-serif}
.tags{position:absolute;left:44px;right:44px;bottom:48px;display:flex;flex-wrap:wrap;gap:12px}
.tags span{font:700 20px 'Space Grotesk';letter-spacing:.1em;padding:10px 18px;border-radius:10px;text-transform:uppercase}
</style><body>${inner}</body>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN });
const ctx = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
const pg = await ctx.newPage();
const tmp = path.join(root, 'out/_tmp');
mkdirSync(tmp, { recursive: true });

for (let i = 0; i < CARDS.length; i++) {
  const c = CARDS[i];
  const htmlPath = path.join(tmp, `${c.id}.html`);
  writeFileSync(htmlPath, page(themes[c.kind](c, i)));
  await pg.goto(pathToFileURL(htmlPath).href);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(80);
  const png = path.join(tmp, `${c.id}.png`);
  await pg.screenshot({ path: png });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', path.join(out, 'covers', `${c.id}.jpg`)]);
}
await browser.close();

// Moving highlight sweep, used by every preview video
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
  "color=c=black@0.0:s=360x640,format=rgba,geq=r='255':g='255':b='255':a='max(0,70*(1-abs((X-Y*0.35)-180)/90))'",
  '-frames:v', '1', path.join(tmp, 'sweep.png')]);

// Seamless 3s loop: slow breathing zoom/pan + light sweep. 24 fps * 3 s = 72 frames.
for (const c of CARDS) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    '-loop', '1', '-framerate', '24', '-t', '3', '-i', path.join(out, 'covers', `${c.id}.jpg`),
    '-loop', '1', '-framerate', '24', '-t', '3', '-i', path.join(tmp, 'sweep.png'),
    '-filter_complex',
    "[0:v]scale=1080:1920,zoompan=z='1.07+0.05*sin(2*PI*on/72)':x='iw/2-(iw/zoom/2)+30*sin(2*PI*on/72)':y='ih/2-(ih/zoom/2)+24*cos(2*PI*on/72)':d=1:s=360x640:fps=24[a];" +
    "[1:v]format=rgba[b];[a][b]overlay=x='-w+(W+w)*t/3':y=0:format=auto,format=yuv420p[v]",
    '-map', '[v]', '-t', '3', '-c:v', 'libx264', '-crf', '30', '-preset', 'veryfast', '-movflags', '+faststart', '-an',
    path.join(out, 'video', `${c.id}.mp4`)]);
}
console.log('covers + videos done:', CARDS.length);
