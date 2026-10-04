import { requireSuperAdmin } from "@/lib/auth/session";
import { getPlatformAnalytics, parseRange } from "@/lib/services/platform";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async (request: Request) => {
  await requireSuperAdmin();
  const { searchParams } = new URL(request.url);

  const analytics = await getPlatformAnalytics({
    range: parseRange(searchParams.get("range")),
    currency: searchParams.get("currency") ?? undefined,
  });

  return jsonData(analytics);
});
