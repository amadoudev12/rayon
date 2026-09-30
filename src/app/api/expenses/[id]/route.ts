import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { apiRoute, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "expense:manage");

  const expenseId = parseIntId((await params).id);
  if (!expenseId) throw Errors.invalidId();

  const deleted = await prisma.depense.deleteMany({
    where: { id: expenseId, organisationId: context.organizationId },
  });
  if (deleted.count === 0) throw Errors.notFound("Dépense introuvable");

  return jsonMessage("Dépense supprimée");
});
