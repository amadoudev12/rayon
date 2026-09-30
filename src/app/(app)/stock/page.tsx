import { prisma } from "@/lib/prisma";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { can } from "@/lib/auth/permissions";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SelectFilter } from "@/components/ui/SelectFilter";
import { Pagination } from "@/components/ui/Pagination";
import { StockTable } from "./StockTable";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function StockPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  const storeId = await getActiveStoreId(context);
  const canAdjust = can(context.role, "stock:adjust");

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const lowStockOnly = params.lowStock === "true";
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>), 20);

  const where = {
    boutiqueId: storeId,
    produit: {
      organisationId: context.organizationId,
      actif: true,
      ...(search ? { nom: { contains: search } } : {}),
    },
  };

  const [stocksRaw, total, organization] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: { produit: { select: { id: true, nom: true, unite: true, seuilAlerte: true, prixVente: true } } },
      orderBy: { quantite: "asc" },
    }),
    prisma.stock.count({ where }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
  ]);

  const filtered = lowStockOnly ? stocksRaw.filter((s) => s.quantite <= s.produit.seuilAlerte) : stocksRaw;
  const pageItems = filtered
    .slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit)
    .map((stock) => ({ ...stock, produit: { ...stock.produit, prixVente: Number(stock.produit.prixVente) } }));
  const effectiveTotal = lowStockOnly ? filtered.length : total;

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Suivez les quantités disponibles et corrigez-les si besoin."
        action={
          <LinkButton href="/stock/mouvements" variant="secondary">
            <Icon name="history" className="h-4 w-4" />
            Historique des mouvements
          </LinkButton>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput placeholder="Rechercher un produit…" />
          <SelectFilter
            paramName="lowStock"
            placeholder="Tous les produits"
            options={[{ value: "true", label: "Stock faible uniquement" }]}
          />
        </div>

        <StockTable stocks={pageItems} canAdjust={canAdjust} currency={organization.devise} />

        <Pagination
          basePath="/stock"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, effectiveTotal).totalPages}
          total={effectiveTotal}
        />
      </Card>
    </div>
  );
}
