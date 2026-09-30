import { cache } from "react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@/generated/prisma/enums";

/** Tenant-scoped identity resolved from the current session. Every API
 * route and Server Component must derive `organizationId` from here —
 * never from a client-supplied value — so data stays isolated per tenant. */
export type AuthContext = {
  userId: number;
  organizationId: number;
  role: Role;
  /** Non-null when this member is restricted to a single store. */
  membershipStoreId: number | null;
};

/**
 * Route qui ferme une session devenue invalide (membre retiré, compte
 * supprimé) : elle efface le cookie de session puis renvoie vers /login.
 */
export const SESSION_EXPIRED_PATH = "/api/session/expired";

/** Returns the raw session, or null when the request is unauthenticated. */
export async function getSession() {
  return getServerSession(authOptions);
}

/**
 * Lit en base l'état réel du compte : le JWT n'est qu'une photo prise à la
 * connexion (valable 30 jours) et ne doit jamais servir à autoriser un accès.
 * Mis en cache pour la durée d'une requête (layout + page = une seule lecture).
 */
const loadAccount = cache(async (userId: number) => {
  return prisma.utilisateur.findUnique({
    where: { id: userId },
    select: { membre: { select: { role: true, organisationId: true, boutiqueId: true } } },
  });
});

type AccountState =
  | { status: "anonymous" }
  /** Session présente mais compte supprimé, ou accès à l'organisation retiré. */
  | { status: "revoked" }
  /** Compte valide qui n'a pas encore créé son organisation. */
  | { status: "onboarding"; userId: number }
  | { status: "member"; context: AuthContext };

async function resolveAccount(): Promise<AccountState> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return { status: "anonymous" };

  const account = await loadAccount(userId);
  if (!account) return { status: "revoked" };

  if (!account.membre) {
    // Le jeton indique une organisation que la base ne connaît plus : le
    // membre a été retiré. Sinon, l'inscription n'est simplement pas terminée.
    return session.user.tenant ? { status: "revoked" } : { status: "onboarding", userId };
  }

  return {
    status: "member",
    context: {
      userId,
      organizationId: account.membre.organisationId,
      role: account.membre.role,
      membershipStoreId: account.membre.boutiqueId,
    },
  };
}

/** Returns the authenticated user id even if onboarding isn't finished yet. */
export async function getAuthenticatedUserId(): Promise<number | null> {
  const state = await resolveAccount();
  if (state.status === "member") return state.context.userId;
  if (state.status === "onboarding") return state.userId;
  return null;
}

/** Throws 401 if the request has no valid session (or the account no longer exists). */
export async function requireUserId(): Promise<number> {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw Errors.unauthenticated();
  return userId;
}

/**
 * Full tenant context: authenticated AND onboarded (has an organization).
 * Throws 401 when not authenticated or when access was revoked, 409 when
 * onboarding is incomplete.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const state = await resolveAccount();
  if (state.status === "anonymous") throw Errors.unauthenticated();
  if (state.status === "revoked") throw Errors.accessRevoked();
  if (state.status === "onboarding") throw Errors.onboardingRequired();
  return state.context;
}

/**
 * Same contract as `requireAuthContext`, for Server Components/layouts:
 * redirects instead of throwing, since Proxy only does an optimistic
 * pre-check and every page must still verify auth itself (defense in
 * depth — see Next.js's Data Access Layer guidance).
 */
export async function requirePageAuthContext(): Promise<AuthContext> {
  const state = await resolveAccount();
  if (state.status === "anonymous") redirect("/login");
  // Le cookie de session doit être effacé, sinon le Proxy (qui lit encore
  // l'ancien jeton) renverrait en boucle vers le tableau de bord.
  if (state.status === "revoked") redirect(SESSION_EXPIRED_PATH);
  if (state.status === "onboarding") redirect("/onboarding");
  return state.context;
}

/**
 * Pour la page d'onboarding : null si l'utilisateur doit bien la voir,
 * sinon la destination vers laquelle le rediriger.
 */
export async function getOnboardingRedirect(): Promise<string | null> {
  const state = await resolveAccount();
  if (state.status === "anonymous") return "/login";
  if (state.status === "revoked") return SESSION_EXPIRED_PATH;
  if (state.status === "member") return "/dashboard";
  return null;
}

/** Throws 403 unless the context's role holds the given permission. */
export function requirePermission(context: AuthContext, permission: Permission): void {
  if (!can(context.role, permission)) throw Errors.forbidden();
}

/**
 * Resolves which store a request should act on. A member restricted to one
 * store can never act on another one, even if they pass a different id;
 * an unrestricted member may target any store that belongs to their own
 * organization, and otherwise falls back to the organization's default
 * (or first) store.
 */
export async function resolveActiveStoreId(
  context: AuthContext,
  requestedStoreId?: number | null,
): Promise<number> {
  if (context.membershipStoreId) {
    if (requestedStoreId && requestedStoreId !== context.membershipStoreId) {
      throw Errors.forbidden("Vous n'avez pas accès à cette boutique");
    }
    return context.membershipStoreId;
  }

  if (requestedStoreId) {
    const store = await prisma.boutique.findFirst({
      where: { id: requestedStoreId, organisationId: context.organizationId },
      select: { id: true },
    });
    if (!store) throw Errors.forbidden("Boutique invalide");
    return store.id;
  }

  const defaultStore = await prisma.boutique.findFirst({
    where: { organisationId: context.organizationId },
    orderBy: [{ parDefaut: "desc" }, { id: "asc" }],
    select: { id: true },
  });
  if (!defaultStore) throw Errors.conflict("Aucune boutique n'est configurée pour cette organisation.");
  return defaultStore.id;
}
