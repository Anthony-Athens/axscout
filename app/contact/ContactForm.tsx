"use client";

import { FormEvent, useState } from "react";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const fieldClassName =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

export default function ContactForm() {
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const fields = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      subject: String(formData.get("subject") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
    };

    if (!fields.name || !fields.email || !fields.subject || !fields.message) {
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
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Your message could not be sent.");
      }

      form.reset();
      setSubmission({
        status: "success",
        message: "Thanks for reaching out. Your message is on its way to AXScout.",
      });
    } catch (error) {
      setSubmission({
        status: "error",
        message: error instanceof Error ? error.message : "Your message could not be sent.",
      });
    }
  }

  const isSubmitting = submission.status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-800">
          Name
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
          Email
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
        Subject
        <input name="subject" type="text" maxLength={150} required className={fieldClassName} />
      </label>

      <label className="block text-sm font-medium text-slate-800">
        Message
        <textarea
          name="message"
          rows={7}
          maxLength={5000}
          required
          className={fieldClassName}
          placeholder="Tell us what you are exploring, what went wrong, or how you would like to collaborate."
        />
      </label>

      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
        <p className="text-sm text-slate-500">We will use your email only to respond to this request.</p>
      </div>

      {submission.status === "success" && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
