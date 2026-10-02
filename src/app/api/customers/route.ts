import { prisma } from "@/lib/prisma";
import { containsText } from "@/lib/search";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { customerSchema } from "@/lib/validations/customer";
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
      ? { OR: [{ nom: containsText(search) }, { telephone: containsText(search) }] }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { nom: "asc" },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
      include: { _count: { select: { ventes: true } } },
    }),
    prisma.client.count({ where }),
  ]);

  return jsonPage(customers, paginationMeta(pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "customer:manage");

  const parsed = customerSchema.parse(await request.json());
  const customer = await prisma.client.create({
    data: {
      organisationId: context.organizationId,
      nom: parsed.nom,
      telephone: parsed.telephone || null,
      email: parsed.email || null,
      adresse: parsed.adresse || null,
    },
  });

  return jsonData(customer, { status: 201 });
});
