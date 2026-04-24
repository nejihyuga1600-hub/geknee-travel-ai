import type { Metadata } from 'next';
import Link from 'next/link';
import CheckoutButton from './CheckoutButton';
import { fetchStripePrices } from '@/lib/stripe-prices';

// Revalidate the page hourly — Stripe prices don't change often, no need
// to hit their API on every pageview.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Pricing · geknee',
  description: 'Plan trips, collect monuments, see the world. Free forever, or go Pro for unlimited AI trip planning.',
  openGraph: {
    title: 'Pricing · geknee',
    description: 'Plan trips, collect monuments, see the world.',
    type: 'website',
  },
};

type Tier = {
  name: string;
  tagline: string;
  price: string;
  priceSub: string;
  features: { label: string; included: boolean }[];
  cta: React.ReactNode;
  highlight?: boolean;
  badge?: string;
};

export default function PricingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string }> }) {
  return <PricingBody searchParamsPromise={searchParams} />;
}

async function PricingBody({ searchParamsPromise }: { searchParamsPromise: Promise<{ success?: string; canceled?: string }> }) {
  const sp = await searchParamsPromise;
  const success = sp.success === '1';
  const canceled = sp.canceled === '1';

  // Live from Stripe (revalidated hourly). Falls back to em-dashes if Stripe
  // is unreachable — better than showing misleading numbers.
  const { monthly, yearly, savingsPct } = await fetchStripePrices();

  const tiers: Tier[] = [
    {
      name: 'Free',
      tagline: 'Collect monuments. Dream up trips.',
      price: '$0',
      priceSub: 'forever',
      features: [
        { label: 'Explore the 3D globe', included: true },
        { label: 'Collect monuments as you travel', included: true },
        { label: '3 AI-planned trips / month', included: true },
        { label: '3 saved trip drafts', included: true },
        { label: 'Unlimited AI trip planning', included: false },
        { label: 'Unlimited saved trips', included: false },
        { label: 'Priority support', included: false },
      ],
      cta: (
        <Link href="/" style={ctaStyle('ghost')}>Start free</Link>
      ),
    },
    {
      name: 'Pro Monthly',
      tagline: 'For the serial trip-planner.',
      price: monthly?.amount ?? '—',
      priceSub: monthly?.sub ?? '/ month',
      highlight: false,
      features: [
        { label: 'Everything in Free', included: true },
        { label: 'Unlimited AI-planned trips', included: true },
        { label: 'Unlimited saved drafts', included: true },
        { label: 'Priority support', included: true },
        { label: 'Early access to new monument skins', included: true },
        { label: 'Pro-only rarity tiers', included: true },
      ],
      cta: (
        <CheckoutButton interval="monthly" label="Go Pro Monthly" style={ctaStyle('primary')} />
      ),
    },
    {
      name: 'Pro Yearly',
      tagline: savingsPct ? `Save ${savingsPct}% — best deal.` : 'Annual plan.',
      price: yearly?.amount ?? '—',
      priceSub: yearly?.sub ?? '/ year',
      highlight: true,
      badge: savingsPct ? `Save ${savingsPct}%` : undefined,
      features: [
        { label: 'Everything in Pro Monthly', included: true },
        ...(savingsPct ? [{ label: `${savingsPct}% off vs. paying monthly`, included: true }] : []),
        { label: 'Exclusive Pro-Yearly monument skin', included: true },
      ],
      cta: (
        <CheckoutButton interval="yearly" label="Go Pro Yearly" style={ctaStyle('primary')} />
      ),
    },
  ];

  return (
    <main style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 40% 30%, rgba(30,70,200,0.35) 0%, rgba(6,8,22,0.96) 60%, #030510 100%)',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '48px 20px 96px',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>

        {/* Back to globe */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#94a3b8', fontSize: 13, textDecoration: 'none', marginBottom: 28,
        }}>
          {String.fromCodePoint(0x2190)} Back to globe
        </Link>

        {/* Post-checkout banners */}
        {success && (
          <div style={bannerStyle('#34d399', 'rgba(52,211,153,0.1)')}>
            {String.fromCodePoint(0x1F389)} You&apos;re Pro. Welcome aboard. All features are unlocked.
          </div>
        )}
        {canceled && (
          <div style={bannerStyle('#fbbf24', 'rgba(251,191,36,0.1)')}>
            Checkout canceled. No charge. Change your mind? Click a plan below.
          </div>
        )}

        {/* Heading */}
        <header style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1 style={{ fontSize: 44, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>
            Plan bigger. Collect faster.
          </h1>
          <p style={{ fontSize: 18, color: '#94a3b8', marginTop: 14, maxWidth: 580, margin: '14px auto 0' }}>
            Free forever. Upgrade when you want unlimited AI trip planning and Pro-only monument skins.
          </p>
        </header>

        {/* Tier grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          marginBottom: 72,
        }}>
          {tiers.map((t) => (
            <div
              key={t.name}
              style={{
                background: t.highlight ? 'linear-gradient(160deg, rgba(99,102,241,0.18), rgba(139,92,246,0.18))' : 'rgba(15,23,42,0.65)',
                border: `1px solid ${t.highlight ? 'rgba(139,92,246,0.55)' : 'rgba(148,163,184,0.18)'}`,
                borderRadius: 18,
                padding: '28px 24px 24px',
                position: 'relative',
                boxShadow: t.highlight ? '0 16px 48px rgba(99,102,241,0.25)' : 'none',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {t.badge && (
                <div style={{
                  position: 'absolute', top: -12, right: 18,
                  background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                  color: '#fff', fontSize: 11, fontWeight: 800,
                  padding: '4px 10px', borderRadius: 999, letterSpacing: 0.5,
                }}>{t.badge}</div>
              )}

              <div style={{ fontSize: 14, fontWeight: 800, color: t.highlight ? '#c4b5fd' : '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t.name}
              </div>
              <div style={{ fontSize: 14, color: '#cbd5e1', marginTop: 6 }}>{t.tagline}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 22 }}>
                <div style={{ fontSize: 48, fontWeight: 900 }}>{t.price}</div>
                <div style={{ fontSize: 14, color: '#94a3b8' }}>{t.priceSub}</div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 24px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: f.included ? '#e2e8f0' : '#64748b', textDecoration: f.included ? 'none' : 'line-through' }}>
                    <span style={{ color: f.included ? '#34d399' : '#64748b', flexShrink: 0 }}>
                      {f.included ? String.fromCodePoint(0x2713) : String.fromCodePoint(0x00D7)}
                    </span>
                    {f.label}
                  </li>
                ))}
              </ul>

              {t.cta}
            </div>
          ))}
        </div>

        {/* Tiny FAQ */}
        <section style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Questions</h2>
          <Faq q="Can I cancel anytime?" a="Yes. Upgrade, downgrade, or cancel from the billing portal — no contracts, no renewal traps." />
          <Faq q="What happens to my collected monuments if I downgrade?" a="They&apos;re yours forever. Free users can see everything they&apos;ve already collected. Pro-only skins stay visible — you just can&apos;t unlock new Pro-only tiers without Pro." />
          <Faq q="Is there a refund policy?" a="If you&apos;re unhappy in the first 14 days, email hello@geknee.com and we&apos;ll refund you in full." />
          <Faq q="Can I use geknee for work trips?" a="Absolutely. Pro is one account; add your company card in checkout." />
        </section>
      </div>
    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details style={{
      borderBottom: '1px solid rgba(148,163,184,0.14)',
      padding: '16px 4px',
    }}>
      <summary style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer', color: '#e2e8f0' }}>{q}</summary>
      <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 10, lineHeight: 1.6 }}>{a}</div>
    </details>
  );
}

function ctaStyle(variant: 'primary' | 'ghost'): React.CSSProperties {
  const primary: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'center',
    padding: '12px 18px', borderRadius: 10,
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
    textDecoration: 'none', border: 'none', cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
  };
  const ghost: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'center',
    padding: '12px 18px', borderRadius: 10,
    background: 'transparent',
    border: '1px solid rgba(148,163,184,0.35)',
    color: '#e2e8f0', fontSize: 14, fontWeight: 700,
    textDecoration: 'none', cursor: 'pointer',
  };
  return variant === 'primary' ? primary : ghost;
}

function bannerStyle(border: string, bg: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border}55`,
    color: border,
    borderRadius: 12,
    padding: '14px 18px',
    marginBottom: 28,
    fontSize: 14,
    fontWeight: 700,
    textAlign: 'center',
  };
}
