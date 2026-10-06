import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/components/ui';
import { colors } from '@/lib/theme';

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} size={23} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand600,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Hauteur explicite : icône + libellé tiennent sur toutes les plateformes, au-dessus de la zone système.
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 4,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.canvas },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: tabIcon('grid-outline', 'grid') }} />
      <Tabs.Screen name="products" options={{ title: 'Produits', tabBarIcon: tabIcon('cube-outline', 'cube') }} />
      <Tabs.Screen name="sales" options={{ title: 'Ventes', tabBarIcon: tabIcon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="account" options={{ title: 'Compte', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
