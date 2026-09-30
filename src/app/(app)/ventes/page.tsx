
import { prisma } from "@/lib/prisma";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { can } from "@/lib/auth/permissions";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LinkButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SalesTable } from "./SalesTable";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SalesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  const storeId = await getActiveStoreId(context);
  const canCancel = can(context.role, "sale:cancel");

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>), 10);

  const where = {
    organisationId: context.organizationId,
    boutiqueId: storeId,
    ...(search
      ? {
          OR: [
            { lignes: { some: { produit: { nom: { contains: search } } } } },
            { client: { nom: { contains: search } } },
          ],
        }
      : {}),
  };

  const [sales, total, organization] = await Promise.all([
    prisma.vente.findMany({
      where,
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        lignes: { select: { id: true, quantite: true, produit: { select: { id: true, nom: true } } } },
        client: { select: { id: true, nom: true } },
        vendeur: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    prisma.vente.count({ where }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
  ]);

  // On ne garde que les champs utilisés par SalesTable et on convertit les
  // Decimal en nombre : les Client Components n'acceptent que des props
  // sérialisables (sousTotal, remise et montantPaye sont aussi des Decimal,
  // on ne peut donc pas transmettre la vente telle quelle avec un spread).
  const salesForClient = sales.map((sale) => ({
    id: sale.id,
    statut: sale.statut,
    total: Number(sale.total),
    creeLe: sale.creeLe,
    lignes: sale.lignes,
    client: sale.client,
    vendeur: sale.vendeur,
  }));

  return (
    <div>
      <PageHeader
        title="Ventes"
        description="Historique des ventes de cette boutique."
        action={
          <LinkButton href="/ventes/nouvelle">
            <Icon name="plus" className="h-4 w-4" />
            Nouvelle vente
          </LinkButton>
        }
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <SearchInput placeholder="Rechercher par produit ou client…" />
        </div>

        <SalesTable sales={salesForClient} canCancel={canCancel} currency={organization.devise} />

        <Pagination
          basePath="/ventes"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
