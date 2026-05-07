// Microsoft Graph client for the email-vault feature. Mirror of
// lib/gmail-client.ts — reads tokens stored on the NextAuth Account
// row (provider='microsoft-entra-id'), refreshes via the v2.0 token
// endpoint when expired, and exposes message-listing + fetch helpers.
//
// Covers Outlook.com, Hotmail, Live, and Office 365 accounts. The
// `common` tenant accepts both personal and work/school sign-ins, so
// we don't need separate flows.

import { prisma } from "@/lib/prisma";

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

async function refreshOutlookAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
} | null> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    // scope must be re-included on refresh; offline_access keeps the
    // refresh_token rotated forward (Microsoft rotates them on each use).
    scope: "openid profile email offline_access Mail.Read",
  });

  const resp = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  if (!resp.ok) {
    console.error("[outlook-client] refresh failed:", resp.status, await resp.text());
    return null;
  }
  const data = (await resp.json()) as RefreshResponse;
  return {
    accessToken: data.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    // Microsoft rotates refresh_tokens; persist the new one when present.
    refreshToken: data.refresh_token,
  };
}

export async function getOutlookAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });
  if (!account?.access_token) return null;
  if (!account.scope?.toLowerCase().includes("mail.read")) return null;

  const now = Math.floor(Date.now() / 1000);
  const isExpired = !account.expires_at || account.expires_at - now < 60;
  if (!isExpired) return account.access_token;

  if (!account.refresh_token) return null;

  const refreshed = await refreshOutlookAccessToken(account.refresh_token);
  if (!refreshed) return null;

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: refreshed.accessToken,
      expires_at: refreshed.expiresAt,
      // Microsoft rotates refresh_tokens — persist if returned.
      ...(refreshed.refreshToken
        ? { refresh_token: refreshed.refreshToken }
        : {}),
    },
  });
  return refreshed.accessToken;
}

// Same allowlist as Gmail. Lower-cased for case-insensitive sender
// match. Add to this list (and the Gmail one in lib/gmail-client.ts)
// whenever a real user reports a missed confirmation.
const BOOKING_SENDER_DOMAINS = new Set([
  "booking.com", "airbnb.com", "hotels.com", "expedia.com", "vrbo.com",
  "marriott.com", "hilton.com", "hyatt.com", "ihg.com", "accor.com",
  "tripadvisor.com", "viator.com", "klook.com", "getyourguide.com",
  "tiqets.com", "travelpayouts.com", "aviasales.com", "hotellook.com",
  "skyscanner.net", "kayak.com", "united.com", "delta.com",
  "americanairlines.com", "ba.com", "lufthansa.com", "airfrance.com",
  "ana.co.jp", "jal.com", "singaporeair.com", "emirates.com",
  "qatarairways.com",
]);

export interface OutlookMessage {
  id: string;
  internetMessageId: string;     // RFC 822 Message-ID, used for dedup
  receivedDateTime: string;      // ISO 8601
  subject?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  bodyPreview?: string;
  body?: { content?: string; contentType?: "text" | "html" };
  hasAttachments?: boolean;
}

interface ListMessagesResponse {
  value?: OutlookMessage[];
}

// Lists recent messages received after the watermark. Microsoft Graph
// can OData-filter senders, but a 30+ OR chain is unwieldy and easy to
// trip query-length limits with. Cheaper to fetch by date and filter
// senders in code — bandwidth is small for typical inbox volume.
export async function listBookingConfirmations(
  accessToken: string,
  options: { afterIso?: string; maxResults?: number } = {},
): Promise<OutlookMessage[]> {
  const { afterIso, maxResults = 50 } = options;
  const since = afterIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(`${GRAPH_API_BASE}/me/messages`);
  url.searchParams.set("$filter", `receivedDateTime ge ${since}`);
  url.searchParams.set("$select", "id,internetMessageId,receivedDateTime,subject,from,bodyPreview,hasAttachments");
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$top", String(Math.min(maxResults, 100)));

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    console.error("[outlook-client] list failed:", resp.status, await resp.text());
    return [];
  }
  const data = (await resp.json()) as ListMessagesResponse;
  const messages = data.value ?? [];
  return messages.filter(m => {
    const addr = m.from?.emailAddress?.address?.toLowerCase();
    if (!addr) return false;
    const domain = addr.split("@")[1] ?? "";
    return BOOKING_SENDER_DOMAINS.has(domain);
  });
}

// Fetches a single message with full body. Used by the extractor pass
// once a message is identified as worth processing.
export async function fetchOutlookMessage(
  accessToken: string,
  messageId: string,
): Promise<OutlookMessage | null> {
  const url = new URL(`${GRAPH_API_BASE}/me/messages/${messageId}`);
  url.searchParams.set("$select", "id,internetMessageId,receivedDateTime,subject,from,bodyPreview,body,hasAttachments");
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    console.error("[outlook-client] fetch failed:", messageId, resp.status);
    return null;
  }
  return (await resp.json()) as OutlookMessage;
}
