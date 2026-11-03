import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Pages anyone can open without signing in. */
const PUBLIC_PATHS = ["/login"];

/**
 * Runs on every request (see /middleware.ts):
 *  - refreshes the Supabase login session cookie
 *  - sends signed-out visitors to /login, and signed-in visitors away from /login
 */
/** A readable page instead of Vercel's "MIDDLEWARE_INVOCATION_FAILED". */
const setupError = (title: string, detail: string) =>
  new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Setup needed</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#222;line-height:1.55">
<h2 style="margin-bottom:6px">⚠️ ${title}</h2><p>${detail}</p>
<p style="color:#666;font-size:14px">On Vercel: Project → Settings → Environment Variables → add the missing value(s) → Deployments → ⋯ → Redeploy.</p>
</body></html>`,
    { status: 500, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );

export async function updateSession(request: NextRequest) {
  // NEXT_PUBLIC_ values are baked in when the app is BUILT — adding them later needs a redeploy.
  const missing = [!supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL", !supabaseKey && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean);
  if (missing.length) {
    console.error("Middleware: missing environment variables:", missing.join(", "));
    return setupError("Supabase settings are missing", `This deployment was built without: <b>${missing.join(", ")}</b>.`);
  }

  try {
    return await refreshAndGuard(request);
  } catch (e) {
    console.error("Middleware failed:", e);
    return setupError(
      "Couldn't check your sign-in",
      "The app couldn't reach Supabase. Check that NEXT_PUBLIC_SUPABASE_URL is correct (https://xxxx.supabase.co) and that the Supabase project isn't paused, then try again."
    );
  }
}

async function refreshAndGuard(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => supabaseResponse.headers.set(k, v));
      },
    },
  });

  // Do not put code between createServerClient and getClaims(): it verifies + refreshes the session.
  // (Verified locally when the project uses asymmetric JWT keys — no round trip to Supabase.)
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? { id: data.claims.sub } : null;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !isPublic) return redirectTo("/login");
  if (user && pathname === "/login") return redirectTo("/");
  return supabaseResponse;
}
