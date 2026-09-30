import { prisma } from "@/lib/prisma";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaleForm } from "./SaleForm";

export default async function NewSalePage() {
  const context = await requirePageAuthContext();
  const storeId = await getActiveStoreId(context);

  const [products, customers, organization] = await Promise.all([
    prisma.produit.findMany({
      where: { organisationId: context.organizationId, actif: true },
      select: {
        id: true,
        nom: true,
        unite: true,
        prixVente: true,
        stocks: { where: { boutiqueId: storeId }, select: { quantite: true } },
      },
      orderBy: { nom: "asc" },
    }),
    prisma.client.findMany({
      where: { organisationId: context.organizationId },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
  ]);

  const catalog = products.map(({ stocks, ...product }) => ({
    ...product,
    prixVente: Number(product.prixVente),
    quantiteStock: stocks[0]?.quantite ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Nouvelle vente" description="Ajoutez des produits au panier puis encaissez." />
      <SaleForm products={catalog} customers={customers} currency={organization.devise} />
    </div>
  );
}
