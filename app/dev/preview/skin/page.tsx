import { auth } from '@/auth';
import { isDevAccount } from '@/lib/plan';
import { notFound } from 'next/navigation';
import PreviewClient from './PreviewClient';

// Dev-account-only preview for a not-yet-promoted skin GLB. Gets the blob URL
// via query param so the same route works for any preview (Meshy output,
// manual test upload, etc). Ungated access 404s.
export default async function SkinPreviewPage({ searchParams }: { searchParams: Promise<{ url?: string; name?: string; mk?: string; style?: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) notFound();
  const dev = await isDevAccount(userId);
  if (!dev) notFound();

  const sp = await searchParams;
  const url   = sp.url ?? '';
  const name  = sp.name ?? sp.mk ?? 'unnamed';
  const style = sp.style ?? '';

  return (
    <main style={{
      minHeight: '100svh',
      background: 'radial-gradient(ellipse at 40% 30%, rgba(30,70,200,0.25) 0%, rgba(6,8,22,0.97) 60%, #030510 100%)',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 24,
    }}>
      <header style={{ maxWidth: 1080, margin: '0 auto 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, textTransform: 'uppercase' }}>
            Dev · skin preview
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
            {name}{style ? ` · ${style}` : ''}
          </h1>
        </div>
        <a href="/plan/location" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}>Back to globe {String.fromCodePoint(0x2192)}</a>
      </header>

      {!url ? (
        <div style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center', color: '#94a3b8' }}>
          Provide <code>?url=&lt;blob-url&gt;</code> to preview a GLB. Optional:
          <code>&amp;name=</code>, <code>&amp;mk=</code>, <code>&amp;style=</code>.
        </div>
      ) : (
        <PreviewClient url={url} name={name} style={style} />
      )}
    </main>
  );
}
