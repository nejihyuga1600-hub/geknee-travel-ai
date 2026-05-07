// Gmail scan endpoint — pulls new booking-confirmation emails from
// the signed-in user's Gmail and records them in InboundMessage. V0
// only logs receipt; extraction + filing land in a follow-up.
//
// Triggered by:
//  - User-initiated "Scan Gmail" button (POST without body)
//  - Future: cron worker, or hook on plan-summary page mount
//
// Pre-req: user signed in via Google with the gmail.readonly scope
// (auth.ts requests it). If they signed in before that scope was
// added, getGoogleAccessToken() returns null and we surface a
// re-auth-required error.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getGoogleAccessToken,
  listBookingConfirmations,
  fetchGmailMessage,
  getRfc822MessageId,
} from "@/lib/gmail-client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    return Response.json(
      {
        error: "gmail_not_connected",
        message:
          "Sign in again with Google to grant the Gmail readonly permission. Existing sessions don't have it yet.",
      },
      { status: 412 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastGmailSyncAt: true },
  });
  // Convert the high-water mark to epoch seconds for Gmail's `after:`
  // operator. First-ever scan: fall back to the last 30 days
  // (handled inside listBookingConfirmations).
  const afterEpochSec = user?.lastGmailSyncAt
    ? Math.floor(user.lastGmailSyncAt.getTime() / 1000)
    : undefined;

  const entries = await listBookingConfirmations(accessToken, {
    afterEpochSec,
    maxResults: 50,
  });

  let newCount = 0;
  let dedupCount = 0;
  let errorCount = 0;
  let latestInternalDate = user?.lastGmailSyncAt?.getTime() ?? 0;

  for (const entry of entries) {
    try {
      const msg = await fetchGmailMessage(accessToken, entry.id);
      if (!msg) {
        errorCount += 1;
        continue;
      }
      const messageId = getRfc822MessageId(msg);
      if (!messageId) {
        errorCount += 1;
        continue;
      }
      const internalDateMs = msg.internalDate ? Number(msg.internalDate) : 0;
      if (internalDateMs > latestInternalDate) latestInternalDate = internalDateMs;

      const seen = await prisma.inboundMessage.findUnique({
        where: { messageId },
        select: { id: true },
      });
      if (seen) {
        dedupCount += 1;
        continue;
      }

      await prisma.inboundMessage.create({
        data: { messageId, userId, status: "received" },
      });
      newCount += 1;
    } catch (err) {
      console.error("[email/gmail/scan] per-message error:", err);
      errorCount += 1;
    }
  }

  // Bump the high-water mark only if we made it through the loop.
  // Using the most-recent internalDate (not now()) ensures we pick up
  // anything that arrived during the scan on the next run.
  if (latestInternalDate > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastGmailSyncAt: new Date(latestInternalDate) },
    });
  }

  return Response.json({
    ok: true,
    fetched: entries.length,
    new: newCount,
    deduped: dedupCount,
    errors: errorCount,
    lastSyncAt: latestInternalDate ? new Date(latestInternalDate).toISOString() : null,
  });
}
