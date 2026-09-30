import { prisma } from "@/lib/prisma";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const context = await requirePageAuthContext();

  const [organization, stores, user] = await Promise.all([
    prisma.organisation.findUniqueOrThrow({
      where: { id: context.organizationId },
      select: { nom: true, devise: true },
    }),
    prisma.boutique.findMany({
      where: { organisationId: context.organizationId },
      select: { id: true, nom: true },
      orderBy: [{ parDefaut: "desc" }, { nom: "asc" }],
    }),
    prisma.utilisateur.findUniqueOrThrow({
      where: { id: context.userId },
      select: { prenom: true, nom: true, email: true },
    }),
  ]);

  const activeStoreId = await getActiveStoreId(context);

  return (
    <AppShell
      user={user}
      organization={organization}
      role={context.role}
      stores={stores}
      activeStoreId={context.membershipStoreId ? null : activeStoreId}
    >
      {children}
    </AppShell>
  );
}
