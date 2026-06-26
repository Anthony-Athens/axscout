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
        <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-200">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          autoComplete="name"
          required
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
        />
        {state.fieldErrors?.fullName && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-200">
          Username <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="username"
          name="username"
          defaultValue={username}
          autoComplete="username"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
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
        className="rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
