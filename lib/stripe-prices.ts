import Stripe from 'stripe';

export type PriceDisplay = {
  amount: string;   // e.g. "$5"
  sub: string;      // e.g. "/ month"
  raw: number;      // cents (5 for $0.05? no — integer dollars * 100)
  currency: string; // e.g. "usd"
  interval: 'month' | 'year';
};

type FetchResult = {
  monthly: PriceDisplay | null;
  yearly: PriceDisplay | null;
  savingsPct: number | null; // e.g. 27
};

const CURRENCY_SYMBOL: Record<string, string> = {
  usd: '$', eur: '€', gbp: '£', cad: 'C$', aud: 'A$',
};

function format(price: Stripe.Price): PriceDisplay | null {
  if (price.unit_amount == null) return null;
  const interval = price.recurring?.interval === 'year' ? 'year' : 'month';
  const symbol = CURRENCY_SYMBOL[price.currency] ?? price.currency.toUpperCase() + ' ';
  const dollars = price.unit_amount / 100;
  // Integer dollars → no decimals. Fractional → two decimals.
  const amountStr = Number.isInteger(dollars) ? `${symbol}${dollars}` : `${symbol}${dollars.toFixed(2)}`;
  return {
    amount: amountStr,
    sub: interval === 'year' ? '/ year' : '/ month',
    raw: price.unit_amount,
    currency: price.currency,
    interval,
  };
}

/**
 * Fetches both subscription prices from Stripe and computes the yearly savings.
 * Cached via `unstable_cache` (Next.js) in the caller; here we keep it pure.
 * Returns nulls on any error so the pricing page degrades gracefully to
 * "start free" / loading labels rather than crashing the whole surface.
 */
export async function fetchStripePrices(): Promise<FetchResult> {
  const secret = process.env.STRIPE_SECRET_KEY;
  const monthlyId = process.env.STRIPE_PRICE_MONTHLY ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
  const yearlyId  = process.env.STRIPE_PRICE_YEARLY  ?? process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY;
  if (!secret || !monthlyId || !yearlyId) return { monthly: null, yearly: null, savingsPct: null };

  try {
    const stripe = new Stripe(secret, { apiVersion: '2025-02-24.acacia' });
    const [m, y] = await Promise.all([
      stripe.prices.retrieve(monthlyId),
      stripe.prices.retrieve(yearlyId),
    ]);
    const monthly = format(m);
    const yearly  = format(y);
    let savingsPct: number | null = null;
    if (monthly && yearly && monthly.raw && yearly.raw) {
      const yearlyEquivFromMonthly = monthly.raw * 12;
      if (yearlyEquivFromMonthly > yearly.raw) {
        savingsPct = Math.round(((yearlyEquivFromMonthly - yearly.raw) / yearlyEquivFromMonthly) * 100);
      }
    }
    return { monthly, yearly, savingsPct };
  } catch (err) {
    console.error('[stripe-prices] fetch failed:', err);
    return { monthly: null, yearly: null, savingsPct: null };
  }
}
