import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { saleSchema } from "@/lib/validations/sale";
import { createSale } from "@/lib/services/sale";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";
import { Errors } from "@/lib/api/errors";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);

  const storeId = await resolveActiveStoreId(context, Number(searchParams.get("storeId")) || undefined);
  const search = searchParams.get("search")?.trim() ?? "";
  const date = searchParams.get("date") ?? "";
  const pagination = getPagination(searchParams, 10);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null;
  if (date && !selectedDate) throw Errors.conflict("Date de recherche invalide");

  const nextDay = selectedDate ? new Date(selectedDate) : null;
  nextDay?.setDate(nextDay.getDate() + 1);

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
    ...(selectedDate && nextDay ? { creeLe: { gte: selectedDate, lt: nextDay } } : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.vente.findMany({
      where,
      orderBy: { creeLe: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: {
        lignes: { include: { produit: { select: { id: true, nom: true } } } },
        client: { select: { id: true, nom: true } },
        vendeur: { select: { id: true, prenom: true, nom: true } },
      },
    }),
    prisma.vente.count({ where }),
  ]);

  return jsonPage(sales, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "sale:create");

  const body = await request.json();
  const parsed = saleSchema.parse(body);
  const storeId = await resolveActiveStoreId(context, parsed.boutiqueId);

  const sale = await createSale(context, storeId, parsed);
  return jsonData(sale, { status: 201 });
});
