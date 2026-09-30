import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission, resolveActiveStoreId } from "@/lib/auth/session";
import { productSchema } from "@/lib/validations/product";
import { updateProduct, deleteProduct } from "@/lib/services/product";
import { apiRoute, jsonData, jsonMessage } from "@/lib/api/response";
import { Errors } from "@/lib/api/errors";
import { parseIntId } from "@/lib/api/pagination";
import { getActiveStoreId } from "@/lib/auth/store";
import { SaleStatus } from "@/generated/prisma/enums";

export const GET = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  const productId = parseIntId((await params).id);
  if (!productId) throw Errors.invalidId();

  const { searchParams } = new URL(request.url);
  // Boutique demandée explicitement, sinon la boutique active de l'utilisateur.
  const requestedStoreId = Number(searchParams.get("storeId")) || undefined;
  const storeId = requestedStoreId
    ? await resolveActiveStoreId(context, requestedStoreId)
    : await getActiveStoreId(context);

  // Un membre limité à une boutique ne voit que le stock, les mouvements et
  // les ventes de sa boutique.
  const storeFilter = context.membershipStoreId ? { boutiqueId: context.membershipStoreId } : {};

  const product = await prisma.produit.findFirst({
    where: { id: productId, organisationId: context.organizationId },
    include: {
      categorie: { select: { id: true, nom: true } },
      stocks: {
        where: storeFilter,
        select: { quantite: true, boutique: { select: { id: true, nom: true } } },
        orderBy: { boutique: { nom: "asc" } },
      },
      mouvementsStock: {
        where: storeFilter,
        orderBy: { creeLe: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          variationQuantite: true,
          note: true,
          creeLe: true,
          boutique: { select: { nom: true } },
          utilisateur: { select: { prenom: true, nom: true } },
        },
      },
    },
  });
  if (!product) throw Errors.notFound("Produit introuvable");

  // Ventes terminées uniquement : les ventes annulées ne comptent pas.
  const sales = await prisma.ligneVente.aggregate({
    where: {
      produitId: productId,
      vente: { organisationId: context.organizationId, statut: SaleStatus.COMPLETED, ...storeFilter },
    },
    _sum: { quantite: true, sousTotal: true },
    _count: true,
  });

  return jsonData({
    ...product,
    quantiteStock: product.stocks.find((stock) => stock.boutique.id === storeId)?.quantite ?? 0,
    ventes: {
      nombre: sales._count,
      quantite: sales._sum.quantite ?? 0,
      montant: sales._sum.sousTotal ?? 0,
    },
  });
});

export const PUT = apiRoute(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "product:manage");

  const productId = parseIntId((await params).id);
  if (!productId) throw Errors.invalidId();

  const parsed = productSchema.parse(await request.json());
  const product = await updateProduct(context, productId, parsed);

  return jsonData(product);
});

export const DELETE = apiRoute(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const context = await requireAuthContext();
  requirePermission(context, "product:manage");

  const productId = parseIntId((await params).id);
  if (!productId) throw Errors.invalidId();

  await deleteProduct(context, productId);
  return jsonMessage("Produit supprimé");
});
