import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/api/client';
import { createCategory, listCategories } from '@/api/endpoints';
import type { ProductInput } from '@/api/types';
import { useAccount } from '@/auth/SessionProvider';
import { SelectSheet } from '@/components/SelectSheet';
import { Banner, Button, Field, Input, SelectField } from '@/components/ui';
import { parseNumberInput } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

/** Valeurs des champs, telles que saisies (les nombres restent du texte jusqu'à l'envoi). */
export type ProductFormValues = {
  nom: string;
  prixAchat: string;
  prixVente: string;
  unite: string;
  seuilAlerte: string;
  quantiteInitiale: string;
  categorieId: number | null;
  actif: boolean;
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  nom: '',
  prixAchat: '',
  prixVente: '',
  unite: 'unité',
  seuilAlerte: '5',
  quantiteInitiale: '',
  categorieId: null,
  actif: true,
};

type FieldName = 'nom' | 'prixAchat' | 'prixVente' | 'unite' | 'seuilAlerte' | 'quantiteInitiale';

/**
 * Formulaire de création / modification d'un produit.
 *
 * Seule la présence des champs obligatoires est vérifiée ici : toutes les
 * règles (prix positifs, entiers, référence unique…) sont celles du serveur,
 * dont les erreurs sont affichées sous le champ concerné.
 */
export function ProductForm({
  mode,
  initialValues,
  submitLabel,
  storeName,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initialValues: ProductFormValues;
  submitLabel: string;
  /** Boutique qui reçoit le stock initial (création). */
  storeName?: string;
  onSubmit: (input: ProductInput) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { can } = useAccount();

  const [values, setValues] = useState(initialValues);
  const [missing, setMissing] = useState<Partial<Record<FieldName, string>>>({});
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  const addCategory = useMutation({
    mutationFn: () => createCategory(newCategoryName.trim()),
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      set('categorieId', category.id);
      setNewCategoryName('');
      setCategoryPickerOpen(false);
    },
  });

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** Erreur à afficher sous un champ : champ manquant, sinon erreur de validation du serveur. */
  function errorOf(field: FieldName) {
    return missing[field] ?? (submitError instanceof ApiError ? submitError.fieldError(field) : undefined);
  }

  async function submit() {
    const prixAchat = parseNumberInput(values.prixAchat);
    const prixVente = parseNumberInput(values.prixVente);
    const seuilAlerte = parseNumberInput(values.seuilAlerte);
    const quantiteInitiale = parseNumberInput(values.quantiteInitiale);

    const required: Partial<Record<FieldName, string>> = {};
    if (!values.nom.trim()) required.nom = 'Le nom du produit est requis.';
    if (prixAchat === null) required.prixAchat = "Saisissez le prix d'achat (0 si inconnu).";
    if (prixVente === null) required.prixVente = 'Saisissez le prix de vente.';
    if (!values.unite.trim()) required.unite = "L'unité est requise.";
    if (seuilAlerte === null) required.seuilAlerte = "Saisissez le seuil d'alerte.";
    if (values.quantiteInitiale.trim() !== '' && quantiteInitiale === null) required.quantiteInitiale = 'Quantité invalide.';
    setMissing(required);
    if (Object.keys(required).length > 0 || prixAchat === null || prixVente === null || seuilAlerte === null) return;

    const input: ProductInput = {
      nom: values.nom.trim(),
      unite: values.unite.trim(),
      categorieId: values.categorieId,
      prixAchat,
      prixVente,
      seuilAlerte,
      ...(mode === 'create' ? (quantiteInitiale !== null ? { quantiteInitiale } : {}) : { actif: values.actif }),
    };

    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(input);
    } catch (error) {
      setSubmitError(error);
      setSubmitting(false);
    }
  }

  const selectedCategory = categories.data?.find((category) => category.id === values.categorieId);
  const hasFieldErrors = submitError instanceof ApiError && Object.keys(submitError.fieldErrors).length > 0;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Nom du produit" error={errorOf('nom')}>
          <Input value={values.nom} onChangeText={(text) => set('nom', text)} placeholder="Ex : Riz parfumé 5 kg" invalid={Boolean(errorOf('nom'))} />
        </Field>

        <View style={styles.pair}>
          <Field label="Prix d'achat" error={errorOf('prixAchat')} style={styles.pairItem}>
            <Input
              value={values.prixAchat}
              onChangeText={(text) => set('prixAchat', text)}
              keyboardType="decimal-pad"
              placeholder="0"
              invalid={Boolean(errorOf('prixAchat'))}
            />
          </Field>
          <Field label="Prix de vente" error={errorOf('prixVente')} style={styles.pairItem}>
            <Input
              value={values.prixVente}
              onChangeText={(text) => set('prixVente', text)}
              keyboardType="decimal-pad"
              placeholder="0"
              invalid={Boolean(errorOf('prixVente'))}
            />
          </Field>
        </View>

        <View style={styles.pair}>
          <Field label="Unité" error={errorOf('unite')} style={styles.pairItem}>
            <Input
              value={values.unite}
              onChangeText={(text) => set('unite', text)}
              placeholder="unité, kg, litre…"
              autoCapitalize="none"
              invalid={Boolean(errorOf('unite'))}
            />
          </Field>
          <Field label="Seuil d'alerte" error={errorOf('seuilAlerte')} style={styles.pairItem}>
            <Input
              value={values.seuilAlerte}
              onChangeText={(text) => set('seuilAlerte', text)}
              keyboardType="number-pad"
              placeholder="5"
              invalid={Boolean(errorOf('seuilAlerte'))}
            />
          </Field>
        </View>

        {mode === 'create' && (
          <Field
            label="Stock initial (optionnel)"
            error={errorOf('quantiteInitiale')}
            hint={storeName ? `Quantité déjà en rayon dans « ${storeName} ».` : undefined}>
            <Input
              value={values.quantiteInitiale}
              onChangeText={(text) => set('quantiteInitiale', text)}
              keyboardType="number-pad"
              placeholder="0"
              invalid={Boolean(errorOf('quantiteInitiale'))}
            />
          </Field>
        )}

        <Field label="Catégorie (optionnel)" error={categories.isError ? 'Impossible de charger les catégories.' : undefined}>
          <SelectField value={selectedCategory?.nom} placeholder="Aucune" onPress={() => setCategoryPickerOpen(true)} />
        </Field>

        {mode === 'edit' && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Produit actif</Text>
              <Text style={styles.switchHint}>Un produit archivé n&apos;est plus proposé à la vente.</Text>
            </View>
            <Switch
              value={values.actif}
              onValueChange={(value) => set('actif', value)}
              trackColor={{ true: colors.brand500, false: colors.border }}
              thumbColor="#ffffff"
            />
          </View>
        )}

        {submitError !== null && !hasFieldErrors && <Banner message={errorMessage(submitError)} />}
        {hasFieldErrors && <Banner message="Certains champs sont invalides. Corrigez-les puis réessayez." />}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label={submitLabel} loading={submitting} onPress={() => void submit()} />
      </View>

      <SelectSheet<number | null>
        visible={categoryPickerOpen}
        title="Catégorie"
        options={[
          { value: null, label: 'Aucune' },
          ...(categories.data ?? []).map((category) => ({ value: category.id as number | null, label: category.nom })),
        ]}
        selected={values.categorieId}
        onSelect={(value) => set('categorieId', value)}
        onClose={() => setCategoryPickerOpen(false)}
        header={
          can('category:manage') ? (
            <>
              <View style={styles.newCategory}>
                <Input
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Nouvelle catégorie…"
                  style={{ flex: 1 }}
                  returnKeyType="done"
                />
                <Button
                  label="Ajouter"
                  variant="secondary"
                  loading={addCategory.isPending}
                  disabled={newCategoryName.trim().length === 0}
                  onPress={() => addCategory.mutate()}
                />
              </View>
              {addCategory.isError && <Banner message={errorMessage(addCategory.error)} />}
            </>
          ) : undefined
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.lg },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  switchLabel: { fontSize: font.md, fontWeight: '500', color: colors.text },
  switchHint: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  newCategory: { flexDirection: 'row', gap: spacing.sm },
});
