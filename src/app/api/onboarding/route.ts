import { requireUserId } from "@/lib/auth/session";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { createOrganizationForUser } from "@/lib/services/onboarding";
import { recordAuditLog } from "@/lib/api/audit";
import { apiRoute, jsonData } from "@/lib/api/response";

export const POST = apiRoute(async (request: Request) => {
  const userId = await requireUserId();
  const parsed = onboardingSchema.parse(await request.json());

  const { organization, store } = await createOrganizationForUser(userId, parsed);

  await recordAuditLog({
    organisationId: organization.id,
    utilisateurId: userId,
    action: "organization.created",
    entite: "Organization",
    entiteId: organization.id,
  });

  return jsonData({ organization, store }, { status: 201 });
});
