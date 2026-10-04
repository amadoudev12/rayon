import { requireSuperAdmin } from "@/lib/auth/session";
import { getPlatformActivity, parseActivityQuery } from "@/lib/services/platform";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async (request: Request) => {
  await requireSuperAdmin();
  const activity = await getPlatformActivity(parseActivityQuery(new URL(request.url).searchParams));
  return jsonData(activity);
});
