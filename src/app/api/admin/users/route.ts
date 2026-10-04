import { requireSuperAdmin } from "@/lib/auth/session";
import { listUsers, parseUserQuery } from "@/lib/services/platform-admin";
import { paginationMeta } from "@/lib/api/pagination";
import { apiRoute, jsonPage } from "@/lib/api/response";

export const GET = apiRoute(async (request: Request) => {
  await requireSuperAdmin();
  const query = parseUserQuery(new URL(request.url).searchParams);

  const { items, total } = await listUsers(query);
  return jsonPage(items, paginationMeta(query.pagination, total));
});
