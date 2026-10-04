import { requireSuperAdmin } from "@/lib/auth/session";
import { updateSuperAdminProfile } from "@/lib/services/platform-admin";
import { adminProfileSchema } from "@/lib/validations/admin";
import { apiRoute, jsonData } from "@/lib/api/response";

export const PATCH = apiRoute(async (request: Request) => {
  const admin = await requireSuperAdmin();
  const parsed = adminProfileSchema.parse(await request.json());

  const profile = await updateSuperAdminProfile(admin.userId, parsed);
  return jsonData(profile);
});
