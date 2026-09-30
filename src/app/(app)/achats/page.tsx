import { prisma } from "@/lib/prisma";
import { requirePageAuthContext, requirePermission } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { PurchasesTable } from "./PurchasesTable";
import { NewPurchaseButton } from "./NewPurchaseButton";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  requirePermission(context, "purchase:manage");
  const storeId = await getActiveStoreId(context);
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>), 10);

  const where = { organisationId: context.organizationId, boutiqueId: storeId };

  const [purchases, total, organization, products, suppliers] = await Promise.all([
    prisma.achat.findMany({
      where,
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        lignes: { select: { id: true, quantite: true, produit: { select: { id: true, nom: true } } } },
        fournisseur: { select: { id: true, nom: true } },
      },
    }),
    prisma.achat.count({ where }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
    prisma.produit.findMany({
      where: { organisationId: context.organizationId, actif: true },
      select: { id: true, nom: true, unite: true, prixAchat: true },
      orderBy: { nom: "asc" },
    }),
    prisma.fournisseur.findMany({
      where: { organisationId: context.organizationId },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Achats"
        description="Enregistrez vos approvisionnements fournisseurs."
        action={
          <NewPurchaseButton
            products={products.map((p) => ({ ...p, prixAchat: Number(p.prixAchat) }))}
            suppliers={suppliers}
            currency={organization.devise}
          />
        }
      />

      <Card>
        <PurchasesTable
          purchases={purchases.map((purchase) => ({ ...purchase, total: Number(purchase.total) }))}
          currency={organization.devise}
        />

        <Pagination
          basePath="/achats"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
