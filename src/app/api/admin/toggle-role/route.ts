import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Only allow m.harea@storepilot.ia
    if (user.email !== "m.harea@storepilot.ia") {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    const { newRole } = await request.json();
    
    if (!["admin", "user"].includes(newRole)) {
      return NextResponse.json(
        { error: "Rôle invalide" },
        { status: 400 }
      );
    }

    // Update profile role
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
