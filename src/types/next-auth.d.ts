import type { DefaultSession } from "next-auth";
import type { SessionTenant } from "@/lib/auth/authOptions";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      tenant: SessionTenant;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: number;
    tenant?: SessionTenant;
  }
}
