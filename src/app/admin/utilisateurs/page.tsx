import { requirePageSuperAdmin } from "@/lib/auth/session";
import { listUsers, parseUserQuery } from "@/lib/services/platform-admin";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { Role } from "@/generated/prisma/enums";
import { paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SelectFilter } from "@/components/ui/SelectFilter";
import { Pagination } from "@/components/ui/Pagination";
import { formatRelative } from "@/lib/format";
import { UsersTable } from "./UsersTable";

type SearchParams = Record<string, string | string[] | undefined>;

const ROLE_OPTIONS = [
  ...Object.values(Role).map((role) => ({ value: role, label: ROLE_LABELS[role] })),
  { value: "SUPER_ADMIN", label: "Super administrateur" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Actifs" },
  { value: "disabled", label: "Désactivés" },
  { value: "onboarding", label: "Inscription inachevée" },
];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageSuperAdmin();
  const params = await searchParams;
  const query = parseUserQuery(new URLSearchParams(params as Record<string, string>));

  const { items, total } = await listUsers(query);
  const now = new Date();

  return (
    <div>
      <PageHeader title="Utilisateurs" description={`${total} compte(s) sur la plateforme, toutes boutiques confondues.`} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder="Rechercher un nom, un email, un téléphone, une boutique…" />
          <SelectFilter paramName="role" options={ROLE_OPTIONS} placeholder="Tous les rôles" />
          <SelectFilter paramName="status" options={STATUS_OPTIONS} placeholder="Tous les statuts" />
        </div>

        <UsersTable
          filtered={Boolean(query.search || query.role || query.status)}
          users={items.map((item) => ({
            id: item.id,
            prenom: item.prenom,
            nom: item.nom,
            email: item.email,
            telephone: item.telephone,
            superAdmin: item.superAdmin,
            actif: item.actif,
            creeLe: item.creeLe,
            roleLabel: item.role ? ROLE_LABELS[item.role] : null,
            organization: item.organization,
            storeName: item.storeName,
            lastActivityLabel: item.derniereActiviteLe ? formatRelative(item.derniereActiviteLe, now) : null,
          }))}
        />

        <Pagination
          basePath="/admin/utilisateurs"
          searchParams={params}
          page={query.pagination.page}
          totalPages={paginationMeta(query.pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
