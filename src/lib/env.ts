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
 * Supabase's gateway rejects a doubled slash with "Invalid path specified in
 * request URL", so a project URL copied with a trailing slash breaks every
 * call. Drop it rather than make that someone's afternoon.
 */
function originOnly(url: string): string {
  return url.replace(/\/+$/, "");
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

    const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelDomain) return `https://${originOnly(vercelDomain)}`;

    return "http://localhost:3000";
  },
};
