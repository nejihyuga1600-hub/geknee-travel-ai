// Place-name extraction + image lookup chain.
// Extracted from app/plan/summary/page.tsx as part of the summary-page split.
// `extractPlace` is a pure heuristic over markdown bold runs; `fetchPlaceImage`
// is the Google → Wikidata → Wikipedia → Commons fallback chain that powers
// the inline place image overlays. Module-scoped imgCache survives across
// component re-mounts within the same client session.

const _GENERIC_TERMS = new Set([
  'morning','afternoon','evening','night','breakfast','lunch','dinner','brunch',
  'day','hotel','hostel','accommodation','transport','taxi','bus','train','metro',
  'subway','flight','airport','station','overview','tips','highlights','optional',
  'note','budget','local','traditional','free','time','check','arrive','depart',
  'explore','walk','wander','visit','stop','area','region','neighborhood','district',
  'center','centre','road',
]);
const _FOOD_COMMERCIAL = new Set([
  'banana','ramen','sushi','croissant','baumkuchen','mochi','takoyaki','tempura',
  'tonkatsu','udon','soba','matcha','sake','beer','wine','coffee','tea','cake',
  'cookie','candy','chocolate','snack','sandwich','pizza','pasta','noodle',
  'dumpling','gyoza','onigiri','kebab','burger','taco','curry','pho','crepe',
  'waffle','gelato','souvenir','shop','store','sweets','treats',
]);
const _PLACE_INDICATORS = new Set([
  'temple','shrine','museum','gallery','park','garden','palace','castle',
  'tower','bridge','market','bazaar','quarter','harbor','harbour','beach',
  'lake','river','mountain','hill','street','avenue','square','plaza',
  'cathedral','church','mosque','fort','ruins','monument','memorial','arena',
  'stadium','hall','crossing','viewpoint','waterfall','canyon','valley',
  'island','peninsula','bay','cliff','cave','falls','pagoda','gate',
]);

export function extractPlace(text: string): string | null {
  const bolds = [...text.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim());
  if (!bolds.length) return null;
  function score(name: string): number {
    if (/^[\d:]+\s*[AP]M$/i.test(name)) return -9999;
    if (name.length < 4) return -9999;
    if (!/^[A-Z]/.test(name)) return -9000;
    const lower = name.toLowerCase();
    const words = lower.split(/\s+/);
    if (words.every(w => _GENERIC_TERMS.has(w))) return -8000;
    if (words.some(w => _FOOD_COMMERCIAL.has(w)) || _FOOD_COMMERCIAL.has(lower)) return -7000;
    const hasIndicator = words.some(w => _PLACE_INDICATORS.has(w));
    let s = name.length + words.length * 3;
    if (hasIndicator) s += 60;
    // Single-word names only qualify if they contain a place indicator
    if (words.length === 1 && !hasIndicator) return -500;
    return s;
  }
  const best = bolds.reduce<{ name: string; score: number } | null>((acc, name) => {
    const s = score(name);
    return !acc || s > acc.score ? { name, score: s } : acc;
  }, null);
  // Require score >= 15 (multi-word proper noun) OR >= 65 (has place indicator)
  return best && best.score >= 15 ? best.name : null;
}

// ── Place image — Google Places → Wikidata P18 → Wikipedia → Commons ──────
// '' means "no image found", undefined means "not yet fetched".
export const imgCache = new Map<string, string>();

const _FOOD_DESC_RE = /\b(dish|cuisine|food|recipe|meal|dessert|drink|beverage|cocktail|snack|sauce|bread|cake|soup|noodle|rice dish|pasta)\b/i;

function _landscapeScore(w?: number, h?: number): number {
  if (!w || !h) return 0;
  return w / h;
}

export async function fetchPlaceImage(place: string, city?: string): Promise<string | null> {
  const q = city ? `${place} ${city}` : place;

  // 1. Google Places textsearch → place-photo proxy (best: actual location photos)
  try {
    const sp = new URLSearchParams({ name: place, ...(city ? { location: city } : {}) });
    const r = await fetch(`/api/place-images?${sp}`);
    const d: { images: string[] } = await r.json();
    if (d.images.length > 0) return d.images[0];
  } catch {}

  // 2. Wikidata P18 — canonical exterior/building photo
  try {
    const sp = new URLSearchParams({ action:'wbsearchentities', search: q, language:'en', limit:'3', format:'json', origin:'*' });
    const r = await fetch(`https://www.wikidata.org/w/api.php?${sp}`);
    const d = await r.json();
    for (const entity of (d.search ?? []).slice(0, 3) as {id:string}[]) {
      const r2 = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${entity.id}.json`);
      const d2 = await r2.json();
      const p18 = d2.entities?.[entity.id]?.claims?.P18;
      const filename: string | undefined = p18?.[0]?.mainsnak?.datavalue?.value;
      if (filename) {
        const slug = encodeURIComponent(filename.replace(/\s+/g, '_'));
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${slug}?width=800`;
      }
    }
  } catch {}

  // 2. Wikipedia REST summary — skip if description is food
  try {
    const slug = encodeURIComponent(place.replace(/\s+/g, '_'));
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
    if (r.ok) {
      const d = await r.json();
      const desc: string = d.description ?? '';
      const url: string | null = d.originalimage?.source ?? d.thumbnail?.source ?? null;
      if (url && !_FOOD_DESC_RE.test(desc)) return url;
    }
  } catch {}

  // 3. Wikipedia search (with city context) → top 3 results
  try {
    const p = new URLSearchParams({ action:'query', list:'search', srsearch: q, srlimit:'3', format:'json', origin:'*' });
    const r = await fetch(`https://en.wikipedia.org/w/api.php?${p}`);
    const d = await r.json();
    for (const hit of (d.query?.search ?? []) as {title:string}[]) {
      const slug = encodeURIComponent(hit.title.replace(/\s+/g, '_'));
      const r2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`);
      if (r2.ok) {
        const d2 = await r2.json();
        const desc: string = d2.description ?? '';
        const url: string | null = d2.originalimage?.source ?? d2.thumbnail?.source ?? null;
        if (url && !_FOOD_DESC_RE.test(desc)) return url;
      }
    }
  } catch {}

  // 4. Wikimedia Commons — search with exterior/location bias, prefer landscape images
  try {
    const searchTerm = `${q} (exterior OR building OR street OR entrance OR facade OR view)`;
    const p = new URLSearchParams({
      action:'query', generator:'search', gsrsearch: searchTerm,
      gsrnamespace:'6', gsrlimit:'12', prop:'imageinfo', iiprop:'url|mime|size',
      format:'json', origin:'*',
    });
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${p}`);
    const d = await r.json();
    type PageInfo = { imageinfo?: { url: string; mime: string; width?: number; height?: number }[] };
    const pages = (Object.values(d.query?.pages ?? {}) as PageInfo[])
      .filter(pg => {
        const info = pg.imageinfo?.[0];
        return info && info.mime.startsWith('image/') && !info.url.endsWith('.svg');
      })
      .sort((a, b) =>
        _landscapeScore(b.imageinfo![0].width, b.imageinfo![0].height) -
        _landscapeScore(a.imageinfo![0].width, a.imageinfo![0].height)
      );
    if (pages.length > 0) return pages[0].imageinfo![0].url;
  } catch {}

  return null;
}
