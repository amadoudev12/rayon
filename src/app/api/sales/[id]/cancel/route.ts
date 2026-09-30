import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { cancelSale } from "@/lib/services/sale";
import { recordAuditLog } from "@/lib/api/audit";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const POST = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "sale:cancel");

  const saleId = parseIntId((await params).id);
  if (!saleId) throw Errors.invalidId();

  const sale = await cancelSale(context, saleId);

  await recordAuditLog({
    organisationId: context.organizationId,
    utilisateurId: context.userId,
    action: "sale.cancelled",
    entite: "Sale",
    entiteId: saleId,
  });

  return jsonData(sale);
});
