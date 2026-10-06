import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { getProduct, updateProduct } from '@/api/endpoints';
import { useAccount } from '@/auth/SessionProvider';
import { ProductForm } from '@/components/ProductForm';
import { useToast } from '@/components/Toast';
import { ErrorState, LoadingState } from '@/components/ui';

export default function EditProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const { activeStoreId, can } = useAccount();

  // Même clé que la fiche produit : les valeurs sont déjà en cache en arrivant depuis celle-ci.
  const product = useQuery({
    queryKey: ['products', 'detail', productId, activeStoreId],
    queryFn: () => getProduct(productId, activeStoreId),
    enabled: Number.isInteger(productId) && productId > 0,
  });

  if (!can('product:manage')) {
    return <ErrorState message="Votre rôle ne permet pas de modifier les produits." />;
  }
  if (!Number.isInteger(productId) || productId <= 0) {
    return <ErrorState message="Ce produit est introuvable." />;
  }
  if (product.isPending) return <LoadingState />;
  if (product.isError) {
    return <ErrorState message={errorMessage(product.error)} onRetry={() => void product.refetch()} />;
  }

  const data = product.data;

  return (
    <ProductForm
      mode="edit"
      initialValues={{
        nom: data.nom,
        prixAchat: String(Number(data.prixAchat)),
        prixVente: String(Number(data.prixVente)),
        unite: data.unite,
        seuilAlerte: String(data.seuilAlerte),
        quantiteInitiale: '',
        categorieId: data.categorieId,
        actif: data.actif,
      }}
      submitLabel="Enregistrer"
      onSubmit={async (input) => {
        await updateProduct(productId, input);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['products'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        ]);
        toast('Produit mis à jour');
        router.back();
      }}
    />
  );
}
