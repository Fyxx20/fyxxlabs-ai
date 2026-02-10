import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { full_name } = body;

  if (full_name !== undefined) {
    // Update Supabase Auth user metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name },
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Also update profile table
    await supabase
      .from("profiles")
      .update({ full_name, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, message: "Profil mis à jour" });
}
