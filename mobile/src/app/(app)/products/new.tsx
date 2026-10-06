import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { createProduct } from '@/api/endpoints';
import { useAccount } from '@/auth/SessionProvider';
import { EMPTY_PRODUCT_FORM, ProductForm } from '@/components/ProductForm';
import { useToast } from '@/components/Toast';
import { ErrorState } from '@/components/ui';

export default function NewProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { activeStoreId, activeStore, can } = useAccount();

  // L'écran reste atteignable par lien direct : le serveur refuserait de toute façon l'enregistrement.
  if (!can('product:manage')) {
    return <ErrorState message="Votre rôle ne permet pas d'ajouter des produits." />;
  }

  return (
    <ProductForm
      mode="create"
      initialValues={EMPTY_PRODUCT_FORM}
      submitLabel="Créer le produit"
      storeName={activeStore.nom}
      onSubmit={async (input) => {
        const product = await createProduct(input, activeStoreId);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['products'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        ]);
        toast('Produit créé');
        // La fiche du nouveau produit remplace le formulaire : « retour » ramène à la liste.
        router.replace({ pathname: '/products/[id]', params: { id: String(product.id) } });
      }}
    />
  );
}
