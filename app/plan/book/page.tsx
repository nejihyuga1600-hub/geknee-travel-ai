import { redirect } from 'next/navigation';

// Legacy /plan/book route — superseded by /plan/<tripId>/booking. We
// preserve this path so existing inbound links (email, bookmarks,
// router.push call sites we haven't migrated yet) don't 404; just
// rewrite them to the canonical tab URL on the way through.
//
// The 1,640-line standalone booking implementation that used to live
// here was retired alongside BookTab.tsx — both were duplicates of the
// BookView component now used by the new tab route.
export default async function BookPageRedirect({
  searchParams,
}: {
  searchParams: Promise<{ savedTripId?: string; tripId?: string }>;
}) {
  const sp = await searchParams;
  const id = sp.savedTripId ?? sp.tripId;
  if (id) {
    redirect(`/plan/${id}/booking`);
  }
  redirect('/plan');
}
