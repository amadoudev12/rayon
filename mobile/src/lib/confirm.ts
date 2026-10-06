import { Alert, Platform } from 'react-native';

/** Demande une confirmation avant une action sensible (déconnexion, annulation d'une vente). */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  // `Alert` n'affiche rien dans un navigateur : l'aperçu web utilise la boîte de confirmation du navigateur.
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${options.title}\n\n${options.message}`)) options.onConfirm();
    return;
  }

  Alert.alert(options.title, options.message, [
    { text: 'Annuler', style: 'cancel' },
    { text: options.confirmLabel, style: options.destructive ? 'destructive' : 'default', onPress: options.onConfirm },
  ]);
}
