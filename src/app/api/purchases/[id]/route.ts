import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const GET = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  // Même règle que la page Achats : les coûts d'achat ne sont pas visibles des vendeurs.
  requirePermission(context, "purchase:manage");
  const purchaseId = parseIntId((await params).id);
  if (!purchaseId) throw Errors.invalidId();

  const purchase = await prisma.achat.findFirst({
    where: {
      id: purchaseId,
      organisationId: context.organizationId,
      // Un membre limité à une boutique ne peut consulter que ses achats.
      ...(context.membershipStoreId ? { boutiqueId: context.membershipStoreId } : {}),
    },
    include: {
      lignes: { include: { produit: { select: { id: true, nom: true, unite: true } } } },
      fournisseur: { select: { id: true, nom: true, telephone: true } },
      creePar: { select: { id: true, prenom: true, nom: true } },
      boutique: { select: { id: true, nom: true } },
    },
  });
  if (!purchase) throw Errors.notFound("Achat introuvable");

  return jsonData(purchase);
});
