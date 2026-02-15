import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/auth/signup
 * Creates a user with auto-confirmed email (no verification email sent).
 * Uses service role to bypass email confirmation requirement.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, deviceId } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    if (!deviceId || typeof deviceId !== "string" || deviceId.length < 8) {
      return NextResponse.json(
        { error: "Identifiant appareil invalide." },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();
    const userAgent = req.headers.get("user-agent") ?? null;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const pepper = process.env.SIGNUP_DEVICE_PEPPER ?? "fyxxlabs-device-v1";
    const deviceHash = createHash("sha256")
      .update(`${deviceId}:${pepper}`)
      .digest("hex");

    const { data: existingDevice } = await sb
      .from("signup_devices")
      .select("id, user_id")
      .eq("device_hash", deviceHash)
      .maybeSingle();

    if (existingDevice?.user_id) {
      return NextResponse.json(
        { error: "Un compte existe déjà sur cet appareil. Connecte-toi directement." },
        { status: 409 }
      );
    }

    // Create user with email already confirmed
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      // User already exists
      if (
        error.message.includes("already been registered") ||
        error.message.includes("already exists") ||
        error.message.includes("unique")
      ) {
        return NextResponse.json(
          { error: "Ce compte existe déjà. Connecte-toi à la place." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ensure profile row exists (trigger may handle this, but ensure)
    if (data.user) {
      const { error: deviceInsertError } = await sb
        .from("signup_devices")
        .insert({
          user_id: data.user.id,
          device_hash: deviceHash,
          ip_address: ip,
          user_agent: userAgent,
        });

      if (deviceInsertError) {
        await sb.auth.admin.deleteUser(data.user.id);
        if (
          deviceInsertError.message.includes("unique") ||
          deviceInsertError.message.includes("duplicate")
        ) {
          return NextResponse.json(
            { error: "Un compte existe déjà sur cet appareil." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "Impossible de valider cet appareil." },
          { status: 400 }
        );
      }

      const { error: profileError } = await sb
        .from("profiles")
        .upsert(
          {
            user_id: data.user.id,
            email: data.user.email,
            role: "user",
            plan: "trial",
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            scans_used: 0,
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        console.error("[signup] Profile upsert error:", profileError.message);
      }

      // Safety net: normalize subscription trial values if DB defaults are stale.
      const { error: subError } = await sb
        .from("subscriptions")
        .upsert(
          {
            user_id: data.user.id,
            status: "trialing",
            trial_start: new Date().toISOString(),
            trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            plan: "free",
            source: "manual",
            advice_consumed: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      if (subError) {
        console.error("[signup] Subscription upsert error:", subError.message);
      }
    }

    return NextResponse.json({ success: true, userId: data.user?.id });
  } catch (err: unknown) {
    console.error("[signup] Error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
