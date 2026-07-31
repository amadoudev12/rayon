import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions, Session, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { compare } from "bcrypt";
import { prisma } from "./prisma";
import { User } from "@/types/user";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: {
                        email: credentials.email,
                    },
                });
                if (!user) {
                    return null;
                }

                const isValid = await compare(credentials.password, user.password);
                if (!isValid) {
                    return null;
                }

                return {
                    id: String(user.id),
                    name: `${user.nom} ${user.prenom}`,
                    email: user.email,
                    nom: user.nom,
                    prenom: user.prenom,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: NextAuthUser | null }) {
            if (user) {
                token.id = user.id;
                token.name = user.name
            }
            return token;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            if (session.user) {
                session.user.id = token.id as number;
                session.user.name = token.name as string
            }
            return session;
        },
    },
};