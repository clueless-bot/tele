import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useGoogleSignIn } from '../util/googleAuth';
import { FontAwesome } from '@expo/vector-icons';
import { useToast } from '../../components/ToastProvider';

type Extra = {
  BASE_URL: string;
};
const extra = Constants.expoConfig?.extra as Extra;

export default function LoginScreen() {
  const BASE_URL = extra.BASE_URL;
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signIn: signInWithGoogle } = useGoogleSignIn();
  const showToast = useToast();

  const logAuthToken = (token: string, source: string) => {
    if (__DEV__) {
      console.log(`[auth:${source}] token:`, token);
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) router.replace('/');
    };
    checkToken();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    const { email, password } = formData;
    if (!email || !password) {
      showToast('Enter both your email address and password.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.token) {
        await SecureStore.setItemAsync('userId', String(result.channel.id));
        await SecureStore.setItemAsync('userName', result.name || '');
        await SecureStore.setItemAsync('userEmail', result.channel?.email || '');
        await SecureStore.setItemAsync('userData', JSON.stringify(result.channel || {}));
        await SecureStore.setItemAsync('userToken', result.token);
        logAuthToken(result.token, 'login');

        router.replace('/');
      } else {
        showToast(result.message || (response.status === 401 ? 'That email or password is incorrect.' : 'We could not sign you in. Please try again.'), 'error');
      }
    } catch {
      showToast('We could not reach Teleplay. Check your connection and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Step 1: Authenticate with Google
      const googleResult = await signInWithGoogle();

      if (!googleResult.success) {
        showToast(googleResult.error || 'Google sign-in was not completed.', 'error');
        setIsLoading(false);
        return;
      }

      // Step 2: Send Google tokens to backend
      const response = await fetch(`${BASE_URL}/user/google-signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: googleResult.idToken,
          accessToken: googleResult.accessToken,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.token) {
        // Save user data
        await SecureStore.setItemAsync('userId', String(result.channel.id));
        await SecureStore.setItemAsync('userName', result.name || googleResult.user?.name || '');
        await SecureStore.setItemAsync('userEmail', result.channel?.email || googleResult.user?.email || '');
        await SecureStore.setItemAsync('userData', JSON.stringify(result.channel || {}));
        await SecureStore.setItemAsync('userToken', result.token);
        logAuthToken(result.token, 'google-login');

        router.replace('/');
      } else {
        showToast(result.message || 'Google sign-in could not be completed.', 'error');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      showToast(error.message || 'Google sign-in could not be completed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" strokeWidth={2} />
        </TouchableOpacity> */}

        <TouchableOpacity
  style={styles.backButton}
  onPress={() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/signup');
    }
  }}
>
  <ArrowLeft size={24} color="#000" strokeWidth={2} />
</TouchableOpacity>

        <View style={styles.brand}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>TELEPLAY · LOGIN</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Mail size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8e8e93"
            value={formData.email}
            onChangeText={value => handleInputChange('email', value)}
            keyboardType="email-address"
            cursorColor="#0088cc"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Lock size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8e8e93"
            value={formData.password}
            onChangeText={value => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            cursorColor="#0088cc"
          />
          <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
            {showPassword ? (
              <EyeOff size={20} color="#0088cc" />
            ) : (
              <Eye size={20} color="#0088cc" />
            )}
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.googleButton, isLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <View style={styles.googleButtonContent}>
            <FontAwesome name="google" size={18} color="#DB4437" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </View>
        </TouchableOpacity>

        {/* Footer Link */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={{ color: '#0088cc', fontSize: 16 }}>
              Don’t have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18, backgroundColor: '#F7F9FC',
  },
  backButton: { position: 'absolute', left: 20, padding: 9, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0' },
  brand: { flexDirection: 'row', alignItems: 'center', maxWidth: '78%' },
  logo: { width: 36, height: 36, borderRadius: 11, marginRight: 9 },
  title: { color: '#101828', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 44, maxWidth: 540, width: '100%', alignSelf: 'center' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#D0D5DD', marginBottom: 14, paddingHorizontal: 15, height: 54,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#000000', fontSize: 16 },
  loginButton: {
    backgroundColor: '#0B78D1', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
