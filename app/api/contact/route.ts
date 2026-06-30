import { createClient } from "@/lib/supabase/server";

const INQUIRY_TYPES = new Set([
  "Premium beta access",
  "Bug report",
  "Feature suggestion",
  "Collaboration",
  "Custom analysis request",
  "Data question",
  "General message",
]);

const MAX_LENGTHS = {
  name: 100,
  email: 254,
  inquiryType: 100,
  company: 150,
  website: 300,
  relatedPage: 300,
  contactMethod: 100,
  message: 5000,
} as const;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  inquiry_type?: unknown;
  company_or_organization?: unknown;
  website_or_social?: unknown;
  related_page?: unknown;
  preferred_contact_method?: unknown;
  message?: unknown;
  fax_number?: unknown;
};

function cleanField(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength + 1) : "";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail(apiKey: string, payload: Record<string, unknown>) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ error: "Please submit a valid contact form." }, { status: 400 });
  }

  const name = cleanField(payload.name, MAX_LENGTHS.name);
  const email = cleanField(payload.email, MAX_LENGTHS.email);
  const inquiryType = cleanField(payload.inquiry_type, MAX_LENGTHS.inquiryType);
  const company = cleanField(payload.company_or_organization, MAX_LENGTHS.company);
  const website = cleanField(payload.website_or_social, MAX_LENGTHS.website);
  const relatedPage = cleanField(payload.related_page, MAX_LENGTHS.relatedPage);
  const contactMethod = cleanField(payload.preferred_contact_method, MAX_LENGTHS.contactMethod);
  const message = cleanField(payload.message, MAX_LENGTHS.message);
  const honeypot = cleanField(payload.fax_number, 200);

  if (honeypot) {
    return Response.json({
      success: true,
      message: "Thanks - your message was sent. I'll review it soon.",
    });
  }

  if (!name || !email || !inquiryType || !message) {
    return Response.json({ error: "Please complete every required field." }, { status: 400 });
  }

  if (!INQUIRY_TYPES.has(inquiryType)) {
    return Response.json({ error: "Please choose a valid inquiry type." }, { status: 400 });
  }

  if (message.length < 10) {
    return Response.json({ error: "Please provide at least 10 characters in your message." }, { status: 400 });
  }

  if (
    name.length > MAX_LENGTHS.name ||
    email.length > MAX_LENGTHS.email ||
    inquiryType.length > MAX_LENGTHS.inquiryType ||
    company.length > MAX_LENGTHS.company ||
    website.length > MAX_LENGTHS.website ||
    relatedPage.length > MAX_LENGTHS.relatedPage ||
    contactMethod.length > MAX_LENGTHS.contactMethod ||
    message.length > MAX_LENGTHS.message
  ) {
    return Response.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    console.error("Contact form email delivery is not configured.");
    return Response.json(
      { error: "Something went wrong while sending your message. Please try again." },
      { status: 503 }
    );
  }

  let authenticatedUser: { id: string; email?: string } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      authenticatedUser = { id: data.user.id, email: data.user.email };
    }
  } catch (error) {
    console.warn("Contact submission could not read the optional authenticated user.", error);
  }

  const submittedAt = new Date().toISOString();
  const details = [
    ["Name", name],
    ["Email", email],
    ["Inquiry type", inquiryType],
    ["Company / organization", company],
    ["Website / social", website],
    ["Related page", relatedPage],
    ["Preferred contact method", contactMethod],
    ["Submitted at", submittedAt],
    ["Authenticated user ID", authenticatedUser?.id ?? ""],
    ["Authenticated user email", authenticatedUser?.email ?? ""],
  ].filter(([, value]) => value);

  const textDetails = details.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlDetails = details
    .map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`)
    .join("");

  try {
    const response = await sendEmail(apiKey, {
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `[AXScout Contact] ${inquiryType} from ${name.replace(/[\r\n]+/g, " ")}`,
      text: `${textDetails}\n\nMessage:\n${message}`,
      html: `<h2>New AXScout inquiry</h2><table>${htmlDetails}</table><h3>Message</h3><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`,
    });

    if (!response.ok) {
      console.error(`Resend contact delivery failed with status ${response.status}.`);
      return Response.json(
        { error: "Something went wrong while sending your message. Please try again." },
        { status: 502 }
      );
    }

    const confirmation = await sendEmail(apiKey, {
      from: fromEmail,
      to: [email],
      reply_to: toEmail,
      subject: "Thanks for contacting AXScout",
      text: "Thanks for reaching out. Your message was received, and I'll review it soon.",
      html: "<p>Thanks for reaching out. Your message was received, and I'll review it soon.</p>",
    });

    if (!confirmation.ok) {
      console.warn(`Resend confirmation delivery failed with status ${confirmation.status}.`);
    }

    return Response.json({
      success: true,
      message:
        inquiryType === "Premium beta access"
          ? "Thanks - your beta access request was received. I'll review it and follow up."
          : "Thanks - your message was sent. I'll review it soon.",
    });
  } catch (error) {
    console.error("Resend contact delivery failed.", error);
    return Response.json(
      { error: "Something went wrong while sending your message. Please try again." },
      { status: 502 }
    );
  }
}
