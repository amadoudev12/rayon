"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-inset ring-red-200/70">
          <Icon name="alertCircle" className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-slate-900">Une erreur est survenue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cette page n&apos;a pas pu s&apos;afficher correctement. Vous pouvez réessayer.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <LinkButton href="/dashboard" variant="secondary">
            Tableau de bord
          </LinkButton>
          <Button onClick={reset}>Réessayer</Button>
        </div>
        {error.digest && <p className="mt-4 font-mono text-[11px] text-slate-400">Référence : {error.digest}</p>}
      </Card>
    </div>
  );
}
