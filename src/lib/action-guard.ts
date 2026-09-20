import { unstable_rethrow } from "next/navigation";

export type ActionState = { ok: boolean; message: string } | null;

/**
 * Run a server action's body and turn an unexpected throw into a message the
 * person can read and repeat back, rather than a blank server-error page that
 * says nothing about what failed.
 *
 * Framework signals — redirect and notFound — travel as exceptions too, so
 * they are rethrown untouched.
 */
export async function runAction(body: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await body();
  } catch (error) {
    unstable_rethrow(error);

    const detail = error instanceof Error ? error.message : String(error);
    console.error("Server action failed:", error);

    return { ok: false, message: `Something went wrong: ${detail}` };
  }
}
