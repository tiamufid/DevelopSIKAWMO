import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const FONT_5X7 = {
  'A': [0x0C,0x12,0x12,0x1E,0x12,0x12,0x12],
  'B': [0x1C,0x12,0x12,0x1C,0x12,0x12,0x1C],
  'C': [0x0E,0x10,0x10,0x10,0x10,0x10,0x0E],
  'D': [0x1C,0x12,0x12,0x12,0x12,0x12,0x1C],
  'E': [0x1E,0x10,0x10,0x1C,0x10,0x10,0x1E],
  'F': [0x1E,0x10,0x10,0x1C,0x10,0x10,0x10],
  'G': [0x0E,0x10,0x10,0x16,0x12,0x12,0x0E],
  'H': [0x12,0x12,0x12,0x1E,0x12,0x12,0x12],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x02,0x02,0x02,0x02,0x12,0x12,0x0C],
  'K': [0x12,0x14,0x18,0x1C,0x18,0x14,0x12],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1E],
  'M': [0x11,0x1B,0x15,0x11,0x11,0x11,0x11],
  'N': [0x12,0x16,0x16,0x1A,0x1A,0x12,0x12],
  'O': [0x0C,0x12,0x12,0x12,0x12,0x12,0x0C],
  'P': [0x1C,0x12,0x12,0x1C,0x10,0x10,0x10],
  'Q': [0x0C,0x12,0x12,0x12,0x16,0x12,0x0D],
  'R': [0x1C,0x12,0x12,0x1C,0x14,0x12,0x12],
  'S': [0x0E,0x10,0x10,0x0C,0x02,0x02,0x1C],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x12,0x12,0x12,0x12,0x12,0x12,0x0C],
  'V': [0x11,0x11,0x11,0x0A,0x0A,0x04,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
  'X': [0x11,0x0A,0x04,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
  'Z': [0x1F,0x02,0x04,0x08,0x10,0x10,0x1F],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x06,0x08,0x10,0x1F],
  '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
  '_': [0x00,0x00,0x00,0x00,0x00,0x00,0x1F],
  ':': [0x00,0x04,0x00,0x00,0x04,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x06,0x06],
  '/': [0x01,0x02,0x04,0x08,0x10,0x00,0x00],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
  ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00]
};

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buf = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      this.buf[i * 4] = 255;
      this.buf[i * 4 + 1] = 255;
      this.buf[i * 4 + 2] = 255;
      this.buf[i * 4 + 3] = 255;
    }
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    if (a === 255) {
      this.buf[idx] = r;
      this.buf[idx + 1] = g;
      this.buf[idx + 2] = b;
      this.buf[idx + 3] = 255;
    } else {
      const alpha = a / 255;
      const inv = 1 - alpha;
      this.buf[idx] = Math.round(r * alpha + this.buf[idx] * inv);
      this.buf[idx + 1] = Math.round(g * alpha + this.buf[idx + 1] * inv);
      this.buf[idx + 2] = Math.round(b * alpha + this.buf[idx + 2] * inv);
      this.buf[idx + 3] = 255;
    }
  }

  fillRect(x, y, w, h, [r, g, b, a = 255]) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.floor(x + w));
    const y1 = Math.min(this.height, Math.floor(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.setPixel(px, py, r, g, b, a);
      }
    }
  }

  strokeRect(x, y, w, h, [r, g, b, a = 255], lineWidth = 2) {
    this.fillRect(x, y, w, lineWidth, [r, g, b, a]);
    this.fillRect(x, y + h - lineWidth, w, lineWidth, [r, g, b, a]);
    this.fillRect(x, y, lineWidth, h, [r, g, b, a]);
    this.fillRect(x + w - lineWidth, y, lineWidth, h, [r, g, b, a]);
  }

  drawGrid(spacing, color) {
    for (let x = 0; x < this.width; x += spacing) {
      this.fillRect(x, 0, 1, this.height, color);
    }
    for (let y = 0; y < this.height; y += spacing) {
      this.fillRect(0, y, this.width, 1, color);
    }
  }

  drawText(text, startX, startY, [r, g, b, a = 255], scale = 2) {
    let curX = Math.floor(startX);
    const upper = String(text).toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      const ch = upper[i];
      const glyph = FONT_5X7[ch] || FONT_5X7[' '];
      for (let row = 0; row < 7; row++) {
        const bits = glyph[row];
        for (let col = 0; col < 5; col++) {
          if ((bits >> (4 - col)) & 1) {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                this.setPixel(curX + col * scale + sx, startY + row * scale + sy, r, g, b, a);
              }
            }
          }
        }
      }
      curX += 6 * scale;
    }
  }

  toPngBuffer() {
    const stride = this.width * 4 + 1;
    const raw = Buffer.alloc(stride * this.height);
    for (let y = 0; y < this.height; y++) {
      raw[y * stride] = 0;
      const srcIdx = y * this.width * 4;
      this.buf.copy(raw, y * stride + 1, srcIdx, srcIdx + this.width * 4);
    }

    function crc32(buf) {
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
          crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
        }
      }
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function chunk(type, data) {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(data.length, 0);
      const t = Buffer.from(type, 'ascii');
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
      return Buffer.concat([len, t, data, crcBuf]);
    }

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const compressed = zlib.deflateSync(raw, { level: 6 });
    return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
  }
}

function generateLayoutImage({ areaTitle, facilityTitle, deckTitle, subInfo, zones = [] }) {
  const W = 1200, H = 800;
  const c = new Canvas(W, H);

  // Background
  const isOffshore = areaTitle.includes('WEST') || areaTitle.includes('EAST') || areaTitle.includes('FSO');
  if (isOffshore) {
    c.fillRect(0, 0, W, H, [226, 238, 250, 255]); // Water / marine background
    c.drawGrid(40, [200, 220, 240, 150]);
  } else {
    c.fillRect(0, 0, W, H, [243, 244, 246, 255]); // Onshore / yard
    c.drawGrid(40, [229, 231, 235, 180]);
  }

  // Header Banner
  c.fillRect(20, 15, 1160, 52, [15, 44, 89, 255]);
  c.drawText('PERTAMINA HULU ENERGI WMO', 40, 23, [255, 255, 255], 2);
  c.drawText(`${areaTitle} - ${facilityTitle}`, 40, 43, [255, 204, 0], 2);
  c.drawText(deckTitle, 800, 28, [255, 255, 255], 3);
  c.drawText(subInfo || 'SITE PLOT PLAN', 800, 48, [180, 210, 255], 1);

  // Compass
  c.fillRect(1115, 80, 55, 55, [255, 255, 255, 230]);
  c.strokeRect(1115, 80, 55, 55, [15, 44, 89], 2);
  c.drawText('N', 1137, 85, [220, 38, 38], 2);
  c.fillRect(1142, 102, 2, 22, [15, 44, 89]);

  // Main Platform / Facility Deck Boundary
  const deckX = 60, deckY = 90, deckW = 1080, deckH = 680;
  c.fillRect(deckX, deckY, deckW, deckH, [255, 255, 255, 240]);
  c.strokeRect(deckX, deckY, deckW, deckH, [71, 85, 105], 3);

  // Deck Sub-grid & Walkway outlines
  c.strokeRect(deckX + 40, deckY + 40, deckW - 80, deckH - 80, [203, 213, 225], 1);

  // Render zones
  const defaultZones = [
    { code: 'BLD', name: 'OFFICE / CONTROL / CABIN', pct: [10, 16, 20, 25], color: [254, 240, 138], stroke: [202, 138, 4] },
    { code: 'UTL', name: 'UTILITIES & GENERATOR', pct: [33, 16, 20, 22], color: [254, 215, 170], stroke: [234, 88, 12] },
    { code: 'CCR', name: 'LOCAL CONTROL ROOM', pct: [56, 16, 16, 18], color: [191, 219, 254], stroke: [37, 99, 235] },
    { code: 'GMS', name: 'METERING / MANIFOLD', pct: [75, 16, 15, 20], color: [221, 214, 254], stroke: [124, 58, 237] },
    { code: 'PRC', name: 'PROCESSING / PRODUCTION', pct: [52, 40, 38, 40], color: [254, 202, 202], stroke: [220, 38, 38] },
    { code: 'OY', name: 'MAIN DECK AREA / YARD', pct: [28, 42, 22, 38], color: [187, 247, 208], stroke: [22, 163, 74] },
    { code: 'WS', name: 'WORKSHOP / TOOLS STORE', pct: [10, 48, 16, 32], color: [165, 243, 252], stroke: [8, 145, 178] },
    { code: 'NBL', name: 'STAGING & CHEMICAL STORE', pct: [72, 62, 18, 18], color: [134, 239, 172], stroke: [21, 128, 61] }
  ];

  const activeZones = zones.length > 0 ? zones : defaultZones;

  for (const z of activeZones) {
    const x = Math.round(z.pct[0] * W / 100);
    const y = Math.round(z.pct[1] * H / 100);
    const w = Math.round(z.pct[2] * W / 100);
    const h = Math.round(z.pct[3] * H / 100);

    c.fillRect(x, y, w, h, [...z.color, 215]);
    c.strokeRect(x, y, w, h, z.stroke, 2);
    c.fillRect(x + 5, y + 5, 60, 20, [255, 255, 255, 235]);
    c.drawText(z.code, x + 10, y + 8, z.stroke, 2);
    c.drawText(z.name, x + 8, y + 28, [50, 60, 80], 1);
  }

  // Safety Muster Point & Helideck (if applicable)
  c.fillRect(deckX + deckW - 140, deckY + 30, 90, 40, [22, 163, 74]);
  c.drawText('MUSTER POINT', deckX + deckW - 135, deckY + 45, [255, 255, 255], 1);

  if (deckTitle.includes('MAIN') || deckTitle.includes('FLOOR') || facilityTitle.includes('LQ') || facilityTitle.includes('PPP')) {
    c.fillRect(deckX + 30, deckY + deckH - 90, 80, 70, [255, 255, 255, 230]);
    c.strokeRect(deckX + 30, deckY + deckH - 90, 80, 70, [220, 38, 38], 3);
    c.drawText('H', deckX + 60, deckY + deckH - 72, [220, 38, 38], 4);
    c.drawText('HELIDECK', deckX + 45, deckY + deckH - 30, [15, 44, 89], 1);
  }

  return c.toPngBuffer();
}

const layoutsToGenerate = [
  // 1. ORF
  {
    path: 'orf/layout.png',
    areaTitle: 'ORF',
    facilityTitle: 'ORF ONSHORE RECEIVING FACILITY',
    deckTitle: 'MAIN LAYOUT',
    subInfo: 'MADURA SHORE RECEPTION PLANT'
  },
  // 2. WEST
  // a. LQ
  {
    path: 'west/lq/layout.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'LQ (LIVING QUARTERS)',
    deckTitle: 'ACCOMMODATION LAYOUT',
    subInfo: 'WEST COMPLEX ACCOMMODATION'
  },
  // b. CPP 1 (3 layout)
  {
    path: 'west/cpp1/main-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 1 PLATFORM',
    deckTitle: 'MAIN DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 1'
  },
  {
    path: 'west/cpp1/cellar-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 1 PLATFORM',
    deckTitle: 'CELLAR DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 1'
  },
  {
    path: 'west/cpp1/sub-cellar-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 1 PLATFORM',
    deckTitle: 'SUB CELLAR DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 1'
  },
  // c. CPP 2 (3 layout)
  {
    path: 'west/cpp2/main-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 2 PLATFORM',
    deckTitle: 'MAIN DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 2'
  },
  {
    path: 'west/cpp2/cellar-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 2 PLATFORM',
    deckTitle: 'CELLAR DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 2'
  },
  {
    path: 'west/cpp2/sub-cellar-deck.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'CPP 2 PLATFORM',
    deckTitle: 'SUB CELLAR DECK',
    subInfo: 'CENTRAL PROCESSING PLATFORM 2'
  },
  // d. NUI (8 layout)
  {
    path: 'west/nui/phe12.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-12',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe24.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-24',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe32.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-32',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe40.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-40',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe38a.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-38A',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe38b.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-38B',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe39.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-39',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'west/nui/phe54.png',
    areaTitle: 'WEST AREA',
    facilityTitle: 'NUI PHE-54',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },

  // 3. EAST
  // a. PPP (3 layout)
  {
    path: 'east/ppp/main-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'PPP PLATFORM',
    deckTitle: 'MAIN DECK',
    subInfo: 'POLENG PROCESSING PLATFORM'
  },
  {
    path: 'east/ppp/cellar-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'PPP PLATFORM',
    deckTitle: 'CELLAR DECK',
    subInfo: 'POLENG PROCESSING PLATFORM'
  },
  {
    path: 'east/ppp/sub-cellar-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'PPP PLATFORM',
    deckTitle: 'SUB CELLAR DECK',
    subInfo: 'POLENG PROCESSING PLATFORM'
  },
  // b. AW (3 layout)
  {
    path: 'east/aw/main-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'AW PLATFORM',
    deckTitle: 'MAIN DECK',
    subInfo: 'AW PLATFORM FACILITY'
  },
  {
    path: 'east/aw/cellar-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'AW PLATFORM',
    deckTitle: 'CELLAR DECK',
    subInfo: 'AW PLATFORM FACILITY'
  },
  {
    path: 'east/aw/sub-cellar-deck.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'AW PLATFORM',
    deckTitle: 'SUB CELLAR DECK',
    subInfo: 'AW PLATFORM FACILITY'
  },
  // c. NUI (2 layout)
  {
    path: 'east/nui/phe12.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'NUI PHE-12',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },
  {
    path: 'east/nui/phe30.png',
    areaTitle: 'EAST AREA',
    facilityTitle: 'NUI PHE-30',
    deckTitle: 'PLATFORM LAYOUT',
    subInfo: 'NORMALLY UNATTENDED INSTALLATION'
  },

  // 4. FSO Abherka (4 layout)
  {
    path: 'fso/tank-plan.png',
    areaTitle: 'FSO ABHERKA',
    facilityTitle: 'VESSEL STORAGE',
    deckTitle: 'TANK PLAN',
    subInfo: 'FLOATING STORAGE & OFFLOADING'
  },
  {
    path: 'fso/main-floor.png',
    areaTitle: 'FSO ABHERKA',
    facilityTitle: 'VESSEL TOP DECK',
    deckTitle: 'MAIN FLOOR',
    subInfo: 'FLOATING STORAGE & OFFLOADING'
  },
  {
    path: 'fso/lower-engine-plant.png',
    areaTitle: 'FSO ABHERKA',
    facilityTitle: 'PROPULSION & POWER',
    deckTitle: 'LOWER ENGINE PLANT',
    subInfo: 'FLOATING STORAGE & OFFLOADING'
  },
  {
    path: 'fso/upper-engine-plant.png',
    areaTitle: 'FSO ABHERKA',
    facilityTitle: 'AUXILIARY SYSTEMS',
    deckTitle: 'UPPER ENGINE PLANT',
    subInfo: 'FLOATING STORAGE & OFFLOADING'
  },

  // 5. LSB (1 layout)
  {
    path: 'lsb/layout.png',
    areaTitle: 'LSB AREA',
    facilityTitle: 'LOGISTIC SUPPLY BASE',
    deckTitle: 'SHOREBASE LAYOUT',
    subInfo: 'PORT & WAREHOUSE TERMINAL'
  }
];

const baseDir = path.resolve('public/images/layouts');

for (const item of layoutsToGenerate) {
  const targetPath = path.join(baseDir, item.path);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // If it's ORF and public/images/layout-orf.png exists, copy the original file
  if (item.path === 'orf/layout.png' && fs.existsSync(path.resolve('public/images/layout-orf.png'))) {
    fs.copyFileSync(path.resolve('public/images/layout-orf.png'), targetPath);
    console.log(`Copied original layout-orf.png -> ${item.path}`);
    continue;
  }

  // If it's LSB and public/images/layout-lsb.png exists, copy
  if (item.path === 'lsb/layout.png' && fs.existsSync(path.resolve('public/images/layout-lsb.png'))) {
    fs.copyFileSync(path.resolve('public/images/layout-lsb.png'), targetPath);
    console.log(`Copied layout-lsb.png -> ${item.path}`);
    continue;
  }

  const pngBuf = generateLayoutImage(item);
  fs.writeFileSync(targetPath, pngBuf);
  console.log(`Generated ${item.path}`);
}

console.log(`\nSuccessfully created all ${layoutsToGenerate.length} layouts in ${baseDir}!`);
