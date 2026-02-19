import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getAppContext } from "@/lib/app/app-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  const user = ctx.user;
  if (!user) {
    redirect("/login");
  }

  if (ctx.isPrivileged) {
    redirect("/admin/dashboard");
  }

  return (
    <AppShell
      user={user}
      stores={ctx.stores}
      currentStoreId={ctx.currentStore?.id ?? null}
      subscription={ctx.subscription ?? null}
      entitlements={ctx.entitlements}
      userRole={ctx.profile?.role ?? null}
    >
      {children}
    </AppShell>
  );
}
