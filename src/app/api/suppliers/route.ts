import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { supplierSchema } from "@/lib/validations/supplier";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";
import { getPagination, paginationMeta } from "@/lib/api/pagination";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const pagination = getPagination(searchParams);

  const where = {
    organisationId: context.organizationId,
    ...(search
      ? { OR: [{ nom: { contains: search } }, { telephone: { contains: search } }] }
      : {}),
  };

  const [suppliers, total] = await Promise.all([
    prisma.fournisseur.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: { _count: { select: { achats: true } } },
    }),
    prisma.fournisseur.count({ where }),
  ]);

  return jsonPage(suppliers, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "supplier:manage");

  const parsed = supplierSchema.parse(await request.json());
  const supplier = await prisma.fournisseur.create({
    data: {
      organisationId: context.organizationId,
      nom: parsed.nom,
      telephone: parsed.telephone || null,
      email: parsed.email || null,
      adresse: parsed.adresse || null,
    },
  });

  return jsonData(supplier, { status: 201 });
});
