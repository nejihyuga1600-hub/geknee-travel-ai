#!/usr/bin/env node
// bin/meshy-new-skin.mjs
// Generates a new monument skin via Meshy text-to-3D, uploads the refined
// GLB to Vercel Blob under the preview/ prefix, and prints the dev preview URL.
//
// It does NOT touch AVAILABLE_SKINS in LocationClient and does NOT make the
// skin visible to regular users. Run bin/meshy-promote.mjs after reviewing.
//
// Usage:
//   node bin/meshy-new-skin.mjs --mk eiffelTower --style obsidian --prompt "..."
//
// Env:
//   MESHY_API_KEY            (required)
//   BLOB_READ_WRITE_TOKEN    (required — from Vercel)
//   BLOB_BASE                (optional, defaults to the Vercel Blob store base)

import { put } from '@vercel/blob';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import process from 'process';

// ─── config ────────────────────────────────────────────────────────────────────

const MESHY_API = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const POLL_MS   = 10_000;
const MAX_POLLS = 120; // ≤20 minutes total

// Maps monument key → filename prefix (same as MONUMENT_FILE_PREFIX in the client)
const PREFIX = {
  eiffelTower:    'eiffel_tower',
  colosseum:      'Colosseum',
  tajMahal:       'taj_mahal',
  greatWall:      'great_wall',
  statueLiberty:  'statue_liberty',
  sagradaFamilia: 'sagrada_familia',
  machuPicchu:    'machu_picchu',
  christRedeem:   'christ_redeemer',
  angkorWat:      'angkor_wat',
  pyramidGiza:    'pyramid_giza',
  goldenGate:     'golden_gate',
  bigBen:         'big_ben',
  acropolis:      'acropolis',
  sydneyOpera:    'sydney_opera',
  neuschwanstein: 'neuschwanstein',
  stonehenge:     'stonehenge',
  iguazuFalls:    'iguazu_falls',
  tokyoSkytree:   'tokyo_skytree',
  victoriaFalls:  'victoria_falls',
};

// Lowercased display names for prompt templating
const DISPLAY = {
  eiffelTower:    'Eiffel Tower',
  colosseum:      'Colosseum',
  tajMahal:       'Taj Mahal',
  greatWall:      'Great Wall of China',
  statueLiberty:  'Statue of Liberty',
  sagradaFamilia: 'Sagrada Família',
  machuPicchu:    'Machu Picchu',
  christRedeem:   'Christ the Redeemer',
  angkorWat:      'Angkor Wat',
  pyramidGiza:    'Pyramids of Giza',
  goldenGate:     'Golden Gate Bridge',
  bigBen:         'Big Ben',
  acropolis:      'Acropolis Parthenon',
  sydneyOpera:    'Sydney Opera House',
  neuschwanstein: 'Neuschwanstein Castle',
  stonehenge:     'Stonehenge',
  iguazuFalls:    'Iguazu Falls',
  tokyoSkytree:   'Tokyo Skytree',
  victoriaFalls:  'Victoria Falls',
};

// Default material / aesthetic per skin rarity
const SKIN_PROMPT = {
  stone:     'carved from weathered grey granite, detailed chisel marks',
  bronze:    'cast in aged bronze with green patina accents, metallic sheen',
  silver:    'polished silver with reflective chrome highlights',
  gold:      'solid gold with glowing lustrous surface and intricate engraving',
  diamond:   'made of clear diamond with prismatic refraction, crystalline facets',
  aurora:    'iridescent aurora-green holographic surface with northern-lights glow',
  celestial: 'cosmic purple nebula material with star particles, deep space aesthetic',
  obsidian:  'polished black obsidian with subtle red volcanic veins',
};

// ─── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

const args  = parseArgs();
const mk    = args.mk;
const style = args.style;
const promptOverride = args.prompt;

if (!mk || !style) {
  console.error('Usage: node bin/meshy-new-skin.mjs --mk <monument> --style <skin> [--prompt "..."]');
  console.error('monuments:', Object.keys(PREFIX).join(', '));
  console.error('skins:    ', Object.keys(SKIN_PROMPT).join(', '));
  process.exit(1);
}
if (!PREFIX[mk]) { console.error(`Unknown monument: ${mk}`); process.exit(1); }
if (!SKIN_PROMPT[style] && !promptOverride) {
  console.error(`Unknown skin: ${style} — pass --prompt to override`);
  process.exit(1);
}

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const BLOB_TOKEN    = process.env.BLOB_READ_WRITE_TOKEN;
if (!MESHY_API_KEY) { console.error('MESHY_API_KEY missing'); process.exit(1); }
if (!BLOB_TOKEN)    { console.error('BLOB_READ_WRITE_TOKEN missing'); process.exit(1); }

// ─── Meshy client ──────────────────────────────────────────────────────────────

async function meshy(pathName, method = 'GET', body) {
  const res = await fetch(MESHY_API + pathName, {
    method,
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meshy ${method} ${pathName} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function waitForTask(id, label) {
  for (let i = 0; i < MAX_POLLS; i++) {
    const task = await meshy(`/${id}`);
    const { status, progress } = task;
    process.stdout.write(`\r[${label}] ${status} ${progress ?? 0}%          `);
    if (status === 'SUCCEEDED') { process.stdout.write('\n'); return task; }
    if (status === 'FAILED' || status === 'CANCELED') {
      process.stdout.write('\n');
      throw new Error(`Meshy task ${status}: ${JSON.stringify(task.task_error ?? {})}`);
    }
    await new Promise(r => setTimeout(r, POLL_MS));
  }
  throw new Error(`Meshy task ${id} did not complete within ${MAX_POLLS * POLL_MS / 1000}s`);
}

// ─── main ──────────────────────────────────────────────────────────────────────

const monumentName = DISPLAY[mk];
const materialPhrase = promptOverride || `${monumentName}, ${SKIN_PROMPT[style]}, photorealistic, high detail, single centered object on transparent background`;
const prefix = PREFIX[mk];
const blobKey = `models/preview/${prefix}_${style}.glb`;

console.log(`\n→ Generating ${mk}/${style}`);
console.log(`  Prompt: ${materialPhrase}\n`);

// 1) Preview task
console.log('1/3 · Meshy preview task…');
const previewCreate = await meshy('', 'POST', {
  mode: 'preview',
  prompt: materialPhrase,
  art_style: 'realistic',
  should_remesh: true,
});
const previewTaskId = previewCreate.result;
await waitForTask(previewTaskId, 'preview');

// 2) Refine task
console.log('2/3 · Meshy refine task…');
const refineCreate = await meshy('', 'POST', {
  mode: 'refine',
  preview_task_id: previewTaskId,
  enable_pbr: true,
});
const refineTaskId = refineCreate.result;
const refined = await waitForTask(refineTaskId, 'refine');

const glbUrl = refined.model_urls?.glb;
if (!glbUrl) throw new Error('No glb URL on refined task result: ' + JSON.stringify(refined.model_urls));

// 3) Download + upload to Vercel Blob under preview/ prefix
console.log('3/3 · Downloading + uploading to blob…');
const glbRes = await fetch(glbUrl);
if (!glbRes.ok) throw new Error(`Failed to download GLB: ${glbRes.status}`);
const glbBytes = Buffer.from(await glbRes.arrayBuffer());

const uploaded = await put(blobKey, glbBytes, {
  access: 'public',
  contentType: 'model/gltf-binary',
  addRandomSuffix: false,
  allowOverwrite: true,
  token: BLOB_TOKEN,
});

// Log so the promote script knows the source URL
mkdirSync('/tmp/meshy-preview', { recursive: true });
writeFileSync(
  `/tmp/meshy-preview/${prefix}_${style}.json`,
  JSON.stringify({ mk, style, prefix, blobUrl: uploaded.url, generatedAt: new Date().toISOString() }, null, 2),
);

console.log(`\n✓ Uploaded to ${uploaded.url}`);
console.log(`\nPreview on prod:`);
console.log(`  https://www.geknee.com/dev/preview/skin?url=${encodeURIComponent(uploaded.url)}&mk=${mk}&style=${style}&name=${encodeURIComponent(monumentName)}`);
console.log(`\nPreview locally:`);
console.log(`  http://localhost:3000/dev/preview/skin?url=${encodeURIComponent(uploaded.url)}&mk=${mk}&style=${style}&name=${encodeURIComponent(monumentName)}`);
console.log(`\nNext: node bin/meshy-promote.mjs --mk ${mk} --style ${style}   (when you approve it)\n`);
