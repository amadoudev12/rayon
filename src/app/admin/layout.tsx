import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requirePageSuperAdmin } from "@/lib/auth/session";
import { getPlatformAlerts } from "@/lib/services/platform";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Administration · Rayon" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Statut relu en base à chaque requête : tout autre compte est redirigé.
  // Chaque page revérifie de son côté (un layout n'est pas réexécuté à
  // chaque navigation).
  const admin = await requirePageSuperAdmin();

  const [user, alerts] = await Promise.all([
    prisma.utilisateur.findUniqueOrThrow({
      where: { id: admin.userId },
      select: { prenom: true, nom: true, email: true, telephone: true },
    }),
    getPlatformAlerts(),
  ]);

  return (
    <AdminShell user={user} alerts={alerts}>
      {children}
    </AdminShell>
  );
}
