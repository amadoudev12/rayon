import { redirect } from "next/navigation";
import { getOnboardingRedirect, getSession } from "@/lib/auth/session";
import { OnboardingWizard } from "./OnboardingWizard";
import { AuthShell } from "@/components/layout/AuthShell";

export default async function OnboardingPage() {
  // État réel du compte lu en base (et non dans le jeton de session).
  const destination = await getOnboardingRedirect();
  if (destination) redirect(destination);
  const session = await getSession();
  if (!session?.user) redirect("/login");

  return (
    <AuthShell title={`Bienvenue, ${session.user.name}`} subtitle="Configurons votre boutique en 2 minutes." width="lg">
      <OnboardingWizard />
    </AuthShell>
  );
}
