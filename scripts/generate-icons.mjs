import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "icons");

const crcTable = Array.from({ length: 256 }, (_, number) => {
  let value = number;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return chunk;
}

function createIcon(size, maskable = false) {
  const rowSize = size * 4 + 1;
  const pixels = Buffer.alloc(rowSize * size);

  for (let y = 0; y < size; y += 1) {
    pixels[y * rowSize] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = y * rowSize + 1 + x * 4;
      const nx = x / size;
      const ny = y / size;
      const radius = maskable ? 0.5 : 0.44;
      let [red, green, blue] = Math.hypot(nx - 0.5, ny - 0.5) > radius
        ? [245, 242, 235]
        : [45, 90, 39];

      const leafX = nx - 0.5;
      const leafY = ny - 0.48;
      const leaf = ((leafX * 0.82 + leafY * 0.57) ** 2 / 0.19 ** 2)
        + ((leafX * -0.57 + leafY * 0.82) ** 2 / 0.34 ** 2) < 1;
      if (leaf) [red, green, blue] = [181, 214, 161];
      if (Math.abs(nx - (0.43 + 0.18 * ny)) < 0.012 && ny > 0.31 && ny < 0.77) {
        [red, green, blue] = [245, 242, 235];
      }

      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(pixels, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(outputDir, { recursive: true });
for (const [filename, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, false],
]) {
  fs.writeFileSync(path.join(outputDir, filename), createIcon(size, maskable));
}

console.log("Generated PlantCare PWA icons in public/icons");
