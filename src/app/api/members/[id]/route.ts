import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { apiRoute, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { Role } from "@/generated/prisma/enums";
import { parseIntId } from "@/lib/api/pagination";
import { recordAuditLog } from "@/lib/api/audit";

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "members:manage");

  const membershipId = parseIntId((await params).id);
  if (!membershipId) throw Errors.invalidId();

  const membership = await prisma.membre.findFirst({
    where: { id: membershipId, organisationId: context.organizationId },
  });
  if (!membership) throw Errors.notFound("Membre introuvable");
  if (membership.utilisateurId === context.userId) {
    throw Errors.conflict("Vous ne pouvez pas retirer votre propre accès.");
  }
  if (membership.role === Role.OWNER) {
    throw Errors.conflict("Le propriétaire de l'organisation ne peut pas être retiré.");
  }

  // On supprime l'adhésion, pas le compte : les ventes, achats, dépenses et
  // mouvements de stock restent rattachés à leur auteur (et la suppression du
  // compte échouait dès qu'il avait une activité). Sans adhésion, l'accès à
  // l'organisation est coupé dès la requête suivante (voir lib/auth/session).
  await prisma.membre.delete({ where: { id: membership.id } });

  await recordAuditLog({
    organisationId: context.organizationId,
    utilisateurId: context.userId,
    action: "member.removed",
    entite: "Membre",
    entiteId: membership.id,
    metadonnees: { utilisateurId: membership.utilisateurId, role: membership.role },
  });

  return jsonMessage("Membre retiré");
});
