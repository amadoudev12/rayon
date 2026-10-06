import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { SessionProvider, useSession } from '@/auth/SessionProvider';
import { ToastProvider } from '@/components/Toast';
import { Button, ErrorState } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

// L'écran de démarrage reste affiché jusqu'à ce que la session soit connue.
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Réessayer n'a de sens que si le serveur n'a pas répondu ou a planté :
      // un refus (401, 403, 404, 409…) donnerait la même réponse.
      retry: (failureCount, error) => {
        const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
        return !isClientError && failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ToastProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { state, retry, signOut } = useSession();

  useEffect(() => {
    if (state.status !== 'loading') void SplashScreen.hideAsync();
  }, [state.status]);

  if (state.status === 'loading') return null;

  if (state.status === 'unreachable') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.canvas, padding: spacing.lg }}>
        <ErrorState message={state.message} onRetry={retry} />
        <Button label="Se déconnecter" variant="ghost" onPress={() => void signOut()} />
      </View>
    );
  }

  const signedIn = state.status === 'signedIn';

  // La garde décide des écrans accessibles : sans session, seul l'écran de
  // connexion existe ; avec une session, il disparaît de la navigation.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
