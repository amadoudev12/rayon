import { requireAuthContext } from "@/lib/auth/session";
import { getAccountProfile } from "@/lib/services/account";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();
  return jsonData(await getAccountProfile(context));
});
