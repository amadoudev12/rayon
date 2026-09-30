import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
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
        email: {},
        motDePasse: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.motDePasse) {
          return null;
        }

        const user = await prisma.utilisateur.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });
        if (!user) {
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
