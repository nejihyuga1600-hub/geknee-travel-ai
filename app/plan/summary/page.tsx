'use client';

// Legacy /plan/summary route — kept stable for inbound links and the
// existing planning flow. The page body lives in `./SummaryView.tsx` so
// the new tabbed route at /plan/[tripId]/itinerary can reuse the exact
// same view without duplicating ~1,700 lines.
import SummaryView from './SummaryView';

export default function SummaryPage() {
  return <SummaryView />;
}
