import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { createMemberSchema } from "@/lib/validations/member";
import { hashPassword } from "@/lib/auth/password";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();
  requirePermission(context, "members:manage");

  const members = await prisma.membre.findMany({
    where: { organisationId: context.organizationId },
    include: {
      utilisateur: { select: { id: true, prenom: true, nom: true, email: true } },
      boutique: { select: { id: true, nom: true } },
    },
    orderBy: { creeLe: "asc" },
  });

  return jsonData(members);
});

/**
 * Crée un compte employé directement dans l'organisation de l'appelant. Il
 * n'existe pas encore d'invitation par email (aucun fournisseur d'emails
 * configuré) : un OWNER/ADMIN définit un mot de passe temporaire et le
 * communique lui-même à l'employé.
 */
export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "members:manage");

  const parsed = createMemberSchema.parse(await request.json());
  const email = parsed.email.trim().toLowerCase();

  const existing = await prisma.utilisateur.findUnique({ where: { email } });
  if (existing) throw Errors.conflict("Un compte existe déjà avec cet email.");

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
      data: { prenom: parsed.prenom, nom: parsed.nom, email, motDePasseHash },
    });

    return tx.membre.create({
      data: {
        utilisateurId: user.id,
        organisationId: context.organizationId,
        role: parsed.role,
        boutiqueId: parsed.boutiqueId ?? null,
      },
      include: {
        utilisateur: { select: { id: true, prenom: true, nom: true, email: true } },
        boutique: { select: { id: true, nom: true } },
      },
    });
  });

  return jsonData(membership, { status: 201 });
});
