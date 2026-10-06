import { verifyCredentials } from "@/lib/auth/credentials";
import { issueMobileToken } from "@/lib/auth/mobile-token";
import { loginSchema } from "@/lib/validations/auth";
import { apiRoute, jsonData } from "@/lib/api/response";
import { ApiError, Errors } from "@/lib/api/errors";

/**
 * Connexion de l'application mobile : mêmes identifiants et mêmes règles que
 * la connexion web, mais le jeton de session est renvoyé dans la réponse (à
 * conserver dans le stockage sécurisé du téléphone) au lieu d'un cookie.
 */
export const POST = apiRoute(async (request: Request) => {
  const parsed = loginSchema.parse(await request.json());

  const user = await verifyCredentials(parsed.identifiant, parsed.motDePasse);
  if (!user) throw new ApiError(401, "Identifiant ou mot de passe incorrect.");

  // L'administration de la plateforme n'existe que sur le web.
  if (user.superAdmin) throw Errors.platformAccountOnly();

  const { token, expiresAt } = await issueMobileToken(user);
  return jsonData({ token, expiresAt });
});
