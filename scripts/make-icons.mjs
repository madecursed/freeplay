// Генерирует PNG-иконки без зависимостей: тёмный фон + градиентный круг с «нотой».
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };

function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, dx = u - 0.5, dy = v - 0.5;
      let r = 15, g = 15, b = 20;
      if (dx * dx + dy * dy < 0.36 * 0.36) { r = 120 + 120 * u; g = 60; b = 255 - 100 * v; }
      // нота: ножка + головка
      const stem = u > 0.54 && u < 0.6 && v > 0.28 && v < 0.64;
      const head = (u - 0.49) ** 2 / 0.0064 + (v - 0.66) ** 2 / 0.0036 < 1;
      const flag = u > 0.54 && u < 0.7 && v > 0.28 && v < 0.34;
      if (stem || head || flag) { r = g = b = 255; }
      const i = y * (size * 3 + 1) + 1 + x * 3; raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const s of [180, 192, 512]) writeFileSync(new URL(`../public/icon-${s}.png`, import.meta.url), png(s));
console.log('icons ok');
