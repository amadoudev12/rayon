import { request, requestData } from './client';
import type {
  AccountProfile,
  Category,
  Customer,
  DashboardStats,
  LoginResult,
  Page,
  Product,
  ProductDetails,
  ProductInput,
  SaleDetails,
  SaleInput,
  SaleSummary,
  StockAdjustmentInput,
} from './types';

/**
 * Une fonction par route de l'API utilisée par le mobile. Aucune règle métier
 * ici : prix, totaux, stock et permissions sont décidés par le serveur.
 */

// --- Compte ------------------------------------------------------------------

export function login(identifiant: string, motDePasse: string) {
  return requestData<LoginResult>('/api/mobile/auth/login', {
    method: 'POST',
    body: { identifiant, motDePasse },
    authenticated: false,
  });
}

/** `token` : pour vérifier un jeton tout juste reçu, avant de l'adopter comme session. */
export function getProfile(token?: string) {
  return requestData<AccountProfile>('/api/me', { token });
}

// --- Tableau de bord ---------------------------------------------------------

export function getDashboard(storeId: number) {
  return requestData<DashboardStats>('/api/dashboard', { query: { storeId } });
}

// --- Produits ----------------------------------------------------------------

export type ProductStatusFilter = 'all' | 'active' | 'archived';

export function listProducts(params: {
  storeId: number;
  search?: string;
  status?: ProductStatusFilter;
  page?: number;
  limit?: number;
  sort?: 'creeLe' | 'nom' | 'prixVente';
  order?: 'asc' | 'desc';
}) {
  const { status, ...query } = params;
  return request<Page<Product>>('/api/products', {
    query: { ...query, status: status === 'all' ? undefined : status },
  });
}

export function getProduct(productId: number, storeId: number) {
  return requestData<ProductDetails>(`/api/products/${productId}`, { query: { storeId } });
}

/** `storeId` : boutique qui reçoit le stock initial. */
export function createProduct(input: ProductInput, storeId: number) {
  return requestData<Product>('/api/products', { method: 'POST', body: input, query: { storeId } });
}

export function updateProduct(productId: number, input: ProductInput) {
  return requestData<Product>(`/api/products/${productId}`, { method: 'PUT', body: input });
}

export function adjustStock(productId: number, input: StockAdjustmentInput) {
  return requestData<{ quantite: number }>(`/api/products/${productId}/stock`, { method: 'POST', body: input });
}

export function listCategories() {
  return requestData<Category[]>('/api/categories');
}

export function createCategory(nom: string) {
  return requestData<Category>('/api/categories', { method: 'POST', body: { nom } });
}

// --- Ventes ------------------------------------------------------------------

export function listSales(params: { storeId: number; search?: string; page?: number; limit?: number }) {
  return request<Page<SaleSummary>>('/api/sales', { query: params });
}

export function getSale(saleId: number) {
  return requestData<SaleDetails>(`/api/sales/${saleId}`);
}

export function createSale(input: SaleInput) {
  return requestData<{ id: number }>('/api/sales', { method: 'POST', body: input });
}

export function cancelSale(saleId: number) {
  return requestData<{ id: number }>(`/api/sales/${saleId}/cancel`, { method: 'POST' });
}

export function listCustomers(params: { search?: string; limit?: number } = {}) {
  return request<Page<Customer>>('/api/customers', { query: params });
}

export function createCustomer(nom: string) {
  return requestData<Customer>('/api/customers', { method: 'POST', body: { nom } });
}
