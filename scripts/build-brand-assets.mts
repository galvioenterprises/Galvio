/**
 * Generates the favicon, the Apple touch icon and the social share image
 * from the brand artwork.
 *
 *   node scripts/build-brand-assets.mts
 *
 * Run it again if the logo changes. The outputs are committed, because a
 * missing favicon is a visible defect and nobody should have to remember
 * a build step to get one.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const INK = { r: 11, g: 14, b: 20, alpha: 1 };
const APP = resolve("src/app");

/** Pulls the PNG out of the SVG wrapper the logo was supplied in. */
function logoPng(variant: "white" | "dark"): Buffer {
  const svg = readFileSync(`public/images/brand/logo-${variant}.webp`);
  return svg;
}

async function main() {
  const wordmark = await sharp(logoPng("white")).png().toBuffer();
  const meta = await sharp(wordmark).metadata();

  // The leading "G" makes the square mark. A wordmark squeezed into a
  // 32px favicon is an unreadable smudge.
  const glyph = await sharp(wordmark)
    .extract({ left: 0, top: 0, width: meta.height!, height: meta.height! })
    .png()
    .toBuffer();

  for (const [name, size, pad] of [
    ["icon.png", 256, 0.22],
    ["apple-icon.png", 180, 0.18],
  ] as const) {
    const inner = Math.round(size * (1 - pad * 2));
    const mark = await sharp(glyph)
      .resize(inner, inner, { fit: "contain", background: { ...INK, alpha: 0 } })
      .toBuffer();

    await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toFile(resolve(APP, name));
  }

  // Social share card. Anything shared into WhatsApp, which is where this
  // business actually gets shared, renders this.
  const OG = { width: 1200, height: 630 };
  const logoWidth = 420;
  const logo = await sharp(wordmark).resize({ width: logoWidth }).toBuffer();
  const logoMeta = await sharp(logo).metadata();

  const overlay = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}">
      <defs>
        <radialGradient id="glow" cx="78%" cy="38%" r="55%">
          <stop offset="0%" stop-color="#2563eb" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${OG.width}" height="${OG.height}" fill="url(#glow)"/>
      <rect x="90" y="${330}" width="56" height="4" rx="2" fill="#2563eb"/>
      <text x="90" y="400" font-family="system-ui, -apple-system, sans-serif"
            font-size="52" font-weight="600" fill="#ffffff">Upgrade to Better Living</text>
      <text x="90" y="452" font-family="system-ui, -apple-system, sans-serif"
            font-size="26" fill="#a3aab8">Genuine Voltas appliances · Air conditioners,</text>
      <text x="90" y="490" font-family="system-ui, -apple-system, sans-serif"
            font-size="26" fill="#a3aab8">refrigerators and home appliances, direct.</text>
      <text x="90" y="566" font-family="system-ui, -apple-system, sans-serif"
            font-size="24" fill="#6b7280">galvioenterprises.com</text>
    </svg>
  `);

  const og = await sharp({
    create: { width: OG.width, height: OG.height, channels: 4, background: INK },
  })
    .composite([
      { input: overlay, left: 0, top: 0 },
      { input: logo, left: 90, top: 150 - Math.round((logoMeta.height ?? 0) / 2) + 40 },
    ])
    .png()
    .toBuffer();

  writeFileSync(resolve(APP, "opengraph-image.png"), og);
  writeFileSync(resolve(APP, "twitter-image.png"), og);

  console.log("wrote icon.png, apple-icon.png, opengraph-image.png, twitter-image.png");
}

main();
