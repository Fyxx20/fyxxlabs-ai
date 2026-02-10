import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Role-based admin check (profiles.role === 'admin' OR in ADMIN_EMAILS env)
    const adminCheck = await requireAdmin(createServerSupabaseClient);
    if (!adminCheck.ok) return adminCheck.error;
    const { user } = adminCheck;

    const { newRole } = await request.json();
    
    if (!["admin", "user"].includes(newRole)) {
      return NextResponse.json(
        { error: "Rôle invalide" },
        { status: 400 }
      );
    }

    // Update profile role using a fresh server client
    const supabase = await createServerSupabaseClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Erreur mise à jour profil:", updateError);
      return NextResponse.json(
        { error: "Erreur mise à jour profil" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Rôle changé en ${newRole}`,
      newRole
    });

  } catch (error) {
    console.error("API erreur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
