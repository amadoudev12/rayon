import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { productSchema } from "@/lib/validations/product";
import { createProduct } from "@/lib/services/product";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";
import { getPagination, getSort, paginationMeta } from "@/lib/api/pagination";

const SORT_FIELDS = ["creeLe", "nom", "prixVente"] as const;

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);

  const storeId = await resolveActiveStoreId(context, Number(searchParams.get("storeId")) || undefined);
  const search = searchParams.get("search")?.trim() ?? "";
  const categoryId = Number(searchParams.get("categoryId")) || undefined;
  const status = searchParams.get("status"); // "active" | "archived" | null (all)
  const pagination = getPagination(searchParams);
  const { sort, order } = getSort(searchParams, SORT_FIELDS, "creeLe");

  const where = {
    organisationId: context.organizationId,
    ...(categoryId ? { categorieId: categoryId } : {}),
    ...(status === "active" ? { actif: true } : status === "archived" ? { actif: false } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search } },
            { reference: { contains: search } },
            { codeBarres: { contains: search } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.produit.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        categorie: { select: { id: true, nom: true } },
        stocks: { where: { boutiqueId: storeId }, select: { quantite: true } },
      },
    }),
    prisma.produit.count({ where }),
  ]);

  const data = products.map(({ stocks, ...product }) => ({
    ...product,
    quantiteStock: stocks[0]?.quantite ?? 0,
  }));

  return jsonPage(data, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "product:manage");

  const parsed = productSchema.parse(await request.json());
  const storeId = await resolveActiveStoreId(context);
  const product = await createProduct(context, storeId, parsed);

  return jsonData(product, { status: 201 });
});
