import sharp from "sharp";
import { readFile } from "node:fs/promises";
import path from "node:path";

const iconsDir = path.resolve("public/icons");

const jobs = [
  { svg: "icon-192.svg", png: "icon-192.png", size: 192 },
  { svg: "icon-512.svg", png: "icon-512.png", size: 512 },
  { svg: "icon-maskable.svg", png: "icon-maskable.png", size: 512 },
];

for (const { svg, png, size } of jobs) {
  const input = await readFile(path.join(iconsDir, svg));
  await sharp(input, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, png));
  console.log(`wrote ${png} (${size}x${size})`);
}
