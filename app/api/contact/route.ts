const MAX_LENGTHS = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
} as const;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
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

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ error: "Please submit a valid contact form." }, { status: 400 });
  }

  const name = cleanField(payload.name, MAX_LENGTHS.name);
  const email = cleanField(payload.email, MAX_LENGTHS.email);
  const subject = cleanField(payload.subject, MAX_LENGTHS.subject).replace(/[\r\n]+/g, " ");
  const message = cleanField(payload.message, MAX_LENGTHS.message);
  const website = cleanField(payload.website, 200);

  if (website) {
    return Response.json({ success: true });
  }

  if (!name || !email || !subject || !message) {
    return Response.json({ error: "Please complete every required field." }, { status: 400 });
  }

  if (
    name.length > MAX_LENGTHS.name ||
    email.length > MAX_LENGTHS.email ||
    subject.length > MAX_LENGTHS.subject ||
    message.length > MAX_LENGTHS.message
  ) {
    return Response.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail =
    process.env.CONTACT_FROM_EMAIL ?? "AXScout Contact <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    console.error("Contact form email delivery is not configured.");
    return Response.json(
      { error: "Contact email is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `AXScout contact: ${subject}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
        html: `<h2>New AXScout contact</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Subject:</strong> ${safeSubject}</p><p><strong>Message:</strong><br />${safeMessage}</p>`,
      }),
    });

    if (!response.ok) {
      console.error(`Resend contact delivery failed with status ${response.status}.`);
      return Response.json(
        { error: "Your message could not be sent. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Resend contact delivery failed.", error);
    return Response.json(
      { error: "Your message could not be sent. Please try again." },
      { status: 502 }
    );
  }
}
