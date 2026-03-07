/**
 * Image format converters using Sharp (server-side)
 */
import sharp from "sharp";

export async function imageToPng(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).png().toBuffer();
}

export async function imageToJpeg(buffer: Buffer, quality = 90): Promise<Buffer> {
  return sharp(buffer).jpeg({ quality }).toBuffer();
}

export async function pngToSvg(_buffer: Buffer): Promise<string> {
  // Sharp does not support PNG→SVG natively.
  // Return a SVG wrapper that embeds the PNG as a data URI.
  const pngBase64 = _buffer.toString("base64");
  const meta = await sharp(_buffer).metadata();
  const w = meta.width ?? 800;
  const h = meta.height ?? 600;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <image href="data:image/png;base64,${pngBase64}" width="${w}" height="${h}"/>
</svg>`;
}

export async function svgToPng(svgBuffer: Buffer): Promise<Buffer> {
  return sharp(svgBuffer, { density: 150 }).png().toBuffer();
}
