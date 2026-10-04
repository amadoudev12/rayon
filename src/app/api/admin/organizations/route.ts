import { requireSuperAdmin } from "@/lib/auth/session";
import { createOrganizationWithOwner, listOrganizations, parseOrganizationQuery } from "@/lib/services/platform-admin";
import { adminCreateOrganizationSchema } from "@/lib/validations/admin";
import { paginationMeta } from "@/lib/api/pagination";
import { apiRoute, jsonData, jsonPage } from "@/lib/api/response";

export const GET = apiRoute(async (request: Request) => {
  await requireSuperAdmin();
  const query = parseOrganizationQuery(new URL(request.url).searchParams);

  const { items, total } = await listOrganizations(query);
  return jsonPage(items, paginationMeta(query.pagination, total));
});

export const POST = apiRoute(async (request: Request) => {
  const admin = await requireSuperAdmin();
  const parsed = adminCreateOrganizationSchema.parse(await request.json());

  const organization = await createOrganizationWithOwner(admin.userId, parsed);
  return jsonData(organization, { status: 201 });
});
