# Améliorations et transformation — SaaS de gestion de magasin

Ce document décrit le travail réellement effectué à partir de `AUDIT_ET_RECONCEPTION.md` (audit initial, laissé inchangé). Il n'affirme que ce qui a été vérifié dans le code, testé, ou constaté par exécution réelle (migrations appliquées, build, lint, typecheck, test end-to-end contre un serveur en cours d'exécution).

## 1. Ce qui existait avant

- Schéma Prisma à 4 tables (`User`, `Product`, `Sale`, `SaleItem`), un seul rôle (`VENDEUR`) non exploité.
- Isolation des données par simple `userId` : aucune notion d'organisation, de boutique ou d'équipe.
- Authentification NextAuth fonctionnelle mais fragile : secret optionnel en production, session sans rôle ni contexte métier.
- API REST correcte pour produits/ventes mais dupliquée, sans permissions, avec des noms de champs en français mêlés à une base anglaise.
- `src/app/api/user/route.ts` : inscription qui ne gérait pas certains cas d'erreur et renvoyait `200` même en cas d'email déjà utilisé.
- UI : un seul header horizontal, pas d'état vide/chargement/erreur, textes mal encodés, pas de gestion de catégories, pas de stock par mouvement, pas d'achats/fournisseurs/dépenses.
- Migration unique incohérente avec le schéma (`ADMIN` vs `VENDEUR`).
- Pas de seed, pas de tests, pas de script `typecheck` exécuté, README encore celui de `create-next-app`.

## 2. Architecture SaaS multi-tenant mise en place

Nouveau modèle : **`User` → `Membership` (rôle) → `Organization` → `Store` → ressources métier**.

- Un utilisateur appartient à **une seule organisation** (`Membership.userId` est `@unique`) : hypothèse volontairement simple et documentée, adaptée à un commerçant et son équipe. Multi-organisation par utilisateur n'est pas supporté (voir section « Limites »).
- Une organisation peut avoir **plusieurs boutiques** (`Store`). Le catalogue (`Product`, `Category`) est partagé au niveau de l'organisation ; le stock (`Stock`, `StockMovement`) est propre à chaque boutique.
- **Toutes les requêtes serveur** (API et Server Components) résolvent le contexte tenant à partir de la session (`requireAuthContext` / `requirePageAuthContext`), jamais depuis une donnée envoyée par le client. Chaque accès à une ressource (`GET/PUT/DELETE /api/products/:id`, etc.) filtre explicitement par `organizationId`.
- Vérifié par un test d'isolation réel (voir section 10) : un utilisateur d'une organisation B reçoit **404** sur une ressource de l'organisation A (accès direct par id) et ne la voit pas dans les listes paginées.

## 3. Authentification — analyse et corrections

| Point | Avant | Après |
| --- | --- | --- |
| Secret JWT | Optionnel, silencieux en prod | `authOptions.ts` lève une erreur au démarrage si `NEXTAUTH_SECRET`/`AUTH_SECRET` est absent en production |
| Mot de passe | bcrypt coût 12 (déjà correct) | Conservé, isolé dans `src/lib/auth/password.ts` |
| Session | JWT sans rôle ni organisation | JWT enrichi (`token.tenant`) avec `organizationId`, `role`, `storeId` ; rafraîchi au login et via `session.update()` après onboarding |
| Rôles | Enum non utilisé | 5 rôles (`OWNER`, `ADMIN`, `MANAGER`, `SELLER`, `STOCK_MANAGER`) réellement vérifiés à chaque mutation via `can(role, permission)` |
| Protection des routes | `middleware.ts` (déprécié dans Next 16) | Renommé en **`proxy.ts`** (export `proxy`) — sinon le fichier aurait été silencieusement ignoré par Next.js 16 (middleware → Proxy, voir `node_modules/next/dist/docs/.../16-proxy.md`) |
| Onboarding | Inexistant | Middleware + pages redirigent vers `/onboarding` tant que l'utilisateur n'a pas de `Membership` |
| Déconnexion | `signOut` basique | Conservé, plus fiable avec redirection explicite |
| Erreurs d'auth | Génériques | Réponses JSON cohérentes (`401`, `403`, `409 onboarding requis`) via `ApiError` |
| Défense en profondeur | Aucune (tout reposait sur le middleware) | Chaque route API et Server Component ré-authentifie et ré-autorise indépendamment (recommandation officielle Next.js : le Proxy ne doit jamais être la seule ligne de défense) |

Persistance de session : JWT 30 jours, cookie NextAuth par défaut (httpOnly, secure en prod).

## 4. Base de données — changements Prisma

Schéma entièrement reconstruit (`prisma/schema.prisma`). Ancienne migration incohérente supprimée, **nouvelle baseline unique** : `20260830030316_saas_multitenant_schema`, appliquée avec succès sur la base locale (confirmé par `prisma migrate status` → *Database schema is up to date*).

Modèles ajoutés : `Organization`, `Membership`, `Store`, `Category`, `Stock`, `StockMovement`, `Customer`, `Supplier`, `Purchase`, `PurchaseItem`, `Expense`, `AuditLog`.

Modèles volontairement **non ajoutés** (pour ne pas complexifier sans besoin réel identifié) :
- **`Notification`** — aucun canal d'envoi (email/SMS) n'existe dans le projet ; l'ajouter sans mécanisme de livraison aurait été une table morte.
- **`Payment`** dédié — le paiement est un attribut de la vente (`Sale.paymentMethod`, `amountPaid`), suffisant pour le cas d'usage actuel (paiement immédiat ou à crédit) ; une table séparée serait justifiée si des paiements partiels multiples par vente étaient requis.

Décisions de conception notables :
- Montants en `Decimal(12,2)` partout (au lieu de `Decimal(10,2)`), calculs faits avec `Prisma.Decimal` (pas de conversion flottante manuelle comme dans l'ancien code de vente).
- `StockMovement` est un **journal immuable** : chaque vente, annulation, achat ou ajustement manuel y laisse une trace (`type`, `quantityChange`, auteur, horodatage).
- `Stock` est unique par `(storeId, productId)` : une ligne de stock initialisée à `0` est créée pour chaque produit sur chaque boutique dès la création du produit ou de la boutique — pas de « stock manquant » ambigu.
- Contraintes d'unicité : `Organization.slug`, `Membership.userId`, `Product` (`organizationId, sku`), `Category` (`organizationId, name`), `Stock` (`storeId, productId`), `SaleItem`/`PurchaseItem` (`saleId/purchaseId, productId`).
- Suppressions en cascade réfléchies : supprimer une `Organization` supprime tout son contenu ; supprimer un `Product` est bloqué (`Restrict` implicite) s'il figure dans une vente ou un achat (protège l'historique financier) ; supprimer une catégorie ou une boutique associée à un membre passe le champ à `null` plutôt que de tout supprimer.
- Index ajoutés pour les requêtes fréquentes : `Product(organizationId, categoryId)`, `Product(organizationId, isActive)`, `Sale(organizationId, storeId, createdAt)`, `StockMovement(storeId, productId, createdAt)`, `Expense(organizationId, date)`, `AuditLog(organizationId, createdAt)`.

## 5. Backend / API — reconstruction complète

Toutes les routes ont été réécrites sous `src/app/api/**` (anglais, cohérent avec le schéma) :

`register`, `onboarding`, `organization`, `stores`, `members(/:id)`, `categories(/:id)`, `products(/:id, /:id/stock)`, `stock`, `stock/movements`, `customers(/:id)`, `suppliers(/:id)`, `sales(/:id, /:id/cancel)`, `purchases`, `expenses(/:id)`, `dashboard`, `session/active-store`.

Chaque route suit le même schéma :
1. `requireAuthContext()` → 401 si non authentifié, 409 si organisation non créée.
2. `requirePermission(context, "...")` → 403 selon le rôle (matrice dans `src/lib/auth/permissions.ts`).
3. Validation Zod du corps de requête (`safeParse`/`parse`, erreurs 400 structurées).
4. Résolution de la boutique active (`resolveActiveStoreId`) qui **revérifie systématiquement** qu'une boutique demandée appartient bien à l'organisation de l'appelant.
5. Logique métier déléguée à `src/lib/services/*` (transactions Prisma), jamais écrite directement dans le handler.
6. Réponses JSON cohérentes (`{ data }`, `{ data, pagination }`, `{ message }`) via `src/lib/api/response.ts`, avec mapping automatique des erreurs Prisma (`P2002`, `P2003`, `P2025`) et Zod.

## 6. Fonctionnalités métier implémentées (bout en bout)

Chaque flux ci-dessous a été vérifié **interface → API → service → Prisma → réponse → mise à jour UI** :

- **Produits** : création/édition/archivage, catégorie inline, SKU/code-barres/unité, stock initial.
- **Catégories** : création à la volée depuis le formulaire produit, ou séparément via l'API.
- **Stock** : consultation par boutique, ajustement manuel avec motif, historique des mouvements paginé.
- **Ventes** : panier avec vérification de stock, remise, moyen de paiement, client optionnel (ou création rapide), calcul transactionnel (le stock est décrémenté et la vente créée dans une seule transaction Prisma — un stock insuffisant annule toute la vente), **annulation** avec recrédit du stock.
- **Achats** : réception fournisseur multi-lignes, incrémentation de stock, journalisation.
- **Clients** / **Fournisseurs** : CRUD complet, isolés par organisation.
- **Dépenses** : catégorisées, datées, soustraites du bénéfice estimé.
- **Statistiques** : chiffre d'affaires du mois, bénéfice estimé (marge réelle par ligne de vente, pas une estimation globale), nombre de ventes, dépenses, produits actifs, stock faible, tendance 7 jours, activité récente (ventes + dépenses fusionnées et triées).

## 7. Dashboard

Entièrement reconstruit sur des données réelles (`src/lib/services/dashboard.ts`), aucune donnée fictive affichée comme réelle :

- Indicateurs demandés : CA, bénéfice estimé, nombre de ventes, dépenses, produits, stock faible, activité récente — tous présents.
- Graphique : tendance du CA sur 7 jours (Recharts), ajouté car il répond à un besoin réel (visualiser l'évolution) et pas pour « décorer ».
- Bloc « Pour bien démarrer » affiché uniquement tant que la boutique n'a ni produit ni vente (onboarding progressif).

## 8. Onboarding

Flux implémenté conformément à la demande : **inscription → connexion automatique → création organisation + boutique → ajout (optionnel) du premier produit → invitation à faire la première vente**. Le middleware (`proxy.ts`) et les pages redirigent automatiquement un utilisateur authentifié sans organisation vers `/onboarding`, et empêchent d'y retourner une fois onboardé.

## 9. Interface — refonte

- Nouveau design system minimal (`src/components/ui`) : `Button`/`LinkButton`, `Card`, `Badge`, `Modal`, `ConfirmDialog`, `ToastProvider`, `Table`, `Pagination`, `SearchInput`, `SelectFilter`, `Skeleton`, `EmptyState`, `FormField`.
- Navigation en sidebar (desktop) + menu mobile, filtrée par permission (un `SELLER` ne voit pas « Achats », « Fournisseurs », « Dépenses », « Paramètres »).
- Sélecteur de boutique dans le header, affiché seulement si l'organisation a plusieurs boutiques et que le membre n'est pas restreint à une seule.
- États gérés systématiquement : chargement (`loading.tsx` + squelettes), erreur (`error.tsx`), page introuvable (`not-found.tsx`), listes vides (`EmptyState` partout), confirmations avant suppression/annulation, notifications toast après chaque action.
- Pages construites en **Server Components** pour la lecture (recherche/filtre/pagination pilotés par l'URL, `searchParams`), avec de petits Client Components pour l'interactivité (formulaires, modales) — au lieu du tout-client de l'ancienne version.
- CSP resserrée : `unsafe-eval` retiré (l'audit l'avait signalé).

## 10. Sécurité corrigée et vérifiée

1. **Isolation multi-tenant** vérifiée par un test réel (script Node contre le serveur `next dev`) : un compte d'une autre organisation reçoit 404 sur un produit qui n'est pas le sien, et ne le voit pas dans les listes.
2. **Permissions par rôle** vérifiées : un `SELLER` reçoit 403 en tentant de créer un produit, mais peut créer une vente (201).
3. **Secret NextAuth obligatoire** en production.
4. **`middleware.ts` → `proxy.ts`** : sans ce renommage, la protection des routes aurait été silencieusement inactive sous Next.js 16.
5. **Validation serveur systématique** (Zod) sur chaque écriture, jamais de confiance dans les données client (`organizationId`, `storeId` toujours re-résolus côté serveur).
6. **Vente en sur-stock** rejetée (409) — vérifié.
7. **Décimaux financiers** calculés avec `Prisma.Decimal`, plus d'arrondi flottant manuel.

## 11. Tests effectués

- `npm run typecheck` → **0 erreur**.
- `npm run lint` (ESLint via config Next 16 + règles React Hooks) → **0 erreur**.
- `npm run build` (Turbopack, production) → **succès**, 34 routes générées (statiques + dynamiques listées).
- `npx prisma validate` / `npx prisma migrate status` → schéma valide, base à jour.
- **Test end-to-end réel** contre un serveur `next dev` lancé en tâche de fond : inscription, doublon d'email rejeté, accès non authentifié rejeté, onboarding requis puis effectif, création catégorie/produit, isolation cross-tenant (accès direct + listing), vente créée avec total correct, stock décrémenté, vente en sur-stock rejetée, annulation de vente avec recrédit, achat avec incrémentation de stock, création de membre, permissions de rôle (`SELLER` bloqué en gestion produit, autorisé en vente) — **27/27 vérifications passées**.
- Base de données remise à zéro et reseédée avec les données de démonstration après les tests (aucune donnée de test ne subsiste).

Aucun test automatisé (Jest/Playwright) n'a été mis en place — voir « Problèmes restants ».

## 12. Données de démonstration

`prisma/seed.ts` (exécutable via `npm run db:seed`, idempotent : ne recrée rien si le compte démo existe déjà) crée, tous clairement suffixés « (démo) » ou avec un domaine `.test` :

- Organisation « Boutique Démo Diallo » + une boutique.
- Un compte `OWNER` (`demo@boutique-diallo.test`) et un compte `SELLER` (`vendeuse@boutique-diallo.test`), mot de passe `Demo1234!`.
- 3 catégories, 7 produits (dont un en rupture et un sous le seuil d'alerte), 3 clients, 2 fournisseurs.
- 5 ventes réparties sur les derniers jours, 1 achat de réapprovisionnement, 3 dépenses, mouvements de stock correspondants, une entrée d'audit.

## 13. Fichiers clés modifiés/créés

- `prisma/schema.prisma`, `prisma/migrations/20260830030316_saas_multitenant_schema/`, `prisma/seed.ts`.
- `proxy.ts` (remplace `middleware.ts`).
- `src/lib/auth/*` (session, permissions, password, authOptions, store actif).
- `src/lib/services/*` (onboarding, product, stock, sale, purchase, dashboard).
- `src/lib/api/*` (errors, response, pagination, audit).
- `src/lib/validations/*` (un schéma Zod par domaine).
- `src/app/api/**/route.ts` (17 endpoints).
- `src/app/(auth)/**`, `src/app/onboarding/**`, `src/app/(app)/**` (13 pages métier).
- `src/components/ui/**`, `src/components/layout/**`, `src/components/dashboard/**`.
- `README.md` (documentation réelle du projet, remplace le boilerplate `create-next-app`).

## 14. Problèmes restants / limites connues

- **Pas de tests automatisés** (unitaires ou e2e type Playwright) : seule une vérification manuelle scriptée a été faite pendant cette session. À industrialiser.
- **Un utilisateur = une seule organisation** : simplification assumée (voir section 2). Passer une personne d'une boutique à une autre nécessite de supprimer puis recréer son compte.
- **Pas d'invitation par email** : ajouter un membre d'équipe crée directement le compte avec un mot de passe temporaire que l'admin doit communiquer lui-même (aucun service d'envoi d'email n'est configuré dans le projet).
- **Rafraîchissement de session après onboarding** : le JWT ne se met à jour qu'après un appel explicite à `session.update()` (déjà géré dans l'assistant d'onboarding) ; un changement de rôle par un admin pendant qu'un autre utilisateur est connecté ne sera visible qu'à la prochaine reconnexion.
- **Pages protégées par rôle sans redirection dédiée** (`/achats`, `/fournisseurs`, `/depenses`, `/parametres`) : un accès direct sans permission déclenche la page d'erreur générique (`error.tsx`) plutôt qu'un message « Accès refusé » explicite ou une redirection — fonctionnellement sûr (aucune donnée n'est exposée) mais l'UX pourrait être affinée.
- **Suppression d'un membre** échoue si ce membre a déjà des ventes/achats à son nom (contrainte Prisma volontaire pour préserver l'historique) ; il n'existe pas encore de mécanisme de désactivation de compte sans suppression.
- **Pas de réinitialisation de mot de passe** ni de vérification d'email — non demandé explicitement comme priorité mais à considérer pour une mise en production réelle.
- **Un seul environnement testé** : MySQL/MariaDB local. Le comportement en environnement hébergé (pool de connexions, variables d'environnement de production) n'a pas été vérifié.
