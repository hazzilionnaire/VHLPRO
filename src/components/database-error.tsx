import { Card } from "@/components/ui";

/**
 * Shown when the server can reach Supabase but is turned away. Nearly always a
 * wrong SUPABASE_SERVICE_ROLE_KEY, which otherwise just looks like an empty
 * league.
 */
export function DatabaseError({ message }: { message: string }) {
  return (
    <Card className="border-rose-500/40">
      <h2 className="text-base font-semibold text-rose-300">Can&apos;t read the database</h2>
      <p className="mt-2 text-sm text-muted">
        The site reached Supabase but wasn&apos;t allowed in. Check that{" "}
        <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
        holds the <strong>secret</strong> key from Supabase, not the public one — they look alike
        and nothing else reports the difference.
      </p>
      <p className="mt-3 font-mono text-xs break-words text-rose-300/80">{message}</p>
    </Card>
  );
}
