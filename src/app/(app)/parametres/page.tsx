import { prisma } from "@/lib/prisma";
import { requirePageAuthContext, requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { Role } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { OrganizationForm } from "./OrganizationForm";
import { StoresSection } from "./StoresSection";
import { TeamSection } from "./TeamSection";

/** Section de réglages : titre et explication à gauche, contenu à droite (sur grand écran). */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-8 first:border-t-0 first:pt-0 lg:grid-cols-3 lg:gap-8">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-[13px] text-slate-500">{description}</p>
      </div>
      <Card className="overflow-hidden lg:col-span-2">{children}</Card>
    </section>
  );
}

export default async function SettingsPage() {
  const context = await requirePageAuthContext();
  requirePermission(context, "members:manage");

  const [organization, stores, members] = await Promise.all([
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId } }),
    prisma.boutique.findMany({ where: { organisationId: context.organizationId }, orderBy: { nom: "asc" } }),
    prisma.membre.findMany({
      where: { organisationId: context.organizationId },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, email: true } },
        boutique: { select: { id: true, nom: true } },
      },
      orderBy: { creeLe: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Paramètres" description="Organisation, boutiques et équipe." />

      <div className="space-y-8">
        <SettingsSection title="Organisation" description="Nom et devise utilisés dans toute l'application.">
          <OrganizationForm organization={organization} canEdit={can(context.role, "org:manage")} />
        </SettingsSection>

        <SettingsSection title="Boutiques" description="Chaque boutique a son propre stock et ses propres ventes.">
          <StoresSection stores={stores} canManage={can(context.role, "store:manage")} />
        </SettingsSection>

        <SettingsSection title="Équipe" description="Les personnes qui ont accès à votre organisation.">
          <TeamSection members={members} stores={stores} currentUserId={context.userId} ownerRole={Role.OWNER} />
        </SettingsSection>
      </div>
    </div>
  );
}
