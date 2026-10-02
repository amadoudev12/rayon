import { prisma } from "@/lib/prisma";
import { containsText } from "@/lib/search";
import { requireAuthContext, resolveActiveStoreId } from "@/lib/auth/session";
import { apiRoute, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);

  const storeId = await resolveActiveStoreId(context, Number(searchParams.get("storeId")) || undefined);
  const search = searchParams.get("search")?.trim() ?? "";
  const lowStockOnly = searchParams.get("lowStock") === "true";
  const pagination = getPagination(searchParams);

  const where = {
    boutiqueId: storeId,
    produit: {
      organisationId: context.organizationId,
      actif: true,
      ...(search ? { nom: containsText(search) } : {}),
    },
  };

  const [stocks, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: { produit: { select: { id: true, nom: true, unite: true, seuilAlerte: true, prixVente: true } } },
      orderBy: { quantite: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.stock.count({ where }),
  ]);

  const filtered = lowStockOnly
    ? stocks.filter((stock) => stock.quantite <= stock.produit.seuilAlerte)
    : stocks;

  return jsonPage(filtered, paginationMeta(pagination, lowStockOnly ? filtered.length : total));
});
