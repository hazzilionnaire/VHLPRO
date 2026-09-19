import { SetupNotice } from "@/components/setup-notice";
import { Card } from "@/components/ui";
import { supabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!supabaseConfigured()) return <SetupNotice />;

  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/admin";

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          For organizers and captains. Players don&apos;t need an account — just use the weekly RSVP
          link.
        </p>
      </div>

      <Card>
        <LoginForm next={target} />
      </Card>
    </div>
  );
}
