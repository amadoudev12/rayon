import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { expenseSchema } from "@/lib/validations/expense";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);
  const pagination = getPagination(searchParams, 20);

  const where = { organisationId: context.organizationId };

  const [expenses, total] = await Promise.all([
    prisma.depense.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.depense.count({ where }),
  ]);

  return jsonPage(expenses, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "expense:manage");

  const body = await request.json();
  const parsed = expenseSchema.parse(body);
  const storeId = parsed.boutiqueId ? await resolveActiveStoreId(context, parsed.boutiqueId) : null;

  const expense = await prisma.depense.create({
    data: {
      organisationId: context.organizationId,
      boutiqueId: storeId,
      categorie: parsed.categorie,
      libelle: parsed.libelle,
      montant: parsed.montant,
      note: parsed.note || null,
      date: parsed.date ?? new Date(),
      creeParId: context.userId,
    },
  });

  return jsonData(expense, { status: 201 });
});
