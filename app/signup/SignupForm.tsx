"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signup } from "./actions";

const initialState: Awaited<ReturnType<typeof signup>> = {};

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {state.fieldErrors?.fullName && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.fullName}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        {state.fieldErrors?.email && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <p className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
        {state.fieldErrors?.password && (
          <p className="mt-2 text-sm text-red-300">{state.fieldErrors.password}</p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
          Log in
        </Link>
      </p>
    </form>
  );
}
