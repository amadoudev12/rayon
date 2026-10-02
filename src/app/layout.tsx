import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/providers/AuthProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "./globals.css";

// Police chargée et auto-hébergée par Next.js (aucune requête vers Google
// côté navigateur). Exposée en variable CSS et utilisée par `--font-sans`.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Rayon",
  description: "Solution SaaS moderne de gestion commerciale pour petits commerçants",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-canvas font-sans text-slate-900">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
