function required(name: string): string {
  // Values pasted into a hosting dashboard pick up stray whitespace easily.
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * Reduce a pasted URL to its scheme and host.
 *
 * The Supabase dashboard offers several URLs, and the wrong one — or the right
 * one with a trailing slash — leaves a path that ends up doubled inside every
 * API call. The gateway then answers "Invalid path specified in request URL",
 * which tells you nothing about the cause. So take the origin and ignore the
 * rest: `https://x.supabase.co/rest/v1/` and `https://x.supabase.co/` both
 * become `https://x.supabase.co`.
 *
 * A missing scheme is the other common slip, and `new URL` rejects it, so try
 * again with https:// before giving up on the value.
 */
function originOnly(url: string): string {
  const trimmed = url.trim();

  for (const candidate of [trimmed, `https://${trimmed}`]) {
    try {
      return new URL(candidate).origin;
    } catch {
      // Not parseable as-is; fall through to the next candidate.
    }
  }

  return trimmed.replace(/\/+$/, "");
}

/**
 * True once Supabase credentials are present. Pages check this so a fresh
 * clone renders a setup notice instead of crashing before the project exists.
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export const env = {
  get supabaseUrl() {
    return originOnly(required("NEXT_PUBLIC_SUPABASE_URL"));
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  /**
   * Where the site lives, used to build the sign-in link's redirect. An
   * explicit value wins; on Vercel we fall back to the stable production
   * domain, which follows a custom domain once one is attached.
   */
  get siteUrl() {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return originOnly(explicit);

    // Vercel gives a bare host, with no scheme. originOnly supplies one, so
    // don't add a second here.
    const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelDomain) return originOnly(vercelDomain);

    return "http://localhost:3000";
  },
};
