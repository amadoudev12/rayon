import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { supplierSchema } from "@/lib/validations/supplier";
import { apiRoute, jsonData, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const PUT = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "supplier:manage");

  const supplierId = parseIntId((await params).id);
  if (!supplierId) throw Errors.invalidId();

  const parsed = supplierSchema.parse(await request.json());
  const updated = await prisma.fournisseur.updateMany({
    where: { id: supplierId, organisationId: context.organizationId },
    data: {
      nom: parsed.nom,
      telephone: parsed.telephone || null,
      email: parsed.email || null,
      adresse: parsed.adresse || null,
    },
  });
  if (updated.count === 0) throw Errors.notFound("Fournisseur introuvable");

  const supplier = await prisma.fournisseur.findUnique({ where: { id: supplierId } });
  return jsonData(supplier);
});

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "supplier:manage");

  const supplierId = parseIntId((await params).id);
  if (!supplierId) throw Errors.invalidId();

  const deleted = await prisma.fournisseur.deleteMany({
    where: { id: supplierId, organisationId: context.organizationId },
  });
  if (deleted.count === 0) throw Errors.notFound("Fournisseur introuvable");

  return jsonMessage("Fournisseur supprimé");
});
