/**
 * Formes JSON renvoyées par l'API du backend Next.js (src/app/api/**).
 *
 * Deux particularités du format JSON par rapport aux types du serveur :
 * - les montants (Decimal en base) arrivent sous forme de chaînes → `Money` ;
 * - les dates arrivent sous forme de chaînes ISO → `IsoDate`.
 */

/** Montant décimal sérialisé (ex : "1500" ou "1500.5"). À convertir avec `Number()` pour l'affichage. */
export type Money = string | number;
export type IsoDate = string;

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SELLER' | 'STOCK_MANAGER';
export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'CREDIT' | 'OTHER';
export type SaleStatus = 'COMPLETED' | 'CANCELLED';
export type StockMovementType = 'PURCHASE' | 'SALE' | 'SALE_CANCELLATION' | 'ADJUSTMENT' | 'INITIAL';

/** Permissions calculées par le serveur (src/lib/auth/permissions.ts). */
export type Permission =
  | 'org:manage'
  | 'members:manage'
  | 'store:manage'
  | 'category:manage'
  | 'product:manage'
  | 'stock:adjust'
  | 'purchase:manage'
  | 'supplier:manage'
  | 'customer:manage'
  | 'sale:create'
  | 'sale:cancel'
  | 'expense:manage'
  | 'report:view';

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Page<T> = { data: T[]; pagination: Pagination };

// --- Compte ------------------------------------------------------------------

export type LoginResult = { token: string; expiresAt: IsoDate };

export type StoreSummary = { id: number; nom: string; parDefaut: boolean };

/** GET /api/me */
export type AccountProfile = {
  user: { id: number; prenom: string; nom: string; email: string | null; telephone: string | null };
  organization: { id: number; nom: string; devise: string };
  role: Role;
  roleLabel: string;
  stores: StoreSummary[];
  defaultStoreId: number;
  restrictedToStore: boolean;
  permissions: Permission[];
};

// --- Tableau de bord ---------------------------------------------------------

/** GET /api/dashboard (voir src/lib/services/dashboard.ts pour les règles de calcul). */
export type DashboardStats = {
  period: { start: IsoDate; previousStart: IsoDate; previousEnd: IsoDate };
  revenue: number;
  previousRevenue: number;
  revenueChange: number | null;
  salesCount: number;
  averageBasket: number;
  todayRevenue: number;
  todaySalesCount: number;
  costOfGoodsSold: number;
  grossMargin: number;
  grossMarginRate: number | null;
  expensesTotal: number;
  netProfit: number;
  activeProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStock: {
    productId: number;
    productName: string;
    unit: string;
    storeId: number;
    storeName: string;
    quantity: number;
    alertThreshold: number;
  }[];
  topProducts: { productId: number; productName: string; unit: string; quantity: number; amount: number }[];
  trend: { day: string; value: number; count: number }[];
  recentActivity: {
    type: 'sale' | 'expense';
    id: number;
    label: string;
    subtitle: string;
    amount: number;
    cancelled: boolean;
    createdAt: IsoDate;
  }[];
};

// --- Catalogue ---------------------------------------------------------------

export type Category = { id: number; nom: string; description: string | null };

/** Élément de GET /api/products */
export type Product = {
  id: number;
  nom: string;
  description: string | null;
  reference: string | null;
  codeBarres: string | null;
  unite: string;
  prixAchat: Money;
  prixVente: Money;
  seuilAlerte: number;
  actif: boolean;
  categorieId: number | null;
  categorie: { id: number; nom: string } | null;
  /** Stock dans la boutique demandée. */
  quantiteStock: number;
  creeLe: IsoDate;
  modifieLe: IsoDate;
};

/** GET /api/products/[id] */
export type ProductDetails = Product & {
  stocks: { quantite: number; boutique: { id: number; nom: string } }[];
  mouvementsStock: {
    id: number;
    type: StockMovementType;
    variationQuantite: number;
    note: string | null;
    creeLe: IsoDate;
    boutique: { nom: string };
    utilisateur: { prenom: string; nom: string };
  }[];
  ventes: { nombre: number; quantite: number; montant: Money };
};

/** Corps de POST /api/products et PUT /api/products/[id] (validé par productSchema côté serveur). */
export type ProductInput = {
  nom: string;
  unite: string;
  categorieId: number | null;
  prixAchat: number;
  prixVente: number;
  seuilAlerte: number;
  /** Création uniquement. */
  quantiteInitiale?: number;
  /** Modification uniquement. */
  actif?: boolean;
};

export type StockAdjustmentInput = { variationQuantite: number; note?: string; boutiqueId: number };

// --- Ventes ------------------------------------------------------------------

export type Customer = { id: number; nom: string; telephone: string | null };

/** Élément de GET /api/sales */
export type SaleSummary = {
  id: number;
  statut: SaleStatus;
  modePaiement: PaymentMethod;
  total: Money;
  creeLe: IsoDate;
  lignes: { id: number; quantite: number; produit: { id: number; nom: string } }[];
  client: { id: number; nom: string } | null;
  vendeur: { id: number; prenom: string; nom: string };
};

/** GET /api/sales/[id] */
export type SaleDetails = {
  id: number;
  statut: SaleStatus;
  modePaiement: PaymentMethod;
  sousTotal: Money;
  remise: Money;
  total: Money;
  montantPaye: Money;
  note: string | null;
  creeLe: IsoDate;
  annuleLe: IsoDate | null;
  lignes: {
    id: number;
    quantite: number;
    prixUnitaire: Money;
    sousTotal: Money;
    produit: { id: number; nom: string; unite: string };
  }[];
  client: { id: number; nom: string; telephone: string | null } | null;
  vendeur: { id: number; prenom: string; nom: string };
  boutique: { id: number; nom: string };
};

/** Corps de POST /api/sales (validé par saleSchema côté serveur, qui fixe lui-même les prix). */
export type SaleInput = {
  lignes: { produitId: number; quantite: number }[];
  clientId?: number;
  boutiqueId: number;
  modePaiement: PaymentMethod;
  remise: number;
};
