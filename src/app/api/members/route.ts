import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { createMemberSchema } from "@/lib/validations/member";
import { hashPassword } from "@/lib/auth/password";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { identifierTakenMessage, identifierWhere, parseIdentifier } from "@/lib/auth/identifier";

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();
  requirePermission(context, "members:manage");

  const members = await prisma.membre.findMany({
    where: { organisationId: context.organizationId },
    include: {
      utilisateur: { select: { id: true, prenom: true, nom: true, email: true, telephone: true } },
      boutique: { select: { id: true, nom: true } },
    },
    orderBy: { creeLe: "asc" },
  });

  return jsonData(members);
});

/**
 * Crée un compte employé directement dans l'organisation de l'appelant. Il
 * n'existe pas encore d'invitation par email ou SMS (aucun fournisseur
 * configuré) : un OWNER/ADMIN définit un mot de passe temporaire et le
 * communique lui-même à l'employé.
 */
export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "members:manage");

  const parsed = createMemberSchema.parse(await request.json());
  // Le schéma a déjà validé le format : l'identifiant est forcément reconnu.
  const identifier = parseIdentifier(parsed.identifiant)!;

  const existing = await prisma.utilisateur.findUnique({ where: identifierWhere(identifier) });
  if (existing) throw Errors.conflict(identifierTakenMessage(identifier));

  if (parsed.boutiqueId) {
    const store = await prisma.boutique.findFirst({
      where: { id: parsed.boutiqueId, organisationId: context.organizationId },
      select: { id: true },
    });
    if (!store) throw Errors.notFound("Boutique introuvable");
  }

  const motDePasseHash = await hashPassword(parsed.motDePasse);

  const membership = await prisma.$transaction(async (tx) => {
    const user = await tx.utilisateur.create({
      data: { prenom: parsed.prenom, nom: parsed.nom, ...identifierWhere(identifier), motDePasseHash },
    });

    return tx.membre.create({
      data: {
        utilisateurId: user.id,
        organisationId: context.organizationId,
        role: parsed.role,
        boutiqueId: parsed.boutiqueId ?? null,
      },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, email: true, telephone: true } },
        boutique: { select: { id: true, nom: true } },
      },
    });
  });

  return jsonData(membership, { status: 201 });
});
