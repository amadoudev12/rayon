/**
 * Vérification de bout en bout de l'API vue par l'application mobile.
 *
 * Ce script exécute le VRAI client du mobile (src/api) contre un backend en
 * cours d'exécution : connexion, profil, tableau de bord, produits, ventes,
 * erreurs et permissions.
 *
 * ⚠️ Il ÉCRIT des données (un produit, des ventes annulées ensuite) : à lancer
 * uniquement sur une base de développement ou de test, jamais en production.
 *
 *   EXPO_PUBLIC_API_URL=http://localhost:3000 \
 *   SMOKE_OWNER=demo@boutique-diallo.test SMOKE_SELLER=vendeuse@boutique-diallo.test \
 *   SMOKE_PASSWORD='Demo1234!' npx tsx scripts/api-smoke.ts
 */
import { ApiError, request, setAuthToken, setUnauthorizedHandler } from '../src/api/client';
import * as api from '../src/api/endpoints';

const OWNER = process.env.SMOKE_OWNER ?? 'demo@boutique-diallo.test';
const SELLER = process.env.SMOKE_SELLER ?? 'vendeuse@boutique-diallo.test';
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'Demo1234!';
const SUPER_ADMIN = process.env.SMOKE_SUPER_ADMIN;
const SUPER_ADMIN_PASSWORD = process.env.SMOKE_SUPER_ADMIN_PASSWORD;

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✘ ${label}${detail === undefined ? '' : ` — ${JSON.stringify(detail)}`}`);
  }
}

/** Exécute `action` et retourne l'ApiError attendue (null si l'appel a réussi). */
async function failure(action: () => Promise<unknown>): Promise<ApiError | null> {
  try {
    await action();
    return null;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
}

async function signIn(identifiant: string) {
  const { token } = await api.login(identifiant, PASSWORD);
  setAuthToken(token);
  return api.getProfile();
}

async function main() {
  console.log('\nAuthentification');
  const wrongPassword = await failure(() => api.login(OWNER, 'mauvais-mot-de-passe'));
  check('mot de passe faux → 401 avec message', wrongPassword?.status === 401 && wrongPassword.message.includes('incorrect'), wrongPassword);

  const unknownUser = await failure(() => api.login('inconnu@exemple.test', PASSWORD));
  check('compte inconnu → même réponse 401 (pas de fuite)', unknownUser?.status === 401 && unknownUser.message === wrongPassword?.message);

  const badIdentifier = await failure(() => api.login('pas-un-identifiant', PASSWORD));
  check('identifiant mal formé → 400 + erreur du champ', badIdentifier?.status === 400 && Boolean(badIdentifier.fieldError('identifiant')), badIdentifier?.fieldErrors);

  setAuthToken(null);
  const anonymous = await failure(() => api.getProfile());
  check('sans jeton → 401', anonymous?.status === 401);

  let unauthorizedCalls = 0;
  setUnauthorizedHandler(() => (unauthorizedCalls += 1));
  setAuthToken('jeton-invalide');
  const forged = await failure(() => api.getProfile());
  check('jeton falsifié → 401 et fermeture de session signalée', forged?.status === 401 && unauthorizedCalls === 1, { unauthorizedCalls });
  setUnauthorizedHandler(null);

  if (SUPER_ADMIN && SUPER_ADMIN_PASSWORD) {
    const superAdmin = await failure(() =>
      request('/api/mobile/auth/login', { method: 'POST', body: { identifiant: SUPER_ADMIN, motDePasse: SUPER_ADMIN_PASSWORD }, authenticated: false }),
    );
    check('super administrateur refusé sur mobile → 403', superAdmin?.status === 403, superAdmin);
  }

  const owner = await signIn(OWNER);
  check('connexion propriétaire + profil', owner.role === 'OWNER' && owner.stores.length > 0 && owner.organization.devise.length === 3, owner);
  check('permissions du propriétaire', owner.permissions.includes('product:manage') && owner.permissions.includes('sale:cancel'));
  const storeId = owner.defaultStoreId;

  console.log('\nTableau de bord');
  const dashboardBefore = await api.getDashboard(storeId);
  check('statistiques numériques', typeof dashboardBefore.revenue === 'number' && dashboardBefore.trend.length === 7, dashboardBefore.trend);
  const foreignStore = await failure(() => api.getDashboard(999_999));
  check('boutique étrangère → 403', foreignStore?.status === 403, foreignStore);

  console.log('\nProduits');
  const firstPage = await api.listProducts({ storeId, limit: 5 });
  check('liste paginée', firstPage.data.length > 0 && firstPage.pagination.total >= firstPage.data.length, firstPage.pagination);
  check('stock par produit présent', firstPage.data.every((product) => typeof product.quantiteStock === 'number'));

  const invalid = await failure(() =>
    api.createProduct({ nom: 'X', unite: 'unité', categorieId: null, prixAchat: 100, prixVente: 0, seuilAlerte: 5 }, storeId),
  );
  check(
    'produit invalide → 400 + erreurs par champ',
    invalid?.status === 400 && Boolean(invalid.fieldError('nom')) && Boolean(invalid.fieldError('prixVente')),
    invalid?.fieldErrors,
  );

  const name = `Produit test mobile ${Date.now()}`;
  const created = await api.createProduct(
    { nom: name, unite: 'unité', categorieId: null, prixAchat: 600, prixVente: 1000, seuilAlerte: 3, quantiteInitiale: 10 },
    storeId,
  );
  let details = await api.getProduct(created.id, storeId);
  check('création + stock initial dans la boutique demandée', details.quantiteStock === 10 && details.mouvementsStock[0]?.type === 'INITIAL', details.stocks);

  const found = await api.listProducts({ storeId, search: name });
  check('recherche par nom', found.data.length === 1 && found.data[0].id === created.id);

  await api.updateProduct(created.id, { nom: `${name} (modifié)`, unite: 'pièce', categorieId: null, prixAchat: 700, prixVente: 1200, seuilAlerte: 4, actif: true });
  details = await api.getProduct(created.id, storeId);
  check('modification', details.nom.endsWith('(modifié)') && Number(details.prixVente) === 1200 && details.unite === 'pièce' && details.seuilAlerte === 4);

  await api.adjustStock(created.id, { variationQuantite: 5, note: 'Test', boutiqueId: storeId });
  details = await api.getProduct(created.id, storeId);
  check('ajustement de stock +5', details.quantiteStock === 15 && details.mouvementsStock[0]?.type === 'ADJUSTMENT');
  const negative = await failure(() => api.adjustStock(created.id, { variationQuantite: -100, boutiqueId: storeId }));
  check('ajustement sous zéro → 409', negative?.status === 409, negative);

  const missing = await failure(() => api.getProduct(99_999_999, storeId));
  check('produit inexistant → 404', missing?.status === 404);

  console.log('\nVentes');
  const sale = await api.createSale({ lignes: [{ produitId: created.id, quantite: 2 }], boutiqueId: storeId, modePaiement: 'MOBILE_MONEY', remise: 400 });
  const saleDetails = await api.getSale(sale.id);
  check(
    'vente : total calculé par le serveur (2 × 1200 − 400)',
    Number(saleDetails.sousTotal) === 2400 && Number(saleDetails.total) === 2000 && saleDetails.modePaiement === 'MOBILE_MONEY',
    saleDetails,
  );
  details = await api.getProduct(created.id, storeId);
  check('vente : stock décrémenté', details.quantiteStock === 13);

  const tooMany = await failure(() => api.createSale({ lignes: [{ produitId: created.id, quantite: 999 }], boutiqueId: storeId, modePaiement: 'CASH', remise: 0 }));
  check('stock insuffisant → 409 avec le nom du produit', tooMany?.status === 409 && tooMany.message.includes('Stock insuffisant'), tooMany);
  const emptySale = await failure(() => api.createSale({ lignes: [], boutiqueId: storeId, modePaiement: 'CASH', remise: 0 }));
  check('vente sans article → 400', emptySale?.status === 400, emptySale);

  const sales = await api.listSales({ storeId, search: name });
  check('liste des ventes + recherche par produit', sales.data.some((item) => item.id === sale.id), sales.pagination);

  const dashboardAfter = await api.getDashboard(storeId);
  check(
    'tableau de bord mis à jour par la vente',
    dashboardAfter.todayRevenue === dashboardBefore.todayRevenue + 2000 && dashboardAfter.todaySalesCount === dashboardBefore.todaySalesCount + 1,
    { before: dashboardBefore.todayRevenue, after: dashboardAfter.todayRevenue },
  );

  console.log('\nPermissions (vendeur)');
  const seller = await signIn(SELLER);
  check('profil vendeur sans gestion des produits', seller.role === 'SELLER' && !seller.permissions.includes('product:manage') && seller.permissions.includes('sale:create'), seller.permissions);
  const sellerCreate = await failure(() =>
    api.createProduct({ nom: 'Interdit', unite: 'unité', categorieId: null, prixAchat: 1, prixVente: 2, seuilAlerte: 1 }, seller.defaultStoreId),
  );
  check('vendeur : création de produit → 403', sellerCreate?.status === 403, sellerCreate);
  const sellerCancel = await failure(() => api.cancelSale(sale.id));
  check('vendeur : annulation de vente → 403', sellerCancel?.status === 403, sellerCancel);
  const sellerSale = await api.createSale({ lignes: [{ produitId: created.id, quantite: 1 }], boutiqueId: seller.defaultStoreId, modePaiement: 'CASH', remise: 0 });
  check('vendeur : enregistrement de vente autorisé', sellerSale.id > sale.id);

  console.log('\nAnnulation et nettoyage');
  await signIn(OWNER);
  await api.cancelSale(sellerSale.id);
  await api.cancelSale(sale.id);
  const cancelled = await api.getSale(sale.id);
  details = await api.getProduct(created.id, storeId);
  check('annulation : statut + stock rétabli', cancelled.statut === 'CANCELLED' && details.quantiteStock === 15, { stock: details.quantiteStock });
  const twice = await failure(() => api.cancelSale(sale.id));
  check('double annulation → 409', twice?.status === 409, twice);
  const dashboardEnd = await api.getDashboard(storeId);
  check('tableau de bord : ventes annulées exclues', dashboardEnd.todayRevenue === dashboardBefore.todayRevenue);

  await api.updateProduct(created.id, { nom: `${name} (modifié)`, unite: 'pièce', categorieId: null, prixAchat: 700, prixVente: 1200, seuilAlerte: 4, actif: false });
  const active = await api.listProducts({ storeId, search: name, status: 'active' });
  const archived = await api.listProducts({ storeId, search: name, status: 'archived' });
  check('archivage : produit retiré des produits actifs', active.data.length === 0 && archived.data.length === 1);
  const archivedSale = await failure(() => api.createSale({ lignes: [{ produitId: created.id, quantite: 1 }], boutiqueId: storeId, modePaiement: 'CASH', remise: 0 }));
  check('vente d’un produit archivé → 404', archivedSale?.status === 404, archivedSale);

  console.log(`\n${passed} vérification(s) réussie(s), ${failures.length} échec(s).`);
  if (failures.length > 0) {
    console.log(failures.map((label) => `  - ${label}`).join('\n'));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nÉchec inattendu :', error);
  process.exit(1);
});
