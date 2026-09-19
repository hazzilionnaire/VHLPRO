import { Card } from "@/components/ui";

/** Shown instead of league data until Supabase credentials are wired up. */
export function SetupNotice() {
  return (
    <Card>
      <h2 className="text-base font-semibold">Finish the setup</h2>
      <p className="mt-2 text-sm text-muted">
        This site has no Supabase project connected yet. Copy{" "}
        <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">.env.example</code> to{" "}
        <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">.env.local</code>, fill in the
        project URL and keys, then run the SQL in{" "}
        <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">supabase/migrations</code>.
        Full steps are in the README.
      </p>
    </Card>
  );
}
