import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ApiError, setAuthToken, setUnauthorizedHandler } from '@/api/client';
import { getProfile, login } from '@/api/endpoints';
import type { AccountProfile, Permission, StoreSummary } from '@/api/types';
import { getStoredItem, removeStoredItem, setStoredItem } from '@/auth/storage';

const TOKEN_KEY = 'session_token';
const ACTIVE_STORE_KEY = 'active_store';

type SessionState =
  /** Lecture du jeton enregistré au démarrage. */
  | { status: 'loading' }
  | { status: 'signedOut'; notice: string | null }
  /** Un jeton existe mais le serveur n'a pas pu être joint pour le vérifier. */
  | { status: 'unreachable'; message: string }
  | { status: 'signedIn'; profile: AccountProfile; activeStoreId: number };

type SessionContextValue = {
  state: SessionState;
  /** Lève une `ApiError` (message affichable) si la connexion est refusée. */
  signIn: (identifiant: string, motDePasse: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Nouvelle tentative après un état `unreachable`. */
  retry: () => void;
  setActiveStore: (storeId: number) => void;
  /** Recharge le profil (rôle, boutiques, permissions) depuis le serveur. */
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Boutique à afficher : la dernière choisie si elle est encore accessible, sinon celle par défaut. */
function pickActiveStore(profile: AccountProfile, storedId: string | null): number {
  const stored = Number(storedId);
  return profile.stores.some((store) => store.id === stored) ? stored : profile.defaultStoreId;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const clearSession = useCallback(
    async (notice: string | null) => {
      setAuthToken(null);
      setState({ status: 'signedOut', notice });
      // Aucune donnée d'un compte ne doit rester visible pour le suivant.
      queryClient.clear();
      await Promise.all([removeStoredItem(TOKEN_KEY), removeStoredItem(ACTIVE_STORE_KEY)]).catch(() => undefined);
    },
    [queryClient],
  );

  /** Restaure la session enregistrée sur le téléphone, en la faisant vérifier par le serveur. */
  const restore = useCallback(async () => {
    const token = await getStoredItem(TOKEN_KEY).catch(() => null);
    if (!token) {
      setState({ status: 'signedOut', notice: null });
      return;
    }

    try {
      const [profile, storedStore] = await Promise.all([
        getProfile(token),
        getStoredItem(ACTIVE_STORE_KEY).catch(() => null),
      ]);
      setAuthToken(token);
      setState({ status: 'signedIn', profile, activeStoreId: pickActiveStore(profile, storedStore) });
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        // Hors ligne : on garde le jeton, l'utilisateur pourra réessayer.
        setState({ status: 'unreachable', message: error.message });
      } else {
        // Jeton refusé, compte désactivé, boutique suspendue… : le message du serveur explique pourquoi.
        await clearSession(error instanceof ApiError ? error.message : null);
      }
    }
  }, [clearSession]);

  // Au démarrage, l'état initial est déjà « loading » : `restore` ne met l'état
  // à jour qu'après la lecture asynchrone du stockage, jamais pendant l'effet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restore();
  }, [restore]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void restore();
  }, [restore]);

  // Un 401 sur n'importe quelle requête signifie que le serveur ne reconnaît plus la session.
  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession('Votre session a expiré. Reconnectez-vous.'));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(async (identifiant: string, motDePasse: string) => {
    const { token } = await login(identifiant, motDePasse);
    // Le jeton n'est adopté que si le compte donne bien accès à un espace boutique
    // (sinon : inscription inachevée, boutique suspendue… le serveur dit pourquoi).
    const profile = await getProfile(token);
    await setStoredItem(TOKEN_KEY, token);
    setAuthToken(token);
    setState({ status: 'signedIn', profile, activeStoreId: profile.defaultStoreId });
  }, []);

  const signOut = useCallback(() => clearSession(null), [clearSession]);

  const setActiveStore = useCallback((storeId: number) => {
    setState((current) => {
      if (current.status !== 'signedIn') return current;
      if (!current.profile.stores.some((store) => store.id === storeId)) return current;
      return { ...current, activeStoreId: storeId };
    });
    void setStoredItem(ACTIVE_STORE_KEY, String(storeId)).catch(() => undefined);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await getProfile();
    setState((current) =>
      current.status === 'signedIn'
        ? { ...current, profile, activeStoreId: pickActiveStore(profile, String(current.activeStoreId)) }
        : current,
    );
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signOut, retry, setActiveStore, refreshProfile }),
    [state, signIn, signOut, retry, setActiveStore, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession doit être utilisé dans un SessionProvider.');
  return context;
}

/**
 * Compte connecté, pour les écrans de l'espace boutique (toujours rendus
 * derrière la garde de navigation : la session y est forcément ouverte).
 */
export function useAccount() {
  const { state, setActiveStore, signOut, refreshProfile } = useSession();
  if (state.status !== 'signedIn') throw new Error("useAccount doit être utilisé dans l'espace connecté.");

  const { profile, activeStoreId } = state;
  const activeStore = profile.stores.find((store) => store.id === activeStoreId) as StoreSummary;

  return {
    profile,
    currency: profile.organization.devise,
    activeStoreId,
    activeStore,
    /** Sert à afficher ou masquer une action ; le serveur revérifie toujours. */
    can: (permission: Permission) => profile.permissions.includes(permission),
    setActiveStore,
    signOut,
    refreshProfile,
  };
}
