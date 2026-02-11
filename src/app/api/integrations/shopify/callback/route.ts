import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors/registry";

function getCookieValue(request: Request, cookieName: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  const chunks = raw.split(";").map((entry) => entry.trim());
  const prefix = `${cookieName}=`;
  const found = chunks.find((entry) => entry.startsWith(prefix));
  if (!found) return null;
  return decodeURIComponent(found.slice(prefix.length));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const hmac = searchParams.get("hmac");
  const stateFromQuery = searchParams.get("state");
  const stateFromCookie = getCookieValue(request, "fyxx_shopify_store_id");
  const state = stateFromQuery || stateFromCookie;

  if (!code || !shop) {
    return NextResponse.redirect(
      new URL("/app/integrations?error=shopify_callback_missing", request.url)
    );
  }

  const connector = getConnector("shopify");
  if (!connector?.handleCallback) {
    return NextResponse.redirect(
      new URL("/app/integrations?error=shopify_unavailable", request.url)
    );
  }

  try {
    if (!state) {
      return NextResponse.redirect(
        new URL("/app/integrations?error=shopify_state_missing", request.url)
      );
    }

    await connector.handleCallback({
      code,
      state,
      shop,
      hmac: hmac ?? undefined,
    });
  } catch (e) {
    const message = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(
      new URL(`/app/integrations?error=shopify_${message}`, request.url)
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "http://localhost:3000";
  const response = NextResponse.redirect(`${appUrl}/app/integrations?shopify=connected`);
  response.cookies.set("fyxx_shopify_store_id", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
