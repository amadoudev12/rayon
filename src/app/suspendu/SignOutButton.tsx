"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <Button variant="secondary" size="lg" className="w-full" loading={loading} onClick={handleSignOut}>
      Se déconnecter
    </Button>
  );
}
