import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const jobId = params.id;
    const admin = getSupabaseAdmin();
    const { data: job, error } = await admin
      .from("image_jobs")
      .select("id, user_id, source_url, style, status, steps, output_urls, error, created_at")
      .eq("id", jobId)
      .maybeSingle();
    if (error || !job || job.user_id !== user.id) {
      return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
    }

    const { data: assets } = await admin
      .from("image_assets")
      .select("id, kind, url, width, height, format, created_at")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      id: job.id,
      sourceUrl: job.source_url,
      style: job.style,
      status: job.status,
      steps: job.steps,
      outputUrls: job.output_urls ?? [],
      error: job.error,
      createdAt: job.created_at,
      assets: assets ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
