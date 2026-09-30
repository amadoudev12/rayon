import { cookies } from "next/headers";
import { resolveActiveStoreId, type AuthContext } from "./session";

export const ACTIVE_STORE_COOKIE = "active_store";

/**
 * Resolves which store a Server Component should render for: the member's
 * fixed store when restricted, otherwise whatever the store-switcher cookie
 * points to (still validated against the caller's own organization), else
 * the organization's default store.
 */
export async function getActiveStoreId(context: AuthContext): Promise<number> {
  if (context.membershipStoreId) return context.membershipStoreId;

  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
  const requested = raw ? Number(raw) : undefined;
  return resolveActiveStoreId(context, requested);
}
