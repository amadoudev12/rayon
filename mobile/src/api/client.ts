/**
 * Client HTTP de l'API du backend Next.js.
 *
 * Toutes les requêtes de l'application passent par `request()` : ajout du
 * jeton de session, délai maximal, et traduction de chaque échec en `ApiError`
 * avec un message affichable tel quel à l'utilisateur.
 */

const REQUEST_TIMEOUT_MS = 20_000;

/** Adresse du backend, définie dans `.env` (voir `.env.example`). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  /** Code HTTP, ou 0 quand le serveur n'a pas pu être joint. */
  readonly status: number;
  /** Erreurs de validation par champ renvoyées par le serveur (Zod), le cas échéant. */
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** Le serveur n'a pas répondu (hors ligne, mauvaise adresse, délai dépassé). */
  get isNetworkError() {
    return this.status === 0;
  }

  /** Première erreur du champ donné, pour l'afficher sous le champ du formulaire. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }
}

/** Message à afficher pour n'importe quelle erreur attrapée. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  return error instanceof ApiError ? error.message : fallback;
}

// Le jeton vit en mémoire pour être joint à chaque requête ; sa persistance
// (stockage sécurisé) et son cycle de vie sont gérés par auth/SessionProvider.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Appelé quand le serveur refuse le jeton (expiré, compte désactivé, accès retiré). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type QueryValue = string | number | boolean | null | undefined;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Faux pour les routes publiques (connexion) : pas de jeton, et un 401 n'y ferme pas la session. */
  authenticated?: boolean;
  /** Jeton à utiliser à la place du jeton courant (vérification juste après la connexion). */
  token?: string;
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const params = Object.entries(query ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${API_URL}${path}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/** Envoie une requête et retourne le corps JSON de la réponse (enveloppe comprise). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, authenticated = true } = options;

  if (!API_URL) {
    throw new ApiError(0, "L'adresse du serveur n'est pas configurée (EXPO_PUBLIC_API_URL).");
  }

  const token = options.token ?? authToken;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      0,
      controller.signal.aborted
        ? 'Le serveur met trop de temps à répondre. Réessayez.'
        : 'Impossible de joindre le serveur. Vérifiez votre connexion internet.',
    );
  } finally {
    clearTimeout(timeout);
  }

  // Une réponse non JSON (page d'erreur d'un proxy, HTML…) est traitée comme un corps vide.
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; errors?: { fieldErrors?: Record<string, string[]> } }
    | null;

  if (!response.ok) {
    const error = new ApiError(
      response.status,
      payload?.message ?? `Le serveur a répondu avec une erreur (${response.status}).`,
      payload?.errors?.fieldErrors ?? {},
    );
    // Uniquement pour le jeton courant : une vérification avec un jeton explicite gère elle-même son échec.
    if (response.status === 401 && authenticated && !options.token) onUnauthorized?.();
    throw error;
  }

  return payload as T;
}

/** Pour les routes qui répondent `{ data }`. */
export async function requestData<T>(path: string, options?: RequestOptions): Promise<T> {
  const payload = await request<{ data: T }>(path, options);
  return payload.data;
}
