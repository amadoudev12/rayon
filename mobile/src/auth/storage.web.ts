/**
 * Variante navigateur (aperçu `expo start --web`) : le stockage sécurisé natif
 * n'existe pas sur le web, on utilise le stockage local de l'onglet.
 */
export async function getStoredItem(key: string): Promise<string | null> {
  return globalThis.localStorage?.getItem(key) ?? null;
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  globalThis.localStorage?.setItem(key, value);
}

export async function removeStoredItem(key: string): Promise<void> {
  globalThis.localStorage?.removeItem(key);
}
