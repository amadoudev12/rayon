import Constants from 'expo-constants';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { API_URL, errorMessage } from '@/api/client';
import { useAccount } from '@/auth/SessionProvider';
import { StoreSwitcher } from '@/components/StoreSwitcher';
import { TabHeader } from '@/components/TabHeader';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, Divider, InfoRow, SectionHeader } from '@/components/ui';
import { confirmAction } from '@/lib/confirm';
import { initials } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

export default function AccountScreen() {
  const { profile, activeStore, signOut, refreshProfile } = useAccount();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const { user, organization } = profile;

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (error) {
      toast(errorMessage(error, 'Impossible de mettre à jour le profil.'), 'error');
    } finally {
      setRefreshing(false);
    }
  }

  function confirmSignOut() {
    confirmAction({
      title: 'Se déconnecter ?',
      message: 'Vous devrez saisir à nouveau vos identifiants sur cet appareil.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
      onConfirm: () => void signOut(),
    });
  }

  return (
    <View style={styles.root}>
      <TabHeader title="Compte" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.brand600} colors={[colors.brand600]} />
        }>
        <Card style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{initials(user.prenom, user.nom)}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user.prenom} {user.nom}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <Badge tone="brand" label={profile.roleLabel} />
            </View>
          </View>
        </Card>

        <SectionHeader title="Mes coordonnées" />
        <Card style={styles.cardPadded}>
          <InfoRow label="Email" value={user.email ?? '—'} />
          <Divider />
          <InfoRow label="Téléphone" value={user.telephone ?? '—'} />
        </Card>

        <SectionHeader title="Organisation" />
        <Card style={styles.cardPadded}>
          <InfoRow label="Nom" value={organization.nom} />
          <Divider />
          <InfoRow label="Devise" value={organization.devise} />
          <Divider />
          <View style={styles.storeRow}>
            <Text style={styles.storeLabel}>Boutique active</Text>
            <StoreSwitcher />
          </View>
        </Card>
        <Text style={styles.footnote}>
          {profile.restrictedToStore
            ? `Votre compte est rattaché à la boutique « ${activeStore.nom} ».`
            : profile.stores.length > 1
              ? 'Le tableau de bord, le stock et les ventes affichés sont ceux de la boutique active.'
              : 'La gestion des membres, des boutiques et des paramètres se fait sur l’application web.'}
        </Text>

        <Button label="Se déconnecter" icon="log-out-outline" variant="secondary" onPress={confirmSignOut} style={{ marginTop: spacing.xxl }} />

        <Text style={styles.version}>
          Rayon {Constants.expoConfig?.version ?? ''}
          {__DEV__ ? `\n${API_URL}` : ''}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand100 },
  avatarLabel: { fontSize: font.lg, fontWeight: '700', color: colors.brand700 },
  name: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  cardPadded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  storeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm },
  storeLabel: { fontSize: font.sm, color: colors.textMuted },
  footnote: { fontSize: font.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
  version: { fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl, lineHeight: 16 },
});
