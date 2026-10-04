import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { identifierWhere, parseIdentifier } from "@/lib/auth/identifier";
import type { Role } from "@/generated/prisma/enums";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

if (!authSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXTAUTH_SECRET (ou AUTH_SECRET) est requis en production. Définissez un secret fort avant de démarrer.",
  );
}

/** Contexte d'organisation porté par le JWT et exposé dans la session. */
export type SessionTenant = {
  organizationId: number;
  organizationName: string;
  role: Role;
  storeId: number | null;
} | null;

async function loadMembership(userId: number) {
  const membership = await prisma.membre.findUnique({
    where: { utilisateurId: userId },
    select: {
      role: true,
      boutiqueId: true,
      organisation: { select: { id: true, nom: true } },
    },
  });

  if (!membership) return null;

  return {
    organizationId: membership.organisation.id,
    organizationName: membership.organisation.nom,
    role: membership.role,
    storeId: membership.boutiqueId,
  } satisfies NonNullable<SessionTenant>;
}

async function loadIsSuperAdmin(userId: number) {
  const user = await prisma.utilisateur.findUnique({ where: { id: userId }, select: { superAdmin: true } });
  return user?.superAdmin ?? false;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifiant: {},
        motDePasse: {},
      },
      async authorize(credentials) {
        if (!credentials?.identifiant || !credentials?.motDePasse) {
          return null;
        }

        // Email ou numéro de téléphone : même normalisation qu'à l'inscription.
        const identifier = parseIdentifier(credentials.identifiant);
        if (!identifier) {
          return null;
        }

        const user = await prisma.utilisateur.findUnique({ where: identifierWhere(identifier) });
        // Un compte désactivé par le super administrateur ne peut plus se connecter.
        if (!user || !user.actif) {
          return null;
        }

        const isValid = await verifyPassword(credentials.motDePasse, user.motDePasseHash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          name: `${user.prenom} ${user.nom}`,
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }: { token: JWT; user?: NextAuthUser | null; trigger?: string }) {
      if (user) {
        token.id = Number(user.id);
        token.name = user.name;
      }

      // Recharge le contexte d'organisation à la connexion, et chaque fois que
      // le client le demande explicitement (par ex. juste après l'onboarding).
      if (user || trigger === "update" || token.tenant === undefined) {
        token.tenant = token.id ? await loadMembership(token.id as number) : null;
        // Simple indication pour les redirections du Proxy : l'autorisation
        // réelle relit toujours `superAdmin` en base (lib/auth/session).
        token.superAdmin = token.id ? await loadIsSuperAdmin(token.id as number) : false;
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as number;
        session.user.name = token.name as string;
        session.user.tenant = (token.tenant as SessionTenant) ?? null;
      }
      return session;
    },
  },
};
