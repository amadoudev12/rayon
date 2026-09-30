import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthContext, requirePermission } from "@/lib/auth/session";
import { apiRoute, jsonData } from "@/lib/api/response";

const updateSchema = z.object({
  nom: z.string().trim().min(2, "Le nom est requis."),
  devise: z.string().trim().length(3, "Code devise invalide (3 lettres)."),
});

export const GET = apiRoute(async () => {
  const context = await requireAuthContext();
  const organization = await prisma.organisation.findUniqueOrThrow({ where: { id: context.organizationId } });
  return jsonData(organization);
});

export const PUT = apiRoute(async (request: Request) => {
  const context = await requireAuthContext();
  requirePermission(context, "org:manage");

  const parsed = updateSchema.parse(await request.json());
  const organization = await prisma.organisation.update({
    where: { id: context.organizationId },
    data: { nom: parsed.nom, devise: parsed.devise.toUpperCase() },
  });

  return jsonData(organization);
});
