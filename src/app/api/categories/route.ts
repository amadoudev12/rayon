import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/product";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();

  const categories = await prisma.categorie.findMany({
    where: { organisationId: context.organizationId },
    orderBy: { nom: "asc" },
    include: { _count: { select: { produits: true } } },
  });

  return jsonData(categories);
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "category:manage");

  const parsed = categorySchema.parse(await request.json());
  const category = await prisma.categorie.create({
    data: {
      organisationId: context.organizationId,
      nom: parsed.nom,
      description: parsed.description || null,
    },
  });

  return jsonData(category, { status: 201 });
});
