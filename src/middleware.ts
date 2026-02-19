import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    return await import("next/server").then((m) => m.NextResponse.next({ request }));
  }
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*", "/login", "/signup", "/onboarding", "/api/:path*"],
};
