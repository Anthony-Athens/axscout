# Contact Email Delivery

The current operational workflow is documented in [Contact & Collaboration](contact-collaboration.md).

The public contact form submits to `POST /api/contact`. The route validates the payload and sends it through Resend's HTTP API; no email credentials are exposed to the browser.

Configure these server-side environment variables in local development and Vercel:

- `RESEND_API_KEY`: Resend API key with permission to send email.
- `CONTACT_TO_EMAIL`: Inbox that receives contact submissions.
- `CONTACT_FROM_EMAIL`: Required verified sender, such as `AXScout <contact@axscout.com>`.
- `NEXT_PUBLIC_SITE_URL`: Optional canonical site URL. Defaults to `https://axscout.com`.

For production delivery, verify the sending domain in Resend and set `CONTACT_FROM_EMAIL` to an address on that domain.
