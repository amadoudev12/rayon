import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/product";
import { apiRoute, jsonData, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const PUT = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "category:manage");

  const categoryId = parseIntId((await params).id);
  if (!categoryId) throw Errors.invalidId();

  const parsed = categorySchema.parse(await request.json());
  const updated = await prisma.categorie.updateMany({
    where: { id: categoryId, organisationId: context.organizationId },
    data: { nom: parsed.nom, description: parsed.description || null },
  });
  if (updated.count === 0) throw Errors.notFound("Catégorie introuvable");

  const category = await prisma.categorie.findUnique({ where: { id: categoryId } });
  return jsonData(category);
});

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "category:manage");

  const categoryId = parseIntId((await params).id);
  if (!categoryId) throw Errors.invalidId();

  const deleted = await prisma.categorie.deleteMany({
    where: { id: categoryId, organisationId: context.organizationId },
  });
  if (deleted.count === 0) throw Errors.notFound("Catégorie introuvable");

  return jsonMessage("Catégorie supprimée");
});
