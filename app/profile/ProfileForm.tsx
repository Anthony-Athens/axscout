"use client";

import { useActionState } from "react";

import { updateProfile } from "./actions";

export default function ProfileForm({
  fullName,
  username,
}: {
  fullName: string;
  username: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {state.fieldErrors?.fullName && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
          Username <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="username"
          name="username"
          defaultValue={username}
          autoComplete="username"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {state.fieldErrors?.username && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.username}</p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-300">{state.error}</p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-300">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
