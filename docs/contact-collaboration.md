# Contact & Collaboration

The public Contact & Collaboration page sends structured inquiries through the server-only `POST /api/contact` route. It supports Premium beta requests, bug reports, feature suggestions, collaboration inquiries, custom analysis requests, data questions, and general messages.

## Environment variables

Configure these values locally and in the production hosting environment:

- `RESEND_API_KEY`: Resend API key with permission to send email.
- `CONTACT_TO_EMAIL`: Private AXScout inbox that receives submissions.
- `CONTACT_FROM_EMAIL`: Verified Resend sender, for example `AXScout <contact@axscout.com>`.

None of these variables should use the `NEXT_PUBLIC_` prefix.

## Submission flow

1. The browser submits the structured form to `POST /api/contact`.
2. The route validates required fields, the inquiry type, email format, field lengths, and a hidden honeypot.
3. The route reads the current Supabase user when a session exists and adds the user ID and account email to the owner notification.
4. Resend delivers the full inquiry to `CONTACT_TO_EMAIL`.
5. A confirmation email is sent to the submitter. A confirmation failure is logged but does not turn a successfully delivered inquiry into an error.

The route includes the submitted timestamp, contact details, optional organization and page context, and the full message. Resend credentials never reach the browser.

## Submission storage

Submissions are currently delivered by email and are not stored in Supabase. The application does not expose a service-role web client, so email delivery remains the safer production path without broadening database write permissions. Resend delivery history provides basic operational visibility.

## Premium beta requests

Premium access is manual during beta. Review messages with the `Premium beta access` inquiry type in the contact inbox, assess the request, and follow up using the supplied email address. This workflow does not grant an entitlement automatically.

## Operations

- Verify the sending domain in Resend before launch.
- Set `CONTACT_FROM_EMAIL` to a verified address on that domain.
- Submit one inquiry of each important type after deployment and confirm both owner and submitter delivery.
- Monitor server logs for Resend delivery failures and confirmation warnings.

## Future improvements

- Store submissions in a private Supabase admin inbox.
- Add assignment and status workflow.
- Send Slack notifications for priority inquiry types.
- Connect approved requests to an automatic Premium invitation flow.
- Add Cloudflare Turnstile or another challenge if honeypot protection becomes insufficient.
