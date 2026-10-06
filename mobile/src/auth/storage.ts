import * as SecureStore from 'expo-secure-store';

/**
 * Stockage persistant de la session sur le téléphone : trousseau iOS /
 * Keystore Android, chiffré par le système.
 */
export function getStoredItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export function setStoredItem(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value);
}

export function removeStoredItem(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key);
}
