// Postmark inbound webhook — receives forwarded booking-confirmation
// emails for the email-vault feature. This is the V0 of the pipeline:
// validate signature, dedupe by Message-ID, look up the owning user
// from the recipient address, and acknowledge. Extraction + filing
// land in a follow-up commit.
//
// Postmark setup notes (manual, outside this file):
//   1. Create an Inbound Stream in Postmark
//   2. Set the webhook URL to https://www.geknee.com/api/email/inbound
//   3. Copy the stream's "Webhook Secret" into POSTMARK_INBOUND_SECRET
//   4. Add MX record: inbox.geknee.com -> inbound.postmarkapp.com
//
// We respond 200 quickly even on dedupe / unknown user so Postmark
// doesn't retry. Real errors (bad signature, missing config) return
// non-2xx so Postmark surfaces them in their dashboard.

import { prisma } from "@/lib/prisma";
import {
  extractTokenFromRecipients,
  findUserByInboundToken,
  verifyPostmarkSignature,
} from "@/lib/email-vault";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface PostmarkInboundPayload {
  MessageID?: string;
  // RFC 822 Message-ID header. Postmark normalizes this on the
  // top-level Headers array; we read both forms below for safety.
  Headers?: Array<{ Name: string; Value: string }>;
  From?: string;
  FromFull?: { Email: string; Name: string };
  To?: string;
  ToFull?: Array<{ Email: string; Name: string }>;
  Cc?: string;
  CcFull?: Array<{ Email: string; Name: string }>;
  OriginalRecipient?: string;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  StrippedTextReply?: string;
  Attachments?: Array<{ Name: string; Content: string; ContentType: string; ContentLength: number }>;
}

function rfc822MessageId(payload: PostmarkInboundPayload): string | null {
  const header = payload.Headers?.find(h => h.Name.toLowerCase() === "message-id");
  if (header?.Value) return header.Value;
  // Postmark's MessageID is their internal id; falls back to that
  // when no RFC 822 header was present (rare for real mail).
  return payload.MessageID ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.POSTMARK_INBOUND_SECRET;
  if (!secret) {
    console.error("[email/inbound] POSTMARK_INBOUND_SECRET is not configured");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  // Read raw body once for signature verification, then parse.
  const rawBody = await req.text();
  const signature = req.headers.get("x-postmark-webhook-signature");
  if (!verifyPostmarkSignature(rawBody, signature, secret)) {
    console.warn("[email/inbound] signature verification failed");
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = JSON.parse(rawBody) as PostmarkInboundPayload;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const messageId = rfc822MessageId(payload);
  if (!messageId) {
    return Response.json({ error: "missing Message-ID" }, { status: 400 });
  }

  // Idempotency: if we've already processed this message, ack.
  const seen = await prisma.inboundMessage.findUnique({
    where: { messageId },
    select: { id: true, status: true },
  });
  if (seen) {
    return Response.json({ ok: true, deduped: true, status: seen.status });
  }

  // Resolve owner from the recipient address. OriginalRecipient is
  // preserved across forwards; To/Cc are last-hop destinations.
  const token = extractTokenFromRecipients(
    payload.OriginalRecipient,
    payload.To,
    ...((payload.ToFull ?? []).map(t => t.Email)),
    payload.Cc,
    ...((payload.CcFull ?? []).map(c => c.Email)),
  );
  if (!token) {
    await prisma.inboundMessage.create({
      data: { messageId, status: "skipped", reason: "no vault token in recipients" },
    });
    return Response.json({ ok: true, skipped: "no token" });
  }

  const user = await findUserByInboundToken(token);
  if (!user) {
    await prisma.inboundMessage.create({
      data: { messageId, status: "skipped", reason: "token did not resolve to user" },
    });
    return Response.json({ ok: true, skipped: "unknown token" });
  }

  // V0: just record receipt. Extraction + filing wired in a follow-up.
  await prisma.inboundMessage.create({
    data: { messageId, userId: user.id, status: "received" },
  });

  console.log("[email/inbound] received", {
    userId: user.id,
    messageId,
    subject: payload.Subject,
    from: payload.FromFull?.Email ?? payload.From,
    hasAttachments: (payload.Attachments?.length ?? 0) > 0,
  });

  return Response.json({ ok: true, userId: user.id });
}
