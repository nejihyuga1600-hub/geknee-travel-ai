import { prisma } from '@/lib/prisma';

/**
 * Normalises a seed string (email prefix or name) into a valid username:
 * lowercase, alphanumeric + underscore/hyphen only, 3–24 chars.
 */
function slugify(seed: string): string {
  return seed
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 24);
}

/**
 * Finds an unused username near `seed`. If `seed` is taken, appends `2`, `3`, …
 * up to a small cap; after that appends a random 4-digit number. Caller is
 * responsible for persisting the returned value.
 */
export async function generateUniqueUsername(seed: string): Promise<string | null> {
  const base = slugify(seed);
  if (base.length < 3) return null;

  // Try bare, then base2…base9, then base1234 random.
  const attempts = [base, ...Array.from({ length: 8 }, (_, i) => `${base}${i + 2}`)];
  for (const candidate of attempts) {
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return null;
}

/**
 * Ensures the user has a username; generates one from email prefix or name if not.
 * Idempotent — safe to call on every sign-in.
 */
export async function ensureUsername(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, email: true, name: true },
  });
  if (!user) return null;
  if (user.username) return user.username;

  const seed = (user.email?.split('@')[0] ?? user.name ?? '').trim();
  if (!seed) return null;

  const chosen = await generateUniqueUsername(seed);
  if (!chosen) return null;

  try {
    await prisma.user.update({ where: { id: userId }, data: { username: chosen } });
    return chosen;
  } catch {
    // Race — someone took it between our check and write. Caller can retry.
    return null;
  }
}
