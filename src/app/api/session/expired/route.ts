import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACTIVE_STORE_COOKIE } from "@/lib/auth/store";

/**
 * Ferme une session devenue invalide (membre retiré de l'organisation,
 * compte supprimé) : efface le cookie de session NextAuth puis renvoie vers
 * la page de connexion.
 *
 * Nécessaire car les Server Components ne peuvent pas modifier les cookies :
 * sans cette étape, le Proxy continuerait de lire l'ancien jeton et
 * renverrait l'utilisateur en boucle vers le tableau de bord.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();

  for (const { name } of cookieStore.getAll()) {
    // Couvre `next-auth.session-token`, sa variante `__Secure-` (HTTPS) et
    // les morceaux `.0`, `.1`… quand le jeton est découpé.
    if (name.includes("next-auth.session-token")) {
      cookieStore.set(name, "", { maxAge: 0, path: "/", secure: name.startsWith("__Secure-") });
    }
  }
  cookieStore.delete(ACTIVE_STORE_COOKIE);

  return NextResponse.redirect(new URL("/login", request.url));
}
