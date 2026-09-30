import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { storeSchema } from "@/lib/validations/member";
import { apiRoute, jsonData } from "@/lib/api/response";

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();

  const stores = await prisma.boutique.findMany({
    where: { organisationId: context.organizationId },
    orderBy: [{ parDefaut: "desc" }, { nom: "asc" }],
  });

  return jsonData(stores);
});

export const POST = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "store:manage");

  const parsed = storeSchema.parse(await request.json());

  const store = await prisma.$transaction(async (tx) => {
    const createdStore = await tx.boutique.create({
      data: {
        organisationId: context.organizationId,
        nom: parsed.nom,
        adresse: parsed.adresse || null,
        telephone: parsed.telephone || null,
      },
    });

    // Chaque produit du catalogue a besoin d'une ligne de stock (à zéro) dans
    // la nouvelle boutique, pour que l'inventaire n'ait jamais à traiter une
    // ligne manquante comme un cas particulier.
    const products = await tx.produit.findMany({
      where: { organisationId: context.organizationId },
      select: { id: true },
    });
    if (products.length > 0) {
      await tx.stock.createMany({
        data: products.map((product) => ({ boutiqueId: createdStore.id, produitId: product.id, quantite: 0 })),
      });
    }

    return createdStore;
  });

  return jsonData(store, { status: 201 });
});
