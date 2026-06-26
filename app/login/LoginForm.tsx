"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "./actions";

const initialState: Awaited<ReturnType<typeof login>> = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="mt-2 text-sm text-red-300">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400"
        />
        {state.fieldErrors?.password && (
          <p id="password-error" className="mt-2 text-sm text-red-300">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Logging in..." : "Log In"}
      </button>

      <p className="text-sm text-slate-400">
        New to AX Scout?{" "}
        <Link href="/signup" className="font-medium text-blue-300 hover:text-blue-200">
          Create an account
        </Link>
      </p>
    </form>
  );
}
