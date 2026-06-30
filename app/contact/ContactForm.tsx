"use client";

import { FormEvent, useState } from "react";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const inquiryTypes = [
  "Premium beta access",
  "Bug report",
  "Feature suggestion",
  "Collaboration",
  "Custom analysis request",
  "Data question",
  "General message",
] as const;

const fieldClassName =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function ContactForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [inquiryType, setInquiryType] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      inquiry_type: String(formData.get("inquiry_type") ?? "").trim(),
      company_or_organization: String(formData.get("company_or_organization") ?? "").trim(),
      website_or_social: String(formData.get("website_or_social") ?? "").trim(),
      related_page: String(formData.get("related_page") ?? "").trim(),
      preferred_contact_method: String(formData.get("preferred_contact_method") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      fax_number: String(formData.get("fax_number") ?? "").trim(),
    };

    if (!fields.name || !fields.email || !fields.inquiry_type || !fields.message) {
      setSubmission({ status: "error", message: "Please complete every required field." });
      return;
    }

    setSubmission({ status: "submitting" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Something went wrong while sending your message. Please try again.");
      }

      form.reset();
      setInquiryType("");
      setSubmission({
        status: "success",
        message:
          result.message ?? "Thanks - your message was sent. I'll review it soon.",
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while sending your message. Please try again.",
      });
    }
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Name <span className="text-red-600">*</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            maxLength={100}
            required
            className={fieldClassName}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Email <span className="text-red-600">*</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            className={fieldClassName}
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        Inquiry type <span className="text-red-600">*</span>
        <select
          name="inquiry_type"
          required
          value={inquiryType}
          onChange={(event) => setInquiryType(event.target.value)}
          className={fieldClassName}
        >
          <option value="">Choose an inquiry type</option>
          {inquiryTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      {inquiryType === "Premium beta access" && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Premium beta access is manually reviewed while AXScout is in beta.
        </p>
      )}
      {inquiryType === "Bug report" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Please include the page URL, what happened, what you expected, and your browser or device when relevant.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Company or organization
          <input
            name="company_or_organization"
            type="text"
            autoComplete="organization"
            maxLength={150}
            className={fieldClassName}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Website or social profile
          <input
            name="website_or_social"
            type="text"
            inputMode="url"
            maxLength={300}
            placeholder="https://"
            className={fieldClassName}
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Related page
          <input
            name="related_page"
            type="text"
            maxLength={300}
            placeholder="Page name or URL"
            className={fieldClassName}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Preferred contact method
          <select name="preferred_contact_method" className={fieldClassName} defaultValue="Email">
            <option>Email</option>
            <option>Website or social profile</option>
            <option>No preference</option>
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-slate-800">
        Message <span className="text-red-600">*</span>
        <textarea
          name="message"
          rows={8}
          minLength={10}
          maxLength={5000}
          required
          className={fieldClassName}
          placeholder="Tell us what you are exploring, what went wrong, or how you would like to collaborate."
        />
        <span className="mt-2 block text-xs leading-5 text-slate-500">
          Include enough context for us to understand and respond to your request.
        </span>
      </label>

      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Fax number
          <input name="fax_number" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Inquiry"}
        </button>
        <p className="text-sm text-slate-500">Your email is used only to respond to this inquiry.</p>
      </div>

      {submission.status === "success" && (
        <p role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {submission.message}
        </p>
      )}
      {submission.status === "error" && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {submission.message}
        </p>
      )}
    </form>
  );
}
