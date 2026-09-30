import { AuthShell } from "@/components/layout/AuthShell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell title="Gestion de magasin" subtitle="La gestion de votre commerce, simplifiée.">
      {children}
    </AuthShell>
  );
}
