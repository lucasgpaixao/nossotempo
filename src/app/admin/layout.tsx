import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return <AdminShell isAuthenticated={Boolean(admin)}>{children}</AdminShell>;
}
