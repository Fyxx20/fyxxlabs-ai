import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function parseEnvEmailList(raw?: string): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivilegedRoleOrEmail(role: string | null | undefined, email: string | null | undefined): boolean {
  if (role === "admin" || role === "super_admin") return true;
  const lower = (email ?? "").toLowerCase();
  if (!lower) return false;
  const adminEmails = parseEnvEmailList(process.env.ADMIN_EMAILS);
  const superAdminEmails = parseEnvEmailList(process.env.SUPER_ADMIN_EMAILS);
  return adminEmails.includes(lower) || superAdminEmails.includes(lower);
}

export async function updateSession(request: NextRequest) {
  try {
    let supabaseResponse = NextResponse.next({ request });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return supabaseResponse;
    }
    const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApp = pathname.startsWith("/app");
  const isAdminArea = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  const isUserAuth = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboarding = pathname.startsWith("/onboarding");

  // --- Admin: ne jamais aller sur /app ni /onboarding → direct /admin
  if ((isApp || isOnboarding) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (isPrivilegedRoleOrEmail(profile?.role, user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // --- Protected user app: require session + onboarding if needed + not banned
  if (isApp) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    const { data: appProfile } = await supabase
      .from("profiles")
      .select("is_banned")
      .eq("user_id", user.id)
      .single();
    if ((appProfile as { is_banned?: boolean } | null)?.is_banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "banned");
      return NextResponse.redirect(url);
    }
    const { data: onboarding } = await supabase
      .from("user_onboarding")
      .select("completed")
      .eq("user_id", user.id)
      .single();
    if (!onboarding?.completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // --- Protected admin area (except /admin/login): require session + role admin
  if (isAdminArea && !isAdminLogin) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (!isPrivilegedRoleOrEmail(profile?.role, user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  // --- Logged-in user sur page d'accueil : redirect admin → /admin, user → /app
  if (pathname === "/" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const url = request.nextUrl.clone();
    url.pathname = isPrivilegedRoleOrEmail(profile?.role, user.email)
      ? "/admin/dashboard"
      : "/app/dashboard";
    return NextResponse.redirect(url);
  }

  // --- Admin sur /admin/login → redirect dashboard admin
  if (pathname.startsWith("/admin/login") && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (isPrivilegedRoleOrEmail(profile?.role, user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

    return supabaseResponse;
  } catch (_err) {
    return NextResponse.next({ request });
  }
}
