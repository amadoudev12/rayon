import { prisma } from "@/lib/prisma";
import { containsText } from "@/lib/search";
import { requirePageAuthContext } from "@/lib/auth/session";
import { getActiveStoreId } from "@/lib/auth/store";
import { can } from "@/lib/auth/permissions";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { SelectFilter } from "@/components/ui/SelectFilter";
import { Pagination } from "@/components/ui/Pagination";
import { ProductsTable } from "./ProductsTable";
import { NewProductButton } from "./NewProductButton";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const context = await requirePageAuthContext();
  const storeId = await getActiveStoreId(context);
  const canManage = can(context.role, "product:manage");

  const search = typeof params.search === "string" ? params.search.trim() : "";
  const categoryId = typeof params.categoryId === "string" ? Number(params.categoryId) || undefined : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const pagination = getPagination(new URLSearchParams(params as Record<string, string>));

  const where = {
    organisationId: context.organizationId,
    ...(categoryId ? { categorieId: categoryId } : {}),
    ...(status === "active" ? { actif: true } : status === "archived" ? { actif: false } : {}),
    ...(search
      ? { OR: [{ nom: containsText(search) }, { reference: containsText(search) }, { codeBarres: containsText(search) }] }
      : {}),
  };

  const [products, total, categories, organization] = await Promise.all([
    prisma.produit.findMany({
      where,
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: { categorie: { select: { id: true, nom: true } }, stocks: { where: { boutiqueId: storeId }, select: { quantite: true } } },
    }),
    prisma.produit.count({ where }),
    prisma.categorie.findMany({ where: { organisationId: context.organizationId }, orderBy: { nom: "asc" } }),
    prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId }, select: { devise: true } }),
  ]);

  // Convertit les champs Decimal en nombres : les Client Components ne
  // reçoivent que des props sérialisables, et le Decimal de Prisma est une classe.
  const data = products.map(({ stocks, prixAchat, prixVente, ...product }) => ({
    ...product,
    prixAchat: Number(prixAchat),
    prixVente: Number(prixVente),
    quantiteStock: stocks[0]?.quantite ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Produits"
        description="Gérez votre catalogue et vos prix."
        action={canManage ? <NewProductButton categories={categories} /> : undefined}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput placeholder="Rechercher un produit…" />
          <div className="flex gap-2">
            <SelectFilter
              paramName="categoryId"
              placeholder="Toutes les catégories"
              options={categories.map((category) => ({ value: String(category.id), label: category.nom }))}
            />
            <SelectFilter
              paramName="status"
              placeholder="Tous les statuts"
              options={[
                { value: "active", label: "Actifs" },
                { value: "archived", label: "Archivés" },
              ]}
            />
          </div>
        </div>

        <ProductsTable products={data} categories={categories} canManage={canManage} currency={organization.devise} />

        <Pagination
          basePath="/produits"
          searchParams={params}
          page={pagination.page}
          totalPages={paginationMeta(pagination, total).totalPages}
          total={total}
        />
      </Card>
    </div>
  );
}
