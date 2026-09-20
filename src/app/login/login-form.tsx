"use client";

import { useActionState } from "react";

import { signIn, type LoginState } from "./actions";

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, null);

  return (
    <form className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@work.com"
          required
          className={field}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={field}
        />
      </div>

      <button
        type="submit"
        formAction={formAction}
        name="intent"
        value="password"
        disabled={pending}
        className="w-full rounded-xl bg-ice-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ice-500 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="border-t border-rink-800 pt-4">
        <p className="text-xs text-muted">No password set yet?</p>
        <button
          type="submit"
          formAction={formAction}
          name="intent"
          value="magic"
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-rink-700 px-4 py-2.5 text-sm font-medium transition hover:border-ice-500 hover:text-ice-400 disabled:opacity-50"
        >
          Email me a sign-in link
        </button>
      </div>

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
