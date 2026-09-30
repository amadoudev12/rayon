import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { purchaseSchema } from "@/lib/validations/purchase";
import { createPurchase } from "@/lib/services/purchase";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);

  const storeId = await resolveActiveStoreId(context, Number(searchParams.get("storeId")) || undefined);
  const pagination = getPagination(searchParams, 10);

  const where = { organisationId: context.organizationId, boutiqueId: storeId };

  const [purchases, total] = await Promise.all([
    prisma.achat.findMany({
      where,
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        lignes: { include: { produit: { select: { id: true, nom: true } } } },
        fournisseur: { select: { id: true, nom: true } },
      },
    }),
    prisma.achat.count({ where }),
  ]);

  return jsonPage(purchases, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "purchase:manage");

  const body = await request.json();
  const parsed = purchaseSchema.parse(body);
  const storeId = await resolveActiveStoreId(context, parsed.boutiqueId);

  const purchase = await createPurchase(context, storeId, parsed);
  return jsonData(purchase, { status: 201 });
});
