import { prisma } from "@/lib/prisma";
import { requireAuthContext, resolveActiveStoreId } from "@/lib/auth/session";
import { apiRoute, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);

  const storeId = await resolveActiveStoreId(context, Number(searchParams.get("storeId")) || undefined);
  const productId = Number(searchParams.get("productId")) || undefined;
  const pagination = getPagination(searchParams, 30);

  const where = { boutiqueId: storeId, ...(productId ? { produitId: productId } : {}) };

  const [movements, total] = await Promise.all([
    prisma.mouvementStock.findMany({
      where,
      include: {
        produit: { select: { id: true, nom: true, unite: true } },
        utilisateur: { select: { prenom: true, nom: true } },
      },
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.mouvementStock.count({ where }),
  ]);

  return jsonPage(movements, paginationMeta(pagination, total));
});
