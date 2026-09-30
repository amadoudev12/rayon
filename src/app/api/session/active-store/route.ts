import { cookies } from "next/headers";
import { z } from "zod";
import { requireAuthContext, resolveActiveStoreId } from "@/lib/auth/session";
import { ACTIVE_STORE_COOKIE } from "@/lib/auth/store";
import { apiRoute, jsonMessage } from "@/lib/api/response";

const bodySchema = z.object({ storeId: z.coerce.number().int().positive() });

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  const { storeId } = bodySchema.parse(await request.json());

  // Validates the store belongs to the caller's organization before trusting it.
  const validStoreId = await resolveActiveStoreId(context, storeId);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_STORE_COOKIE, String(validStoreId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return jsonMessage("Boutique active mise à jour");
});
