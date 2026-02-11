import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabaseAdmin";
import { AdminShell } from "@/components/admin-shell";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin(createServerSupabaseClient);
  if (!auth.ok) {
    redirect("/admin/login?error=unauthorized");
  }

  return <AdminShell user={auth.user} userRole={auth.profile.role}>{children}</AdminShell>;
}
