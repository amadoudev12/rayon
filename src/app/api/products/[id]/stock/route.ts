import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { stockAdjustmentSchema } from "@/lib/validations/product";
import { adjustStock } from "@/lib/services/stock";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const POST = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "stock:adjust");

  const productId = parseIntId((await params).id);
  if (!productId) throw Errors.invalidId();

  const body = await request.json();
  const parsed = stockAdjustmentSchema.parse(body);
  const storeId = await resolveActiveStoreId(context, body.boutiqueId ? Number(body.boutiqueId) : undefined);

  const stock = await adjustStock(context, storeId, productId, parsed);
  return jsonData(stock);
});
