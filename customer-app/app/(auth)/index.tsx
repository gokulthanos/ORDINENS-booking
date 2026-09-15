import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SIZES } from '../../src/constants/theme';
import { useAuth } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to main app
  React.useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session, router]);

  const handleAuth = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your phone or email');
      return;
    }
    if (isRegistering && !name) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const email = identifier.includes('@')
        ? identifier
        : `${identifier.replace(/[^a-zA-Z0-9]/g, '')}@pentane.local`;
      const password = `Pentane_${identifier.slice(-6)}!`; // Matches existing web logic

      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, identifier } },
        });
        if (error) throw error;
        // The useAuth hook will detect session change and redirect
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login')) {
            Alert.alert('Not Found', 'Account not found. Please register first.');
            setIsRegistering(true);
          } else {
            throw error;
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>ORDINENS TECH</Text>
        <Text style={styles.subtitle}>
          {isRegistering ? 'Create an account to book your barber' : 'Login to book your barber'}
        </Text>

        {isRegistering && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone or email"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.switchButton} 
          onPress={() => setIsRegistering(!isRegistering)}
        >
          <Text style={styles.switchText}>
            {isRegistering 
              ? 'Already have an account? Login' 
              : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.xs,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: SIZES.lg,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
