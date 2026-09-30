import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { customerSchema } from "@/lib/validations/customer";
import { apiRoute, jsonData, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const PUT = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "customer:manage");

  const customerId = parseIntId((await params).id);
  if (!customerId) throw Errors.invalidId();

  const parsed = customerSchema.parse(await request.json());
  const updated = await prisma.client.updateMany({
    where: { id: customerId, organisationId: context.organizationId },
    data: {
      nom: parsed.nom,
      telephone: parsed.telephone || null,
      email: parsed.email || null,
      adresse: parsed.adresse || null,
    },
  });
  if (updated.count === 0) throw Errors.notFound("Client introuvable");

  const customer = await prisma.client.findUnique({ where: { id: customerId } });
  return jsonData(customer);
});

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "customer:manage");

  const customerId = parseIntId((await params).id);
  if (!customerId) throw Errors.invalidId();

  const deleted = await prisma.client.deleteMany({
    where: { id: customerId, organisationId: context.organizationId },
  });
  if (deleted.count === 0) throw Errors.notFound("Client introuvable");

  return jsonMessage("Client supprimé");
});
