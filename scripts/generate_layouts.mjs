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
    // Fill with white default
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
      raw[y * stride] = 0; // Filter None
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

// Generate LSB Layout
function generateLsb() {
  const W = 1200, H = 800;
  const c = new Canvas(W, H);

  // Background: concrete/yard color
  c.fillRect(0, 0, W, H, [238, 242, 246, 255]);
  c.drawGrid(40, [220, 226, 235, 120]);

  // Port / Sea area at the right and top right
  c.fillRect(1000, 0, 200, H, [186, 220, 245, 255]);
  c.fillRect(0, 720, W, 80, [186, 220, 245, 255]);

  // Header Banner
  c.fillRect(20, 15, 1160, 50, [15, 44, 89, 255]);
  c.drawText('PERTAMINA HULU ENERGI WMO', 40, 24, [255, 255, 255], 2);
  c.drawText('LSB SITE PLOT PLAN (LOGISTIC SUPPLY BASE)', 40, 42, [255, 204, 0], 2);
  c.drawText('SHOREBASE & MARINE TERMINAL', 850, 32, [200, 225, 255], 2);

  // Compass
  c.fillRect(1120, 80, 50, 50, [255, 255, 255, 220]);
  c.strokeRect(1120, 80, 50, 50, [15, 44, 89], 2);
  c.drawText('N', 1140, 85, [220, 38, 38], 2);
  c.fillRect(1144, 102, 3, 20, [15, 44, 89]);

  // Standard Zones matching coordinates
  const zones = [
    { code: 'BLD', name: 'BUILDING / OFFICE', pct: [5, 15, 20, 25], color: [254, 240, 138], stroke: [202, 138, 4] },
    { code: 'UTL', name: 'UTILITIES AREA', pct: [25, 10, 25, 15], color: [254, 215, 170], stroke: [234, 88, 12] },
    { code: 'CCR', name: 'PORT CONTROL ROOM', pct: [30, 20, 15, 15], color: [191, 219, 254], stroke: [37, 99, 235] },
    { code: 'GMS', name: 'FUEL METERING', pct: [45, 25, 10, 10], color: [221, 214, 254], stroke: [124, 58, 237] },
    { code: 'PRC', name: 'BUNKERING & CARGO', pct: [50, 15, 35, 50], color: [254, 202, 202], stroke: [220, 38, 38] },
    { code: 'OY', name: 'MAIN OPEN YARD', pct: [25, 40, 50, 35], color: [187, 247, 208], stroke: [22, 163, 74] },
    { code: 'WS', name: 'WORKSHOP / WAREHOUSE', pct: [5, 60, 30, 25], color: [165, 243, 252], stroke: [8, 145, 178] },
    { code: 'NBL', name: 'HAZMAT & CHEMICAL STORE', pct: [60, 50, 20, 20], color: [134, 239, 172], stroke: [21, 128, 61] }
  ];

  for (const z of zones) {
    const x = Math.round(z.pct[0] * W / 100);
    const y = Math.round(z.pct[1] * H / 100);
    const w = Math.round(z.pct[2] * W / 100);
    const h = Math.round(z.pct[3] * H / 100);

    c.fillRect(x, y, w, h, [...z.color, 210]);
    c.strokeRect(x, y, w, h, z.stroke, 3);
    c.fillRect(x + 6, y + 6, 80, 22, [255, 255, 255, 230]);
    c.drawText(z.code, x + 12, y + 10, z.stroke, 2);
    c.drawText(z.name, x + 12, y + 34, [50, 60, 80], 1);
  }

  // Jetty Berths
  c.fillRect(1000, 250, 140, 40, [100, 116, 139]);
  c.drawText('JETTY 1 - BERTH A', 1010, 262, [255, 255, 255], 1);
  c.fillRect(1000, 450, 140, 40, [100, 116, 139]);
  c.drawText('JETTY 2 - BERTH B', 1010, 462, [255, 255, 255], 1);

  return c.toPngBuffer();
}

// Generate East Area Layout
function generateEast() {
  const W = 1200, H = 800;
  const c = new Canvas(W, H);

  // Sea background (Offshore blue)
  c.fillRect(0, 0, W, H, [219, 234, 254, 255]);
  c.drawGrid(40, [191, 219, 254, 150]);

  // Header Banner
  c.fillRect(20, 15, 1160, 50, [15, 44, 89, 255]);
  c.drawText('PERTAMINA HULU ENERGI WMO', 40, 24, [255, 255, 255], 2);
  c.drawText('EAST OFFSHORE FIELD SITE PLOT PLAN', 40, 42, [255, 204, 0], 2);
  c.drawText('JAVA SEA / MADURA STRAIT', 850, 32, [200, 225, 255], 2);

  // Compass
  c.fillRect(1120, 80, 50, 50, [255, 255, 255, 220]);
  c.strokeRect(1120, 80, 50, 50, [15, 44, 89], 2);
  c.drawText('N', 1140, 85, [220, 38, 38], 2);
  c.fillRect(1144, 102, 3, 20, [15, 44, 89]);

  const zones = [
    { code: 'BLD', name: 'LIVING QUARTERS EAST', pct: [5, 15, 20, 25], color: [254, 240, 138], stroke: [202, 138, 4] },
    { code: 'UTL', name: 'POWER & UTILITY PLATFORM', pct: [25, 10, 25, 15], color: [254, 215, 170], stroke: [234, 88, 12] },
    { code: 'CCR', name: 'OFFSHORE CONTROL ROOM', pct: [30, 20, 15, 15], color: [191, 219, 254], stroke: [37, 99, 235] },
    { code: 'GMS', name: 'GAS METERING EAST', pct: [45, 25, 10, 10], color: [221, 214, 254], stroke: [124, 58, 237] },
    { code: 'PRC', name: 'CPP-2 CENTRAL PROCESSING', pct: [50, 15, 35, 50], color: [254, 202, 202], stroke: [220, 38, 38] },
    { code: 'OY', name: 'WELLHEAD COMPLEX (KE-38/39)', pct: [25, 40, 50, 35], color: [187, 247, 208], stroke: [22, 163, 74] },
    { code: 'WS', name: 'WORKSHOP & CRANE DECK', pct: [5, 60, 30, 25], color: [165, 243, 252], stroke: [8, 145, 178] },
    { code: 'NBL', name: 'PLATFORM PHE-12 SUB-AREA', pct: [60, 50, 20, 20], color: [134, 239, 172], stroke: [21, 128, 61] }
  ];

  // Pipeline connections
  c.strokeRect(300, 250, 400, 10, [100, 116, 139], 2);
  c.strokeRect(600, 350, 10, 200, [100, 116, 139], 2);

  for (const z of zones) {
    const x = Math.round(z.pct[0] * W / 100);
    const y = Math.round(z.pct[1] * H / 100);
    const w = Math.round(z.pct[2] * W / 100);
    const h = Math.round(z.pct[3] * H / 100);

    c.fillRect(x, y, w, h, [...z.color, 220]);
    c.strokeRect(x, y, w, h, z.stroke, 3);
    c.fillRect(x + 6, y + 6, 80, 22, [255, 255, 255, 230]);
    c.drawText(z.code, x + 12, y + 10, z.stroke, 2);
    c.drawText(z.name, x + 12, y + 34, [50, 60, 80], 1);
  }

  // Helideck mark
  c.fillRect(100, 180, 60, 60, [255, 255, 255, 200]);
  c.strokeRect(100, 180, 60, 60, [220, 38, 38], 3);
  c.drawText('H', 122, 195, [220, 38, 38], 4);

  return c.toPngBuffer();
}

// Generate West Area Layout
function generateWest() {
  const W = 1200, H = 800;
  const c = new Canvas(W, H);

  // Sea background (Offshore blue)
  c.fillRect(0, 0, W, H, [224, 242, 254, 255]);
  c.drawGrid(40, [186, 230, 253, 150]);

  // Header Banner
  c.fillRect(20, 15, 1160, 50, [15, 44, 89, 255]);
  c.drawText('PERTAMINA HULU ENERGI WMO', 40, 24, [255, 255, 255], 2);
  c.drawText('WEST OFFSHORE FIELD SITE PLOT PLAN', 40, 42, [255, 204, 0], 2);
  c.drawText('JAVA SEA / MADURA STRAIT', 850, 32, [200, 225, 255], 2);

  // Compass
  c.fillRect(1120, 80, 50, 50, [255, 255, 255, 220]);
  c.strokeRect(1120, 80, 50, 50, [15, 44, 89], 2);
  c.drawText('N', 1140, 85, [220, 38, 38], 2);
  c.fillRect(1144, 102, 3, 20, [15, 44, 89]);

  const zones = [
    { code: 'BLD', name: 'LIVING QUARTERS WEST', pct: [5, 15, 20, 25], color: [254, 240, 138], stroke: [202, 138, 4] },
    { code: 'UTL', name: 'COMPRESSION & POWER', pct: [25, 10, 25, 15], color: [254, 215, 170], stroke: [234, 88, 12] },
    { code: 'CCR', name: 'WEST CONTROL ROOM', pct: [30, 20, 15, 15], color: [191, 219, 254], stroke: [37, 99, 235] },
    { code: 'GMS', name: 'WEST GAS METERING', pct: [45, 25, 10, 10], color: [221, 214, 254], stroke: [124, 58, 237] },
    { code: 'PRC', name: 'CPP-1 MAIN PRODUCTION', pct: [50, 15, 35, 50], color: [254, 202, 202], stroke: [220, 38, 38] },
    { code: 'OY', name: 'WELLHEAD COMPLEX (KE-30/32)', pct: [25, 40, 50, 35], color: [187, 247, 208], stroke: [22, 163, 74] },
    { code: 'WS', name: 'MAINTENANCE & CRANE', pct: [5, 60, 30, 25], color: [165, 243, 252], stroke: [8, 145, 178] },
    { code: 'NBL', name: 'PLATFORM PHE-23 / KE-5', pct: [60, 50, 20, 20], color: [134, 239, 172], stroke: [21, 128, 61] }
  ];

  // Bridge / Pipeline
  c.strokeRect(280, 200, 350, 12, [100, 116, 139], 2);
  c.strokeRect(550, 300, 12, 220, [100, 116, 139], 2);

  for (const z of zones) {
    const x = Math.round(z.pct[0] * W / 100);
    const y = Math.round(z.pct[1] * H / 100);
    const w = Math.round(z.pct[2] * W / 100);
    const h = Math.round(z.pct[3] * H / 100);

    c.fillRect(x, y, w, h, [...z.color, 220]);
    c.strokeRect(x, y, w, h, z.stroke, 3);
    c.fillRect(x + 6, y + 6, 80, 22, [255, 255, 255, 230]);
    c.drawText(z.code, x + 12, y + 10, z.stroke, 2);
    c.drawText(z.name, x + 12, y + 34, [50, 60, 80], 1);
  }

  // SPM / Buoy indicator
  c.fillRect(1000, 620, 120, 60, [255, 255, 255, 220]);
  c.strokeRect(1000, 620, 120, 60, [15, 44, 89], 2);
  c.drawText('SPM / FSO', 1015, 635, [15, 44, 89], 2);
  c.drawText('OFFLOADING BUOY', 1015, 658, [100, 116, 139], 1);

  return c.toPngBuffer();
}

const outDir = path.resolve('public/images');
fs.writeFileSync(path.join(outDir, 'layout-lsb.png'), generateLsb());
console.log('Generated layout-lsb.png');
fs.writeFileSync(path.join(outDir, 'layout-east.png'), generateEast());
console.log('Generated layout-east.png');
fs.writeFileSync(path.join(outDir, 'layout-west.png'), generateWest());
console.log('Generated layout-west.png');
