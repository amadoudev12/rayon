import { requireSuperAdmin } from "@/lib/auth/session";
import { getOrganizationDetails, setOrganizationActive } from "@/lib/services/platform-admin";
import { adminStatusSchema } from "@/lib/validations/admin";
import { parseIntId } from "@/lib/api/pagination";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";

type RouteParams = { params: Promise<{ id: string }> };

export const GET = apiRoute(async (_request: Request, { params }: RouteParams) => {
  await requireSuperAdmin();
  const organizationId = parseIntId((await params).id);
  if (!organizationId) throw Errors.invalidId();

  const organization = await getOrganizationDetails(organizationId);
  if (!organization) throw Errors.notFound("Boutique introuvable");
  return jsonData(organization);
});

/** Suspend (`actif: false`) ou réactive (`actif: true`) une organisation. */
export const PATCH = apiRoute(async (request: Request, { params }: RouteParams) => {
  const admin = await requireSuperAdmin();
  const organizationId = parseIntId((await params).id);
  if (!organizationId) throw Errors.invalidId();

  const { actif } = adminStatusSchema.parse(await request.json());
  const organization = await setOrganizationActive(admin.userId, organizationId, actif);
  return jsonData(organization);
});
