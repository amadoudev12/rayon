import { prisma } from "@/lib/prisma";
import { requireAuthContext } from "@/lib/auth/session";
import { apiRoute, jsonData } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";

export const GET = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  const saleId = parseIntId((await params).id);
  if (!saleId) throw Errors.invalidId();

  const sale = await prisma.vente.findFirst({
    where: {
      id: saleId,
      organisationId: context.organizationId,
      // Un membre limité à une boutique ne peut consulter que ses ventes.
      ...(context.membershipStoreId ? { boutiqueId: context.membershipStoreId } : {}),
    },
    include: {
      lignes: { include: { produit: { select: { id: true, nom: true, unite: true } } } },
      client: { select: { id: true, nom: true, telephone: true } },
      vendeur: { select: { id: true, prenom: true, nom: true } },
      boutique: { select: { id: true, nom: true } },
    },
  });
  if (!sale) throw Errors.notFound("Vente introuvable");

  return jsonData(sale);
});
