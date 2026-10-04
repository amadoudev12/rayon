import { redirect } from "next/navigation";
import { getSuspendedRedirect } from "@/lib/auth/session";
import { AuthShell } from "@/components/layout/AuthShell";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SignOutButton } from "./SignOutButton";

/** Affichée aux membres d'une organisation suspendue par l'administration de la plateforme. */
export default async function SuspendedPage() {
  // État réel du compte lu en base : dès la réactivation, on repart vers l'application.
  const destination = await getSuspendedRedirect();
  if (destination) redirect(destination);

  return (
    <AuthShell title="Boutique suspendue" subtitle="L'accès à votre espace est temporairement coupé.">
      <Card className="p-6 text-center sm:p-7">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70">
          <Icon name="lock" className="h-5 w-5" />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Votre boutique a été suspendue par l&apos;administrateur de la plateforme. Vos données sont conservées et
          redeviendront accessibles dès la réactivation.
        </p>
        <p className="mt-2 text-sm text-slate-500">Contactez l&apos;administrateur pour en savoir plus.</p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </Card>
    </AuthShell>
  );
}
