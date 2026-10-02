import { prisma } from "@/lib/prisma";
import { containsText } from "@/lib/search";
import { requirePageAuthContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { CustomersTable } from "./CustomersTable";
import { NewCustomerButton } from "./NewCustomerButton";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  const canManage = can(context.role, "customer:manage");

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>));

  const where = {
    organisationId: context.organizationId,
    ...(search ? { OR: [{ nom: containsText(search) }, { telephone: containsText(search) }] } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: { _count: { select: { ventes: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Votre carnet de clients."
        action={canManage ? <NewCustomerButton /> : undefined}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <SearchInput placeholder="Rechercher un client…" />
        </div>

        <CustomersTable customers={customers} canManage={canManage} />

        <Pagination
          basePath="/clients"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
