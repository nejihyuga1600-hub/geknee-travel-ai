// Run once: node scripts/upload-models.mjs
// Uploads all GLB files from public/models/ to Vercel Blob and prints the URL map.
import { put } from '@vercel/blob';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MODELS_DIR = new URL('../public/models', import.meta.url).pathname;

const files = readdirSync(MODELS_DIR).filter(f => f.endsWith('.glb'));
if (!files.length) { console.error('No .glb files found in public/models/'); process.exit(1); }

console.log(`Uploading ${files.length} GLB files to Vercel Blob...\n`);

const urls = {};
for (const file of files) {
  const data = readFileSync(join(MODELS_DIR, file));
  const blob = await put(`models/${file}`, data, {
    access: 'public',
    contentType: 'model/gltf-binary',
    addRandomSuffix: false,
  });
  urls[file] = blob.url;
  console.log(`✓ ${file}\n  ${blob.url}`);
}

console.log('\n// Paste this into LocationClient.tsx BLOB_MODEL_URLS:\n');
console.log('const BLOB_MODEL_URLS: Record<string, string> = ' + JSON.stringify(urls, null, 2) + ';');
