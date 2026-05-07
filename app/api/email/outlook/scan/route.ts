// Microsoft Graph (Outlook/Hotmail/Live/O365) scan endpoint — same
// shape as /api/email/gmail/scan. Pulls new booking-confirmation
// emails from the signed-in user's inbox and records them in
// InboundMessage. V0 only logs receipt; extraction + filing land in
// the shared follow-up commit that targets all three inbound
// surfaces (Postmark forwarding, Gmail, Outlook).

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getOutlookAccessToken,
  listBookingConfirmations,
} from "@/lib/outlook-client";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getOutlookAccessToken(userId);
  if (!accessToken) {
    return Response.json(
      {
        error: "outlook_not_connected",
        message:
          "Sign in with Microsoft (or re-auth) to grant the Mail.Read permission. Existing sessions don't have it yet.",
      },
      { status: 412 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastOutlookSyncAt: true },
  });
  const afterIso = user?.lastOutlookSyncAt?.toISOString();

  const messages = await listBookingConfirmations(accessToken, {
    afterIso,
    maxResults: 50,
  });

  let newCount = 0;
  let dedupCount = 0;
  let errorCount = 0;
  let latest = user?.lastOutlookSyncAt?.getTime() ?? 0;

  for (const msg of messages) {
    try {
      const messageId = msg.internetMessageId;
      if (!messageId) {
        errorCount += 1;
        continue;
      }
      const receivedMs = new Date(msg.receivedDateTime).getTime();
      if (receivedMs > latest) latest = receivedMs;

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
      console.error("[email/outlook/scan] per-message error:", err);
      errorCount += 1;
    }
  }

  if (latest > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastOutlookSyncAt: new Date(latest) },
    });
  }

  return Response.json({
    ok: true,
    fetched: messages.length,
    new: newCount,
    deduped: dedupCount,
    errors: errorCount,
    lastSyncAt: latest ? new Date(latest).toISOString() : null,
  });
}
