/**
 * Transactional email via Resend (installed through the Vercel Marketplace
 * — RESEND_API_KEY is provisioned automatically once the integration is
 * connected, not something to type in by hand). Same fail-gracefully
 * pattern as lib/paystack.ts: a missing key returns a
 * typed error instead of throwing, since this app must never crash just
 * because an integration isn't connected yet.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "MobileTechJoint <onboarding@resend.dev>";

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "Email sending is not configured." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [params.to],
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body?.message ?? `Resend request failed (${res.status}).` };
  }

  return { ok: true };
}
