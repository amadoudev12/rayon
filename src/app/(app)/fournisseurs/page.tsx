import { prisma } from "@/lib/prisma";
import { requirePageAuthContext, requirePermission } from "@/lib/auth/session";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { SuppliersTable } from "./SuppliersTable";
import { NewSupplierButton } from "./NewSupplierButton";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  requirePermission(context, "supplier:manage");

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>));

  const where = {
    organisationId: context.organizationId,
    ...(search ? { OR: [{ nom: { contains: search } }, { telephone: { contains: search } }] } : {}),
  };

  const [suppliers, total] = await Promise.all([
    prisma.fournisseur.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: { _count: { select: { achats: true } } },
    }),
    prisma.fournisseur.count({ where }),
  ]);

  return (
    <div>
      <PageHeader title="Fournisseurs" description="Vos partenaires d'approvisionnement." action={<NewSupplierButton />} />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <SearchInput placeholder="Rechercher un fournisseur…" />
        </div>

        <SuppliersTable suppliers={suppliers} />

        <Pagination
          basePath="/fournisseurs"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
