import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL, ApiError, errorMessage } from '@/api/client';
import { useSession } from '@/auth/SessionProvider';
import { Banner, Button, Card, Field, Input } from '@/components/ui';
import { colors, font, radius, spacing, TOUCH_TARGET } from '@/lib/theme';

/** L'application web est servie par le même serveur que l'API. */
const WEB_APP_URL = API_URL || 'https://rayon-two.vercel.app';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { state, signIn } = useSession();
  const passwordRef = useRef<TextInput>(null);

  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  // Message laissé par une fermeture de session (expiration, accès retiré…).
  const notice = state.status === 'signedOut' ? state.notice : null;
  const fieldError = (field: string) => (error instanceof ApiError ? error.fieldError(field) : undefined);

  async function submit() {
    if (!identifiant.trim() || !motDePasse) {
      setError('Saisissez votre identifiant et votre mot de passe.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // En cas de succès, la garde de navigation remplace cet écran par l'application.
      await signIn(identifiant.trim(), motDePasse);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : errorMessage(caught, 'Connexion impossible.'));
      setSubmitting(false);
    }
  }

  const message = typeof error === 'string' ? error : error && Object.keys(error.fieldErrors).length === 0 ? error.message : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="storefront" size={26} color="#ffffff" />
          </View>
          <Text style={styles.appName}>Rayon</Text>
          <Text style={styles.tagline}>Votre boutique, dans votre poche.</Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accédez à votre espace de gestion.</Text>

          {notice && !error && <Banner message={notice} tone="warning" />}

          <Field label="Email ou téléphone" error={fieldError('identifiant')}>
            <Input
              value={identifiant}
              onChangeText={setIdentifiant}
              placeholder="vous@exemple.com ou +221 77 123 45 67"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              invalid={Boolean(fieldError('identifiant'))}
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
            />
          </Field>

          <Field label="Mot de passe" error={fieldError('motDePasse')}>
            <View>
              <Input
                ref={passwordRef}
                value={motDePasse}
                onChangeText={setMotDePasse}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                invalid={Boolean(fieldError('motDePasse'))}
                onSubmitEditing={() => void submit()}
                style={{ paddingRight: TOUCH_TARGET }}
              />
              <Pressable
                accessibilityRole="button"
        accessibilityLabel={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          </Field>

          {message && <Banner message={message} />}

          <Button label="Se connecter" loading={submitting} onPress={() => void submit()} />
        </Card>

        <Text style={styles.footnote}>
          La création de compte et l&apos;inscription d&apos;une boutique se font sur l&apos;application web.
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(WEB_APP_URL).catch(() => setError("Impossible d'ouvrir le site."))}
          style={styles.link}>
          <Text style={styles.linkLabel}>Créer un compte sur le site</Text>
        </Pressable>
        {__DEV__ && <Text style={styles.server}>Serveur : {API_URL || 'non configuré'}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand600,
    marginBottom: spacing.sm,
  },
  appName: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  tagline: { fontSize: font.sm, color: colors.textMuted },
  card: { padding: spacing.xl, gap: spacing.lg, width: '100%', maxWidth: 440, alignSelf: 'center' },
  title: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: -spacing.md },
  passwordToggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
  link: { minHeight: TOUCH_TARGET, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: -spacing.lg },
  linkLabel: { fontSize: font.sm, fontWeight: '600', color: colors.brand600 },
  server: { fontSize: 11, color: colors.textFaint, textAlign: 'center' },
});
