// meme-generator.mjs — v2 "Sick Day" (gta6-meme-x-01)
// GTA 6 launch day: the whole office called in sick, and the make.fun ghost
// is sitting at the empty desk playing the game. Pure Node stdlib, no images,
// no network. Deterministic: same bytes on every run.
// Usage: node meme-generator.mjs  (writes meme.png, 1200x675)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const W = 1200, H = 675;
const buf = Buffer.alloc(W * H * 4);

// ---------------------------------------------------------------- colors
const C = {
  black: [0, 0, 0], white: [255, 255, 255],
  band: [36, 16, 49],            // dark purple bands
  wallTop: [255, 220, 168], wallBot: [247, 168, 184],
  frame: [58, 42, 46],           // window frame
  skyTop: [255, 154, 82], skyMid: [255, 94, 122], skyBot: [166, 61, 122],
  sun: [255, 210, 63], sunSlat: [255, 138, 92],
  skyline: [58, 31, 61], palm: [42, 20, 48],
  desk: [107, 58, 42], deskTop: [138, 75, 50],
  chair: [35, 35, 46], chairHi: [46, 46, 58],
  monitor: [20, 20, 28], screenTop: [255, 138, 61], screenBot: [201, 75, 124],
  screenSun: [255, 224, 102],
  magenta: [230, 0, 126], yellow: [255, 210, 63],
  red: [230, 51, 41], calGrid: [239, 239, 239],
  keyboard: [34, 34, 42], mug: [255, 255, 255],
  pot: [201, 75, 75], leaf: [62, 155, 79],
  controller: [26, 26, 34], btnA: [230, 0, 126], btnB: [255, 210, 63],
};

// ---------------------------------------------------------------- pixels
function setPx(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
}
function fillRect(x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
      i += 4;
    }
  }
}
function fillCircle(cx, cy, r, c) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy, half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    fillRect(cx - half, y, half * 2 + 1, 1, c);
  }
}
function fillEllipse(cx, cy, rx, ry, c) {
  for (let y = Math.round(cy - ry); y <= Math.round(cy + ry); y++) {
    const dy = (y - cy) / ry, half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
    fillRect(cx - half, y, half * 2 + 1, 1, c);
  }
}
function lerp(a, b, t) {
  return [Math.round(a[0] + (b[0] - a[0]) * t),
          Math.round(a[1] + (b[1] - a[1]) * t),
          Math.round(a[2] + (b[2] - a[2]) * t)];
}
function vgrad(x, y, w, h, cTop, cBot) {
  for (let yy = 0; yy < h; yy++) fillRect(x, y + yy, w, 1, lerp(cTop, cBot, yy / Math.max(1, h - 1)));
}
function thickLine(x0, y0, x1, y1, wd, c) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, wd / 2, c);
  }
}
function fillPoly(pts, c) {
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
    }
  }
}
function starPoints(cx, cy, rO, rI, rot) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI, a = rot + i * Math.PI / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
function sparkle(cx, cy, r, c) {
  const f = [[0, -1], [0.22, -0.22], [1, 0], [0.22, 0.22], [0, 1], [-0.22, 0.22], [-1, 0], [-0.22, -0.22]];
  fillPoly(f.map(([fx, fy]) => [cx + fx * r, cy + fy * r]), c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 chars, '#' = on.
const FONT = {
  'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'C': ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  'E': ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  'F': ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  'G': ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  'H': ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  'K': ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  'L': ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  'M': ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  'N': ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  'T': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  'V': ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};
function textWidth(s, sc) { return s.length * 6 * sc - sc; }
function drawTextAt(s, x, y, sc, c, oc) {
  const ot = Math.max(2, Math.round(sc / 4));
  const draw = (xx, yy, color) => {
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]];
      if (!g) continue;
      for (let r = 0; r < 7; r++) for (let cc = 0; cc < 5; cc++) {
        if (g[r][cc] === '#') fillRect(xx + i * 6 * sc + cc * sc, yy + r * sc, sc, sc, color);
      }
    }
  };
  if (oc) for (const [dx, dy] of [[-ot, 0], [ot, 0], [0, -ot], [0, ot], [-ot, -ot], [ot, -ot], [-ot, ot], [ot, ot]]) draw(x + dx, y + dy, oc);
  draw(x, y, c);
}
function drawText(s, cx, y, sc, c, oc) { drawTextAt(s, cx - textWidth(s, sc) / 2, y, sc, c, oc); }
function drawTextSegs(segs, cx, y, sc, oc) {
  let total = -sc;
  for (const s of segs) total += textWidth(s.t, sc) + sc;
  let x = cx - total / 2;
  for (const s of segs) { drawTextAt(s.t, x, y, sc, s.c, oc); x += textWidth(s.t, sc) + sc; }
}

// ---------------------------------------------------------------- ghost
function ghostPoints(cx, top, w, bot) {
  const r = w / 2, cy = top + r, pts = [];
  pts.push([cx - r, bot - 14]);
  pts.push([cx - r, cy]);
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.push([cx + r, bot - 14]);
  for (let i = 1; i <= 36; i++) {
    const t = i / 36;
    pts.push([(cx + r) - t * w, (bot - 14) + 14 * Math.abs(Math.sin(Math.PI * 3 * t))]);
  }
  return pts;
}
function drawGhost(cx, top, w, bot) {
  const pts = ghostPoints(cx, top, w, bot);
  const ccx = cx, ccy = (top + bot) / 2;
  const big = pts.map(([x, y]) => {
    const dx = x - ccx, dy = y - ccy, d = Math.hypot(dx, dy) || 1;
    return [x + dx / d * 6, y + dy / d * 6];
  });
  fillPoly(big, C.black);          // thick outline
  fillPoly(pts, C.white);          // body
  // sparkle eyes
  sparkle(cx - 42, top + 72, 15, C.black);
  sparkle(cx + 42, top + 72, 15, C.black);
  // smile arc
  for (let a = 25; a <= 155; a += 4) {
    const rad = a * Math.PI / 180;
    fillCircle(cx + 26 * Math.cos(rad), top + 96 + 26 * Math.sin(rad), 3.5, C.black);
  }
}

// ---------------------------------------------------------------- scene
function drawPalm(x, baseY, h, c) {
  // trunk: slight curve, drawn as segments
  let px0 = x, py0 = baseY;
  const topX = x + 14, topY = baseY - h;
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    const nx = x + 14 * t * t, ny = baseY - h * t;
    thickLine(px0, py0, nx, ny, 7, c);
    px0 = nx; py0 = ny;
  }
  // fronds
  const fr = [[-52, -6], [-44, -26], [-24, -40], [6, -42], [34, -30], [52, -8], [44, 14]];
  for (const [dx, dy] of fr) thickLine(topX, topY, topX + dx, topY + dy, 5, c);
}

function drawScene() {
  // wall
  vgrad(0, 96, W, 488, C.wallTop, C.wallBot);

  // ---- window (left)
  fillRect(64, 118, 540, 328, C.frame);
  vgrad(78, 132, 512, 300, C.skyTop, C.skyBot);
  // retro slatted sun
  const sunCx = 330, sunCy = 318, sunR = 64;
  fillCircle(sunCx, sunCy, sunR, C.sun);
  for (const [y0, y1] of [[306, 311], [322, 327], [338, 343]]) {
    for (let y = y0; y <= y1; y++) {
      const dy = y - sunCy, half = Math.floor(Math.sqrt(Math.max(0, sunR * sunR - dy * dy)));
      const t = (y - 132) / 300;
      fillRect(sunCx - half, y, half * 2 + 1, 1, lerp(C.skyTop, C.skyBot, t));
    }
  }
  // skyline silhouette inside window
  const bld = [[78, 70], [130, 110], [186, 55], [240, 95], [296, 130], [352, 60], [408, 85], [462, 120], [516, 50], [566, 75]];
  for (const [bx, bh] of bld) fillRect(bx, 432 - bh, 48, bh, C.skyline);
  thickLine(320, 432 - 130, 320, 432 - 158, 3, C.skyline);
  thickLine(486, 432 - 120, 486, 432 - 146, 3, C.skyline);
  // palms in window
  drawPalm(140, 432, 90, C.palm);
  drawPalm(545, 432, 70, C.palm);

  // ---- calendar (right wall)
  fillRect(668, 128, 220, 184, C.white);
  fillRect(668, 128, 220, 4, C.black); fillRect(668, 308, 220, 4, C.black);
  fillRect(668, 128, 4, 184, C.black); fillRect(884, 128, 4, 184, C.black);
  fillRect(672, 132, 212, 34, C.magenta);
  drawText('MAY', 778, 140, 3, C.white, null);
  for (let r = 0; r < 4; r++) for (let col = 0; col < 7; col++) {
    fillRect(676 + col * 32, 178 + r * 32, 28, 28, C.calGrid);
  }
  // red ring around launch day (row 2, col 4 — clear of the ghost)
  fillCircle(818, 256, 20, C.red);
  fillCircle(818, 256, 15, C.calGrid);

  // ---- wall clock
  fillCircle(1030, 185, 44, C.black);
  fillCircle(1030, 185, 40, C.white);
  thickLine(1030, 185, 1010, 160, 5, C.black);
  thickLine(1030, 185, 1052, 168, 5, C.black);
  fillCircle(1030, 185, 4, C.black);

  // ---- make.fun poster on wall (below the raised coin, clear of the arm)
  fillRect(962, 352, 184, 64, C.magenta);
  drawText('MAKE.FUN', 1054, 373, 3, C.white, null);

  // ---- desk
  fillRect(0, 470, W, 114, C.desk);
  fillRect(0, 470, W, 8, C.deskTop);

  // ---- plant (left on desk)
  fillEllipse(112, 414, 15, 22, C.leaf);
  fillEllipse(130, 402, 15, 24, C.leaf);
  fillEllipse(148, 414, 15, 22, C.leaf);
  fillRect(102, 436, 56, 34, C.pot);

  // ---- mug
  fillRect(220, 428, 48, 42, C.mug);
  fillCircle(272, 449, 12, C.mug);
  fillCircle(272, 449, 7, C.wallBot);
  thickLine(232, 420, 228, 406, 3, C.white);
  thickLine(252, 420, 256, 406, 3, C.white);

  // ---- keyboard
  fillRect(300, 446, 280, 24, C.keyboard);
  fillRect(308, 452, 264, 3, [58, 58, 68]);
  fillRect(308, 460, 264, 3, [58, 58, 68]);

  // ---- monitor (GTA VI on screen)
  fillRect(380, 326, 284, 144, C.monitor);
  vgrad(394, 340, 256, 116, C.screenTop, C.screenBot);
  fillCircle(522, 420, 24, C.screenSun);
  const mb = [[394, 14], [430, 24], [470, 12], [508, 26], [548, 16], [590, 22], [624, 12]];
  for (const [bx, bh] of mb) fillRect(bx, 456 - bh, 24, bh, C.skyline);
  drawText('GTA VI', 522, 356, 3, C.white, C.black);

  // ---- chair back
  fillRect(716, 390, 168, 80, C.chair);
  fillCircle(800, 390, 84, C.chair);
  fillRect(760, 360, 80, 34, C.chairHi);

  // ---- ghost, sitting in the chair at the desk
  // left arm to controller
  thickLine(716, 420, 668, 466, 34, C.black);
  thickLine(716, 420, 668, 466, 26, C.white);
  // right arm raised with coin
  thickLine(888, 415, 946, 332, 34, C.black);
  thickLine(888, 415, 946, 332, 26, C.white);
  drawGhost(800, 296, 210, 486);
  // hands
  fillCircle(668, 466, 14, C.white);
  fillCircle(946, 332, 14, C.white);
  // magenta coin with white star, held high
  fillCircle(948, 292, 34, C.black);
  fillCircle(948, 292, 30, C.magenta);
  fillPoly(starPoints(948, 292, 16, 7, -Math.PI / 2), C.white);
  // controller on the desk
  fillRect(620, 452, 96, 36, C.controller);
  fillCircle(620, 470, 18, C.controller);
  fillCircle(716, 470, 18, C.controller);
  fillCircle(644, 470, 5, C.btnA);
  fillCircle(660, 470, 5, C.btnB);
  fillRect(686, 466, 16, 4, [90, 90, 100]);
  fillRect(692, 460, 4, 16, [90, 90, 100]);
}

// ---------------------------------------------------------------- PNG out
function crc32(bufIn) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bufIn.length; i++) crc = table[(crc ^ bufIn[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG() {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    buf.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- draw it
fillRect(0, 0, W, 96, C.band);          // top band
fillRect(0, 584, W, 91, C.band);        // bottom band
drawScene();
drawText('GTA 6 LAUNCH DAY', 600, 10, 11, C.white, C.black);
drawTextSegs([{ t: 'SICK LEAVE: ', c: C.white }, { t: '100%', c: C.yellow }], 600, 602, 9, C.black);

const png = encodePNG();
writeFileSync('meme.png', png);
console.log('meme.png written:', png.length, 'bytes');
