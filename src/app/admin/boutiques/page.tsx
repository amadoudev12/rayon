import { requirePageSuperAdmin } from "@/lib/auth/session";
import { listOrganizations, parseOrganizationQuery } from "@/lib/services/platform-admin";
import { INACTIVITY_DAYS } from "@/lib/services/platform";
import { paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SelectFilter } from "@/components/ui/SelectFilter";
import { Pagination } from "@/components/ui/Pagination";
import { formatRelative } from "@/lib/format";
import { OrganizationsTable } from "./OrganizationsTable";
import { NewOrganizationButton } from "./NewOrganizationButton";

type SearchParams = Record<string, string | string[] | undefined>;

const STATUS_OPTIONS = [
  { value: "active", label: "Actives" },
  { value: "inactive", label: "Inactives" },
  { value: "suspended", label: "Suspendues" },
  { value: "nosales", label: "Sans aucune vente" },
];

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requirePageSuperAdmin();
  const params = await searchParams;
  const query = parseOrganizationQuery(new URLSearchParams(params as Record<string, string>));

  const { items, total } = await listOrganizations(query);
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Boutiques"
        description={`${total} boutique(s) · « inactive » = aucune activité depuis ${INACTIVITY_DAYS} jours.`}
        action={<NewOrganizationButton defaultOpen={params.new === "1"} />}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <SearchInput placeholder="Rechercher une boutique, un propriétaire, un email, un téléphone…" />
          <SelectFilter paramName="status" options={STATUS_OPTIONS} placeholder="Tous les statuts" />
        </div>

        <OrganizationsTable
          filtered={Boolean(query.search || query.status)}
          organizations={items.map((item) => ({
            id: item.id,
            nom: item.nom,
            devise: item.devise,
            actif: item.actif,
            creeLe: item.creeLe,
            owner: item.owner,
            stores: item.stores,
            products: item.products,
            sales: item.sales,
            revenue: item.revenue,
            status: item.status,
            lastActivityLabel: item.lastActivity ? formatRelative(item.lastActivity, now) : null,
          }))}
        />

        <Pagination
          basePath="/admin/boutiques"
          searchParams={params}
          page={query.pagination.page}
          totalPages={paginationMeta(query.pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
