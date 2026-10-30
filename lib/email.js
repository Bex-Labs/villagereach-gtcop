import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

// Makes user-typed text (titles, reasons) safe to put inside an email
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Sends an email. It NEVER throws: a failed email must not stop an upload or approval.
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to || (Array.isArray(to) && to.length === 0)) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  // One email per person, so one bad address can't stop the others
  // (and admins don't see each other's addresses)
  const list = Array.isArray(to) ? to : [to];
  for (const [i, address] of list.entries()) {
    // Resend allows about 2 emails a second, so wait a little between them
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM, to: address, subject, html });
      if (error) console.error("Email not sent:", error.message);
    } catch (err) {
      console.error("Email not sent:", err.message);
    }
  }
}

// Emails of all active admins
export async function adminEmails() {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: list }] = await Promise.all([
    admin.from("profiles").select("id").eq("role", "admin").eq("is_active", true),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const ids = new Set((profiles ?? []).map((p) => p.id));
  // Skip username-only accounts (e.g. dapo@gtcop.local): they have no real inbox
  return (list?.users ?? [])
    .filter((u) => ids.has(u.id) && u.email && !u.email.endsWith("@gtcop.local"))
    .map((u) => u.email);
}

// Email of one user
export async function userEmail(userId) {
  if (!userId) return null;
  const { data } = await createAdminClient().auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

// Simple, branded email layout
function layout(body) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#2B2B2B;max-width:560px">
    ${body}
    <p style="margin-top:24px;color:#5C6670;font-size:13px">GTCOP Telehealth Regulatory Assessment · VillageReach</p>
  </div>`;
}

const button = (href, text) =>
  `<p><a href="${href}" style="display:inline-block;background:#A3522E;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${text}</a></p>`;

// To admins: a country submitted something
export function newSubmissionEmail({ title, country, contributor }) {
  return {
    subject: `New document to review: ${title}`,
    html: layout(`
      <p>${esc(contributor || "A contributor")} (${esc(country)}) submitted a document for review:</p>
      <p><strong>${esc(title)}</strong></p>
      ${button(`${SITE}/admin/review`, "Open Pending review")}
    `),
  };
}

// To the contributor: approved or sent back
export function outcomeEmail({ title, approved, reason, documentId }) {
  return approved
    ? {
        subject: `Approved: ${title}`,
        html: layout(`
          <p>Good news. Your document has been approved and is now public:</p>
          <p><strong>${esc(title)}</strong></p>
          ${button(`${SITE}/documents/${documentId}`, "View the document")}
        `),
      }
    : {
        subject: `Changes needed: ${title}`,
        html: layout(`
          <p>VillageReach has reviewed your document and asked for some changes:</p>
          <p><strong>${esc(title)}</strong></p>
          <p style="background:#FDECEA;padding:12px;border-radius:8px"><strong>Feedback:</strong> ${esc(reason)}</p>
          ${button(`${SITE}/contributor`, "Fix and resubmit")}
        `),
      };
}