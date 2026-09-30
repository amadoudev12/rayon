import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";

export const POST = apiRoute(async (request: Request) => {
  const parsed = registerSchema.parse(await request.json());
  const email = parsed.email.trim().toLowerCase();

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) {
    throw Errors.conflict("Un compte existe déjà avec cet email.");
  }

  const motDePasseHash = await hashPassword(parsed.motDePasse);
  const user = await prisma.utilisateur.create({
    data: {
      prenom: parsed.prenom,
      nom: parsed.nom,
      email,
      motDePasseHash,
    },
    select: { id: true, prenom: true, nom: true, email: true },
  });

  return jsonData(user, { status: 201 });
});
