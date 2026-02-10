import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/auth/signup
 * Creates a user with auto-confirmed email (no verification email sent).
 * Uses service role to bypass email confirmation requirement.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

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

    const sb = getSupabaseAdmin();

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
      const { error: profileError } = await sb
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            email: data.user.email,
            role: "user",
            plan: "free",
          },
          { onConflict: "id" }
        );

      if (profileError) {
        console.error("[signup] Profile upsert error:", profileError.message);
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
