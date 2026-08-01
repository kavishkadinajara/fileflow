// Regenerates docs/demofiles/sample.wav — the input for the client-side
// FFmpeg.wasm demo leg (WAV → MP3) in docs/FinalViva/06_Full_Feature_Demo.md.
//
//   node scripts/make-demo-wav.mjs
//
// Deliberately 4 seconds: long enough to hear that the conversion worked, short
// enough that the demo takes 20 seconds rather than two minutes. Written by hand
// as PCM + a RIFF header so it needs no encoder on the machine.
import fs from "node:fs";
import path from "node:path";

const RATE = 44100;
const SECONDS = 4;
const N = RATE * SECONDS;

// A major arpeggio up and back down — obviously music, not a test buzz.
const NOTES = [440, 554.37, 659.25, 880, 659.25, 554.37, 440, 330];
const noteLen = N / NOTES.length;

const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const t = i / RATE;
  const inNote = (i % noteLen) / noteLen;
  const f = NOTES[Math.min(NOTES.length - 1, Math.floor(i / noteLen))];

  // Fast attack, exponential decay — keeps it from sounding like a sine test tone.
  const env = Math.min(1, inNote * 40) * Math.exp(-3.2 * inNote);
  const wave =
    Math.sin(2 * Math.PI * f * t) * 0.6 +
    Math.sin(2 * Math.PI * f * 2 * t) * 0.25 +
    Math.sin(2 * Math.PI * f * 3 * t) * 0.1;

  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(wave * env * 11000))), i * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);       // fmt chunk size
header.writeUInt16LE(1, 20);        // PCM
header.writeUInt16LE(1, 22);        // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32);        // block align
header.writeUInt16LE(16, 34);       // bits per sample
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);

const out = process.argv[2] ?? path.join("docs", "demofiles", "sample.wav");
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`✓ ${out} — ${(fs.statSync(out).size / 1024).toFixed(0)} KB, ${SECONDS}s`);
