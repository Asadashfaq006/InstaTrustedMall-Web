/**
 * Convert SVG icon to PNG (256x256) and ICO for Electron Builder.
 * Usage: node scripts/generate-icon.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'src', 'assets', 'images', 'instamallicon.svg');
const OUT_DIR = path.join(__dirname, '..', 'build');

// Ensure build folder exists
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function generatePNGs() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  // Generate multiple sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const png = await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: png });
  }

  // Save 256x256 PNG (used by electron-builder as fallback)
  const png256 = pngBuffers.find(p => p.size === 256).buffer;
  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), png256);
  console.log('  icon.png (256x256)');

  // Build ICO file manually (ICO format spec)
  const icoBuffer = buildIco(pngBuffers.map(p => p.buffer));
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), icoBuffer);
  console.log('  icon.ico (' + sizes.join(', ') + ')');

  // Also save a 512x512 for good measure
  const png512 = await sharp(svgBuffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, 'icon512.png'), png512);
  console.log('  icon512.png (512x512)');

  console.log('\nAll icons saved to build/');
}

/**
 * Build a multi-size ICO file from an array of PNG buffers.
 */
function buildIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  let dataOffset = headerSize + dirSize;

  // ICO Header: reserved(2) + type(2) + count(2)
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);          // Reserved
  header.writeUInt16LE(1, 2);          // Type: 1 = ICO
  header.writeUInt16LE(numImages, 4);  // Number of images

  const dirEntries = [];
  const imageDataParts = [];

  for (let i = 0; i < numImages; i++) {
    const pngBuf = pngBuffers[i];
    // Read PNG header to get dimensions
    // PNG width at offset 16 (4 bytes BE), height at offset 20 (4 bytes BE)
    const width = pngBuf.readUInt32BE(16);
    const height = pngBuf.readUInt32BE(20);

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);    // Width (0 means 256)
    entry.writeUInt8(height >= 256 ? 0 : height, 1);   // Height (0 means 256)
    entry.writeUInt8(0, 2);                             // Color palette
    entry.writeUInt8(0, 3);                             // Reserved
    entry.writeUInt16LE(1, 4);                          // Color planes
    entry.writeUInt16LE(32, 6);                         // Bits per pixel
    entry.writeUInt32LE(pngBuf.length, 8);              // Image data size
    entry.writeUInt32LE(dataOffset, 12);                // Offset to image data

    dirEntries.push(entry);
    imageDataParts.push(pngBuf);
    dataOffset += pngBuf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageDataParts]);
}

generatePNGs().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
