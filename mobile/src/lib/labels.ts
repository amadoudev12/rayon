import type { PaymentMethod, StockMovementType } from '@/api/types';
import type { Tone } from '@/lib/theme';

/** Libellés affichés pour chaque mode de paiement (mêmes textes que le web). */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile Money',
  CREDIT: 'Crédit client',
  OTHER: 'Autre',
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

/** Libellé et couleur de badge pour chaque type de mouvement de stock. */
export const MOVEMENT_LABELS: Record<StockMovementType, { label: string; tone: Tone }> = {
  PURCHASE: { label: 'Achat', tone: 'success' },
  SALE: { label: 'Vente', tone: 'danger' },
  SALE_CANCELLATION: { label: 'Vente annulée', tone: 'success' },
  ADJUSTMENT: { label: 'Ajustement', tone: 'warning' },
  INITIAL: { label: 'Stock initial', tone: 'neutral' },
};
