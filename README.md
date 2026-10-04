# Gestion de magasin — SaaS multi-boutiques

Application de gestion commerciale (produits, stock, ventes, achats, clients, fournisseurs, dépenses) pour petits commerçants, conçue comme un SaaS multi-tenant : chaque organisation (boutique/enseigne) a ses données strictement isolées.

## Stack

- **Next.js 16** (App Router, Turbopack) — attention : `middleware.ts` est déprécié dans cette version, remplacé par `proxy.ts` (voir `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`).
- **React 19**, **TypeScript strict**, **Tailwind CSS 4**.
- **Prisma 7** + adaptateur `pg` (PostgreSQL, hébergé sur Supabase).
- **NextAuth 4** (Credentials + JWT) pour l'authentification.
- **Zod 4**, **React Hook Form**, **Recharts**.

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL et NEXTAUTH_SECRET
npx prisma migrate dev
npm run db:seed        # crée un compte de démonstration
npm run dev
```

Compte de démonstration créé par le seed (à ne jamais utiliser en production) :

- Propriétaire : `demo@boutique-diallo.test` / `Demo1234!`
- Vendeuse : `vendeuse@boutique-diallo.test` / `Demo1234!`

## Espace Super Administrateur

Le gestionnaire de la plateforme dispose d'un espace séparé, `/admin` (vue d'ensemble, boutiques, utilisateurs, activité, statistiques). Ce rôle (`Utilisateur.superAdmin`) est global et distinct des rôles d'une boutique : un super administrateur n'a pas d'organisation et n'accède pas à l'espace commerçant, et inversement.

Le rôle ne s'attribue qu'en ligne de commande, jamais depuis l'interface :

```bash
SUPER_ADMIN_EMAIL="moi@exemple.com" SUPER_ADMIN_PASSWORD="MotDePasse123" npm run admin:create
```

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Génère le client Prisma puis build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run db:seed` | Recrée les données de démonstration |
| `npm run admin:create` | Crée ou promeut un super administrateur (voir ci-dessus) |

## Architecture

- `prisma/schema.prisma` — schéma multi-tenant : `Organization → Store → Membership (rôle)`, catalogue (`Category`/`Product`), stock (`Stock` + journal `StockMovement`), ventes (`Sale`/`SaleItem`), achats (`Purchase`/`PurchaseItem`), `Customer`, `Supplier`, `Expense`, `AuditLog`.
- `src/lib/auth` — session NextAuth, résolution du contexte tenant (`requireAuthContext`), permissions par rôle.
- `src/lib/services` — logique métier transactionnelle (ventes, achats, stock, dashboard), indépendante des routes HTTP.
- `src/lib/validations` — schémas Zod partagés entre API et formulaires.
- `src/app/api/**` — Route Handlers : authentification + permission + validation + isolation tenant sur chaque endpoint.
- `src/app/(auth)`, `src/app/onboarding`, `src/app/(app)` — layouts séparés (connexion, création de boutique, application).

Voir [`AUDIT_ET_RECONCEPTION.md`](./AUDIT_ET_RECONCEPTION.md) pour l'audit initial et [`AMELIORATIONS_ET_TRANSFORMATION.md`](./AMELIORATIONS_ET_TRANSFORMATION.md) pour le détail de la transformation effectuée.
