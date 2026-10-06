import { Stack } from 'expo-router';

import { colors } from '@/lib/theme';

/** Espace connecté : les onglets, et par-dessus les écrans de détail et de saisie. */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.brand600,
        headerTitleStyle: { color: colors.text, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="products/[id]/index" options={{ title: 'Produit' }} />
      <Stack.Screen name="products/[id]/edit" options={{ title: 'Modifier le produit' }} />
      <Stack.Screen name="products/new" options={{ title: 'Nouveau produit' }} />
      <Stack.Screen name="sales/[id]" options={{ title: 'Vente' }} />
      <Stack.Screen name="sales/new" options={{ title: 'Nouvelle vente' }} />
    </Stack>
  );
}
