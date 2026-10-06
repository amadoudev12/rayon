import { headers } from "next/headers";
import { decode, encode } from "next-auth/jwt";
import type { Session } from "next-auth";
import { authSecret, loadIsSuperAdmin, loadMembership } from "@/lib/auth/authOptions";

/**
 * Session de l'application mobile.
 *
 * Le web porte son jeton NextAuth dans un cookie ; une application native n'a
 * pas de cookies fiables, elle envoie donc le sien dans l'en-tête
 * `Authorization: Bearer …`. Le jeton est émis et lu avec les mêmes fonctions
 * et le même secret que ceux de NextAuth : il contient les mêmes informations
 * et, comme sur le web, il ne sert qu'à identifier le compte — rôle,
 * organisation et état du compte sont relus en base à chaque requête
 * (voir lib/auth/session).
 */

/** Même durée de vie que la session web (authOptions.session.maxAge). */
const MOBILE_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Sel distinct de celui du cookie de session : un jeton mobile n'est pas un cookie valide, et inversement. */
const MOBILE_TOKEN_SALT = "mobile-session";

function requireSecret(): string {
  if (!authSecret) {
    throw new Error("NEXTAUTH_SECRET (ou AUTH_SECRET) est requis pour émettre un jeton de session.");
  }
  return authSecret;
}

/** Émet le jeton de session d'un compte dont les identifiants viennent d'être vérifiés. */
export async function issueMobileToken(user: { id: number; prenom: string; nom: string }) {
  const token = await encode({
    secret: requireSecret(),
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE_SECONDS,
    token: {
      sub: String(user.id),
      id: user.id,
      name: `${user.prenom} ${user.nom}`,
      tenant: await loadMembership(user.id),
      superAdmin: await loadIsSuperAdmin(user.id),
    },
  });

  return { token, expiresAt: new Date(Date.now() + MOBILE_TOKEN_MAX_AGE_SECONDS * 1000) };
}

/**
 * Session portée par l'en-tête `Authorization: Bearer` de la requête en cours,
 * au même format que la session NextAuth. Null si l'en-tête est absent ou si
 * le jeton est invalide ou expiré.
 */
export async function getBearerSession(): Promise<Session | null> {
  if (!authSecret) return null;

  let authorization: string | null;
  try {
    authorization = (await headers()).get("authorization");
  } catch {
    // Hors d'une requête HTTP (tests des services, scripts) : pas d'en-tête.
    return null;
  }

  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  let payload;
  try {
    payload = await decode({ token: match[1], secret: authSecret, salt: MOBILE_TOKEN_SALT });
  } catch {
    // Jeton falsifié, tronqué ou expiré.
    return null;
  }
  if (!payload || typeof payload.id !== "number") return null;

  const expiresAt = typeof payload.exp === "number" ? payload.exp * 1000 : Date.now();
  return {
    expires: new Date(expiresAt).toISOString(),
    user: {
      id: payload.id,
      name: payload.name ?? null,
      tenant: payload.tenant ?? null,
    },
  };
}
