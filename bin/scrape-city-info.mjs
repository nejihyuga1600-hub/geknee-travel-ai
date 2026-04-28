#!/usr/bin/env node
// Pre-fetches Wikipedia image + fact for every city in the GeoNames dataset
// (or a top-N subset by population). Output → public/data/city-info.json.
//
// Usage:
//   node bin/scrape-city-info.mjs              # top 500 by population
//   node bin/scrape-city-info.mjs 2000         # top 2000
//   node bin/scrape-city-info.mjs all          # everything (~33K, ~9hr)
//   node bin/scrape-city-info.mjs 2000 --resume   # skip cities already cached
//
// Rate-limited at 1.2s/request to stay polite with Wikipedia. Same disambig +
// geosearch + image-filter logic as the runtime wikiSummary in landmark.tsx,
// but lifted into Node so we can run it once and cache.

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const SRC  = path.join(ROOT, "public/data/cities-geonames-15k.json");
const OUT  = path.join(ROOT, "public/data/city-info.json");

const RATE_MS = 1200; // ~50 reqs/min — Wikipedia's polite floor.

const COUNTRY_NAME = {
  BR: "Brazil", AR: "Argentina", CL: "Chile", PE: "Peru", CO: "Colombia",
  VE: "Venezuela", BO: "Bolivia", EC: "Ecuador", PY: "Paraguay", UY: "Uruguay",
  MX: "Mexico", US: "United States", CA: "Canada",
  IN: "India", CN: "China", JP: "Japan", ID: "Indonesia", PH: "Philippines",
  RU: "Russia", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain",
  GB: "United Kingdom", NG: "Nigeria", EG: "Egypt", ZA: "South Africa",
  TR: "Turkey", IR: "Iran", PK: "Pakistan", BD: "Bangladesh", VN: "Vietnam",
  TH: "Thailand", MY: "Malaysia", KR: "South Korea", PL: "Poland", UA: "Ukraine",
  KE: "Kenya", ET: "Ethiopia", MA: "Morocco", DZ: "Algeria", SA: "Saudi Arabia",
};

// Reject locator maps / coats of arms / flags. Broader than the runtime regex
// because we have time to check more carefully here.
function looksLikeMapOrCrest(url) {
  const lower = url.toLowerCase();
  if (lower.endsWith(".svg.png")) return true; // Wikipedia's SVG renders
  if (/(coat[_-]of[_-]arms|brasao|brasão|escudo|wappen|blason|flag[_-]of|bandeira|bandera)/i.test(lower)) return true;
  if (/(location[_-]of|localizacao|localización|locator|locality|map[_-]of|mapa[_-]de|locator-map)/i.test(lower)) return true;
  if (/(_in_[a-z][a-z]_|realregion|_district_map|district_map_of|state_loc|_admin_)/i.test(lower)) return true;
  if (/(_mun_|municipio[_-]|comuna[_-]|paroquia[_-])/i.test(lower)) return true;
  if (/(brazil_|brasil_).*\.svg/i.test(lower) && !lower.includes("photo") && !lower.includes("city")) return true;
  return false;
}

// Skip dry stat sentences — population, area, density, code numbers.
function looksLikeStatLine(s) {
  const lower = s.toLowerCase();
  if (/^its (population|area|density)/i.test(lower)) return true;
  if (/^the (population|area|density)/i.test(lower)) return true;
  if (/(^| )population (was|of|is) /i.test(lower)) return true;
  if (/^postal code/i.test(lower)) return true;
  if (/^as of \d+ census/i.test(lower)) return true;
  return false;
}

function pickBestFact(extract) {
  const sentences = (extract.match(/[^.!?]+[.!?]+/g) ?? []).map(s => s.trim()).filter(Boolean);
  if (!sentences.length) return extract.slice(0, 200);
  // Prefer the FIRST non-stat sentence — usually the descriptive opener.
  const meaty = sentences.find(s => !looksLikeStatLine(s));
  const pick = meaty ?? sentences[0];
  return pick.length > 220 ? pick.slice(0, 217) + "…" : pick;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function rawWiki(title, thumbPx = 800) {
  const t = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${t}&redirects&prop=pageimages|extracts|description&pithumbsize=${thumbPx}&exintro&explaintext&format=json&origin=*`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "geknee-city-scraper/1.0 (+https://geknee.com)" } });
    if (!r.ok) return null;
    const d = await r.json();
    const page = Object.values(d.query.pages)[0];
    if (!page || page.missing != null) return null;
    const raw = page.thumbnail?.source ?? null;
    const img = raw && !looksLikeMapOrCrest(raw) ? raw : null;
    const extract = page.extract ?? "";
    const isDisambig = /\bmay refer to:?\s*$/i.test(extract.split("\n")[0]?.trim() ?? "");
    return { img, extract, description: page.description ?? "", isDisambig };
  } catch {
    return null;
  }
}

async function geosearch(name, lat, lon, radiusM = 10000) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lon}&gsradius=${radiusM}&gslimit=10&format=json&origin=*`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "geknee-city-scraper/1.0 (+https://geknee.com)" } });
    if (!r.ok) return null;
    const d = await r.json();
    const hits = (d?.query?.geosearch ?? []).map(h => ({ title: h.title, dist: h.dist }));
    if (!hits.length) return null;
    const NON = /\b(river|stream|mountain|peak|lake|reservoir|forest|park|reserve|island|bay|cape|gulf|strait|hill|valley|airport|station|tributary)\b/i;
    const settled = hits.filter(h => !NON.test(h.title));
    const lower = name.toLowerCase();
    const t1 = settled.find(h => { const t = h.title.toLowerCase(); return t.includes(lower) && (t.includes("(") || t.includes(",")); });
    if (t1) return t1.title;
    const t2 = settled.find(h => h.title.toLowerCase().includes(lower));
    if (t2) return t2.title;
    return settled[0]?.title ?? hits[0].title;
  } catch { return null; }
}

async function fetchCityInfo(name, lat, lon, country) {
  // Stage 1: bare name
  let r = await rawWiki(name);
  if (r && r.extract && !r.isDisambig && r.img) {
    return { img: r.img, fact: pickBestFact(r.extract) };
  }
  // Save the bare-name extract for fallback (might still have a real fact)
  let bestExtract = r && r.extract && !r.isDisambig ? r.extract : null;
  let bestImg = r?.img ?? null;
  await sleep(RATE_MS);

  // Stage 2: name, country
  const cName = COUNTRY_NAME[country];
  if (cName) {
    const r2 = await rawWiki(`${name}, ${cName}`);
    if (r2 && r2.extract && !r2.isDisambig) {
      if (r2.img) return { img: r2.img, fact: pickBestFact(r2.extract) };
      if (!bestExtract) bestExtract = r2.extract;
      if (!bestImg) bestImg = r2.img;
    }
    await sleep(RATE_MS);
  }

  // Stage 3: geosearch
  const nearTitle = await geosearch(name, lat, lon);
  if (nearTitle && nearTitle.toLowerCase() !== name.toLowerCase()) {
    await sleep(RATE_MS);
    const r3 = await rawWiki(nearTitle);
    if (r3 && r3.extract && !r3.isDisambig) {
      const img = r3.img || bestImg;
      const fact = pickBestFact(r3.extract);
      return { img, fact };
    }
  }

  return {
    img: bestImg,
    fact: bestExtract ? pickBestFact(bestExtract) : "",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] === "all" ? Infinity : (parseInt(args[0], 10) || 500);
  const resume = args.includes("--resume");

  const cities = JSON.parse(await fs.readFile(SRC, "utf8"));
  cities.sort((a, b) => (b.p ?? 0) - (a.p ?? 0));
  const target = cities.slice(0, limit);

  let cache = {};
  if (resume) {
    try { cache = JSON.parse(await fs.readFile(OUT, "utf8")); } catch {}
    console.log(`Resuming with ${Object.keys(cache).length} cached entries`);
  }

  const start = Date.now();
  let done = 0, hits = 0, misses = 0;
  for (const c of target) {
    const key = `${c.n}|${c.lat.toFixed(2)}|${c.lon.toFixed(2)}`;
    if (resume && cache[key]) { done++; continue; }
    const info = await fetchCityInfo(c.n, c.lat, c.lon, c.c);
    cache[key] = { n: c.n, img: info.img, fact: info.fact };
    if (info.img || info.fact) hits++;
    else misses++;
    done++;
    if (done % 25 === 0) {
      const mins = ((Date.now() - start) / 60000).toFixed(1);
      console.log(`[${done}/${target.length}] ${c.n} (${c.c}) — hits ${hits}, misses ${misses}, elapsed ${mins}m`);
      await fs.writeFile(OUT, JSON.stringify(cache));
    }
    await sleep(RATE_MS);
  }
  await fs.writeFile(OUT, JSON.stringify(cache));
  const mins = ((Date.now() - start) / 60000).toFixed(1);
  console.log(`Done — ${done} cities, ${hits} hits, ${misses} misses in ${mins}m → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
