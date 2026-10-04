import { requireSuperAdmin } from "@/lib/auth/session";
import { setUserActive } from "@/lib/services/platform-admin";
import { adminStatusSchema } from "@/lib/validations/admin";
import { parseIntId } from "@/lib/api/pagination";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";

/** Désactive (`actif: false`) ou réactive (`actif: true`) un compte utilisateur. */
export const PATCH = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireSuperAdmin();
  const userId = parseIntId((await params).id);
  if (!userId) throw Errors.invalidId();

  const { actif } = adminStatusSchema.parse(await request.json());
  const user = await setUserActive(admin.userId, userId, actif);
  return jsonData(user);
});
