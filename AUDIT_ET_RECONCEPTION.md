# Audit et plan de reconception ? Gestion de magasin

Audit r?alis? le 27 ao?t 2026 sur le code pr?sent dans le d?p?t, avant toute modification applicative.

## 1. Architecture actuelle

Application Next.js 16.2.10 avec **App Router** (`src/app`), React 19 et TypeScript strict. Toutes les pages m?tier sont des Client Components qui appellent des Route Handlers via `fetch`.

- Pages : `/dashboard`, `/produits`, `/ventes`, `/ventes/nouvelle`, `/stock`, `/rapports`, `/login`, `/register`.
- API : produits, ventes, statistiques du dashboard, inscription et NextAuth.
- Composants : `AppShell`, `PageShell`, formulaire produit, panier et carte statistique.
- `lib` ? la racine contient Prisma, NextAuth, l?acc?s session et les sch?mas Zod.
- `middleware.ts` applique des en-t?tes de s?curit? et redirige les pages priv?es vers `/login`.

Le layout racine charge `SessionProvider` et `AppShell` sur toutes les routes ; la navigation est masqu?e uniquement sur les deux routes d?authentification.

## 2. Technologies d?tect?es

- Next.js 16.2.10, React 19.2, Tailwind CSS 4, TypeScript.
- Prisma 7.9.1, adaptateur MariaDB, datasource MySQL.
- NextAuth 4 avec Credentials Provider et JWT.
- bcrypt, Zod 4, React Hook Form et Recharts.

L?environnement local ne d?finit que `DATABASE_URL` (noms de variables v?rifi?s sans exposer leur valeur) ; `NEXTAUTH_SECRET` / `AUTH_SECRET` sont absents.

## 3. Fonctionnalit?s existantes

| Domaine | ?tat observ? |
| --- | --- |
| Comptes | Inscription, connexion e-mail/mot de passe, d?connexion, session JWT. |
| Produits | CRUD, recherche serveur, pagination et tri API. L?UI n?expose ni pagination ni tri. |
| Ventes | Panier, lignes, total, transaction Prisma, contr?le de stock, historique simple. |
| Stock | Vue d?riv?e du stock produit et alertes de seuil. |
| Pilotage | CA cumul?, volumes de ventes, produits populaires, stock faible et tendance six jours. |

## 4. Fonctionnalit?s r?ellement op?rationnelles

D?apr?s les chemins de code v?rifi?s :

- l?inscription applique Zod, teste l?unicit? e-mail, puis hache le mot de passe avec bcrypt (co?t 12) ;
- la connexion relit l?utilisateur et compare son hash bcrypt ;
- les API produit filtrent les donn?es par `userId` c?t? serveur et valident les entr?es Zod ;
- la vente regroupe les lignes doublonn?es, v?rifie que tous les produits appartiennent ? l?utilisateur, contr?le le stock et d?cr?mente dans une transaction avant de cr?er la vente ;
- dashboard et rapports lisent les vraies tables `Sale`, `SaleItem` et `Product`, pas des donn?es fictives.

Aucun test d?int?gration ou e2e n?existe : cela ne prouve pas que ces parcours fonctionnent avec la base actuellement d?ploy?e.

## 5. Bugs d?tect?s

1. `npx tsc --noEmit` ?choue dans `src/app/produits/page.tsx` : `ProductRecord.description` est `string | null` et `ProductForm` attend `string | undefined`.
2. Des textes fran?ais et des emojis sont encod?s incorrectement dans de nombreux ?crans (`commer??ant`, `Donn??es`, etc.).
3. Ventes, stock, rapports et caisse ne g?rent ni erreurs HTTP ni parsing JSON robuste ; 401/500 donnent un ?cran incoh?rent.
4. La caisse laisse s?lectionner plus que le stock, permet d?ajouter un produit ?puis? et soumet un panier vide ; le serveur refuse correctement mais l?UX ne pr?vient pas.
5. Stock, rapports et historique n?ont pas d??tats vides r?els. Aucun `loading.tsx`, `error.tsx` ou `not-found.tsx` Next.js n?est pr?sent.
6. Le `README.md` est encore celui de `create-next-app`.
7. Les migrations sont incoh?rentes avec le sch?ma : `ADMIN` dans la migration mais `VENDEUR` dans le sch?ma; usage de `user` apr?s cr?ation de `User` (casse risqu?e sous MySQL/Linux); ajouts de champs requis sans remplissage des donn?es existantes.

## 6. Probl?mes de s?curit?

1. Secret JWT absent : le middleware tol?re un secret `undefined`. La production doit refuser de d?marrer sans secret fort.
2. L?isolation est seulement par `userId`; il n?existe ni organisation, ni boutique, ni partage contr?l?, ni multi-tenant.
3. Le r?le stock? n?est pas pr?sent dans la session et aucune route ne v?rifie une permission : il n?est pas op?rationnel.
4. Il n?existe aucun ?tat de compte, expiration/politique de session explicite, v?rification d?e-mail, r?initialisation, rate limiting ou audit de connexion.
5. La CSP contient `unsafe-eval`; cette directive doit ?tre supprim?e ou justifi?e.
6. Le singleton Prisma force `DATABASE_URL!` sans erreur de configuration compr?hensible.

## 7. Probl?mes UX/UI

- Header horizontal unique, sans structure par domaine, param?tres, action principale ou adaptation mobile compl?te.
- Layout client global : bundle client ?largi et lectures qui ne b?n?ficient pas des Server Components.
- Pas de primitive commune de toast, confirmation accessible, empty/error/loading state ni skeleton.
- Tableaux peu adapt?s au t?l?phone; caisse sans client, paiement, remise, ticket ni interactions clavier adapt?es.
- Produits sans cat?gories, SKU, code-barres, unit?, statut, image, archive ou fiche d?tail.
- Rapports redondants avec le dashboard, sans p?riode ni export.

## 8. Probl?mes de base de donn?es

Le sch?ma comprend seulement `User`, `Product`, `Sale`, `SaleItem` et un enum ? un r?le. Produits et ventes sont reli?s directement ? un utilisateur : il ne peut pas isoler les donn?es d?une boutique, ni travailler en ?quipe.

`Product` n?a pas SKU/code-barres/cat?gorie/marque/unit?/statut. Le stock est modifi? directement sans journal de mouvements. Les ventes n?ont ni num?ro, statut, client, vendeur, paiement, remise ou instantan? de co?t; le b?n?fice fiable est impossible. Achats, fournisseurs, d?penses, notifications, caisse et audit sont absents.

`Decimal(10,2)` est pertinent, mais la vente le convertit en `number` avec arrondi manuel. Il faut d?finir une convention mon?taire et garder les calculs transactionnels coh?rents. Il manque aussi les index tenant/boutique/date et les contraintes m?tier.

## 9. Architecture et qualit?

- Autorisation r?p?t?e avec `getAuthenticatedUserId`, sans contexte organisation/boutique/r?le.
- Contrats API et types recopi?s dans les ?crans; le type client `User` contient m?me `password`, ? supprimer.
- Logique m?tier m?lang?e aux Route Handlers et pages client.
- Pas de tests, pas de script typecheck, pas de seed ni documentation op?rationnelle.
- `npm run lint` passe; Prisma valide le sch?ma; TypeScript ?choue comme d?taill? plus haut.

## 10. ? conserver, refactoriser et supprimer

? conserver : App Router, TypeScript strict, Prisma/MariaDB, bcrypt, Zod, React Hook Form, transactions de vente, pagination API produit et le principe des en-t?tes de s?curit?.

? refactoriser : sch?ma/migrations, couche auth, toutes les API, shell, pages m?tier, types et validations.

? supprimer/remplacer : r?le global `VENDEUR`, modification directe de stock par formulaire produit, types exposant `password`, rapports actuels dupliqu?s, assets create-next-app inutilis?s.

## 11. Fonctionnalit?s manquantes

Organisation/boutiques/memberships/invitations; onboarding; cat?gories et catalogue complet; mouvements stock; achats/fournisseurs; clients; d?penses; paiements/caisse; journal d?audit; notifications; recherche et exports; r?initialisation de mot de passe; test et seed document?.

## 12. Architecture cible propos?e

### Multi-tenant

`User ? Membership ? Organization ? Store ? ressources m?tier`.

Une membership active porte un r?le (`OWNER`, `ADMIN`, `MANAGER`, `SELLER`, `STOCK_MANAGER`). Chaque requ?te serveur r?sout ce contexte et filtre toutes les lectures/?critures par `organizationId` et/ou `storeId`; aucune autorisation ne repose sur le frontend.

### Mod?le m?tier

- Catalogue : `Category`, `Product` et ?ventuellement `Brand`.
- Stock : quantit? disponible plus `StockMovement` immuable (entr?e, vente, sortie, ajustement, retour).
- Vente : `Sale`, `SaleItem`, `Payment`, `Customer` avec instantan?s de prix et co?t.
- Approvisionnement : `Purchase`, `PurchaseItem`, `Supplier`.
- Pilotage : `Expense`, `Notification`, `AuditLog`.

Les montants restent en Decimal; cr?ation de vente, achat et mouvement sont atomiques dans les transactions Prisma.

### Couches

- `src/lib/auth` : session, tenant actif, gardes de permission.
- `src/lib/validations` : Zod partag?.
- `src/lib/services` : transactions m?tier hors JSX.
- `src/app/api` : adaptation HTTP, validation et r?ponses coh?rentes.
- `src/app/(auth)` et `src/app/(app)` : layouts s?par?s.
- Server Components pour les lectures et petits Client Components pour les interactions.

## 13. Plan de mise en ?uvre

1. Assainir migrations et reconstruire le sch?ma multi-tenant.
2. S?curiser session et r?les, puis cr?er l?onboarding organisation/boutique.
3. Construire produits, stock et ventes avec services transactionnels et API prot?g?es.
4. Ajouter clients, fournisseurs, achats et d?penses selon les flux m?tier.
5. Refaire dashboard, navigation et ?tats UI responsive sur donn?es r?elles.
6. Ajouter audit, seed, documentation et tests de s?curit?/cas m?tier.

Chaque flux sera test? de bout en bout : interface ? validation ? API ? garde tenant/r?le ? service transactionnel ? Prisma ? r?ponse ? mise ? jour UI.
