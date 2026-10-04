import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { identifierTakenMessage, identifierWhere, parseIdentifier } from "@/lib/auth/identifier";

export const POST = apiRoute(async (request: Request) => {
  const parsed = registerSchema.parse(await request.json());
  // Le schéma a déjà validé le format : l'identifiant est forcément reconnu.
  const identifier = parseIdentifier(parsed.identifiant)!;

  const existing = await prisma.utilisateur.findUnique({ where: identifierWhere(identifier) });
  if (existing) {
    throw Errors.conflict(identifierTakenMessage(identifier));
  }

  const motDePasseHash = await hashPassword(parsed.motDePasse);
  const user = await prisma.utilisateur.create({
    data: {
      prenom: parsed.prenom,
      nom: parsed.nom,
      ...identifierWhere(identifier),
      motDePasseHash,
    },
    select: { id: true, prenom: true, nom: true, email: true, telephone: true },
  });

  return jsonData(user, { status: 201 });
});
