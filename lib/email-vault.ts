// Helpers for the email-forwarding vault. The user adds a Gmail (or
// other) filter that forwards booking-confirmation emails to
// vault-<token>@inbox.geknee.com; Postmark routes those to our
// webhook at /api/email/inbound, which uses these helpers to look
// up the owning user and verify the request.

import { randomBytes, timingSafeEqual, createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

// 16 bytes → 32 hex chars. URL-safe and short enough for an email
// local part. Collision risk negligible at any plausible user count.
export function generateInboundToken(): string {
  return randomBytes(16).toString("hex");
}

// "vault-<token>@inbox.geknee.com" — Postmark's parsed payload puts
// this in `OriginalRecipient` (preserves original To even when
// forwarded multiple times). Falls back to scanning To/Cc lists.
const TOKEN_RE = /vault-([a-f0-9]{32})@/i;

export function extractTokenFromRecipients(
  ...candidates: Array<string | undefined | null>
): string | null {
  for (const c of candidates) {
    if (!c) continue;
    const m = c.match(TOKEN_RE);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

export async function findUserByInboundToken(token: string) {
  return prisma.user.findUnique({
    where: { inboundEmailToken: token },
    select: { id: true, email: true },
  });
}

// Postmark signs inbound webhooks with HMAC-SHA1 of the raw body
// using the inbound stream's webhook secret. They send the digest
// base64-encoded in the `X-Postmark-Webhook-Signature` header.
// Reference: https://postmarkapp.com/developer/webhooks/inbound-webhook
export function verifyPostmarkSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac("sha1", secret).update(rawBody).digest("base64");
  // timingSafeEqual requires equal-length buffers; bail otherwise.
  const a = Buffer.from(signatureHeader, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
