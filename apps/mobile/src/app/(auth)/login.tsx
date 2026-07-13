import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Link, Stack, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fonts } from '@/theme/tokens';
import { useAuth } from '@/auth/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.replace('/');
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      setError(msg ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '로그인' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="아이디"
          placeholderTextColor="#8E8E93"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          placeholderTextColor="#8E8E93"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={onSubmit}
        />
        {error != null && <ThemedText style={styles.error}>{error}</ThemedText>}
        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>로그인</ThemedText>
          )}
        </Pressable>
        <Link href="/signup" style={styles.link}>
          <ThemedText type="small">계정이 없으신가요? 회원가입</ThemedText>
        </Link>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: '#FFFFFF',
  },
  error: {
    color: '#FF453A',
  },
  button: {
    backgroundColor: '#855BFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  link: {
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
