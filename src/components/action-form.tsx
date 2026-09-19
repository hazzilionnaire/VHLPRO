"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { ok: boolean; message: string } | null;

/**
 * Wraps a server action so every admin form gets the same pending state and
 * success/failure line without repeating the plumbing.
 */
export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className={className}>
      {children}
      {state && (
        <p className={`mt-3 text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "primary"
      ? "bg-ice-600 text-white hover:bg-ice-500"
      : "border border-rink-700 hover:border-ice-500 hover:text-ice-400";

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
