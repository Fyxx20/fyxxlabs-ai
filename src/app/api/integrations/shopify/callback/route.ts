import { NextResponse } from "next/server";
import { getConnector } from "@/lib/connectors/registry";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const hmac = searchParams.get("hmac");
  const state = searchParams.get("state");

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
    await connector.handleCallback({
      code,
      state: state ?? "",
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
  return NextResponse.redirect(`${appUrl}/app/integrations?shopify=connected`);
}
