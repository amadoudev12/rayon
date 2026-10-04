import { requireSuperAdmin } from "@/lib/auth/session";
import { getPlatformOverview, getPlatformAlerts, parseRange } from "@/lib/services/platform";
import { apiRoute, jsonData } from "@/lib/api/response";

/** Chiffres clés de la plateforme : une seule requête HTTP pour toutes les cartes. */
export const GET = apiRoute(async (request: Request) => {
  await requireSuperAdmin();
  const { searchParams } = new URL(request.url);

  const [overview, alerts] = await Promise.all([
    getPlatformOverview({
      range: parseRange(searchParams.get("range")),
      currency: searchParams.get("currency") ?? undefined,
    }),
    getPlatformAlerts(),
  ]);

  return jsonData({ ...overview, alerts });
});
