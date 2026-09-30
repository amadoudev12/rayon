import { requireAuthContext, resolveActiveStoreId } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/services/dashboard";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { searchParams } = new URL(request.url);
  const requestedStoreId = Number(searchParams.get("storeId")) || undefined;

  // A restricted member is always forced onto their own store. An
  // unrestricted member may target one store (validated against their own
  // organization); with none requested, stats aggregate every store.
  const storeId = context.membershipStoreId
    ? context.membershipStoreId
    : requestedStoreId
      ? await resolveActiveStoreId(context, requestedStoreId)
      : null;

  const stats = await getDashboardStats(context, storeId);
  return jsonData(stats);
});
