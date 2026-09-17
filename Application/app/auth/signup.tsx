import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Phone, Lock, Shield, Eye, EyeOff } from 'lucide-react-native';
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

export default function SignUpScreen() {
  const BASE_URL = extra.BASE_URL;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    otp: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpVerificationFailed, setOtpVerificationFailed] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // ✅ new state
  const router = useRouter();
  const { signIn: signInWithGoogle } = useGoogleSignIn();
  const showToast = useToast();

  const logAuthToken = (token: string, source: string) => {
    if (__DEV__) {
      console.log(`[auth:${source}] token:`, token);
    }
  };

  // Timer effect for OTP resend
  useEffect((): (() => void) => {
    let interval: NodeJS.Timeout | null = null;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000) as unknown as NodeJS.Timeout;
    } else if (timer === 0 && otpSent) setCanResendOtp(true);
    return () => interval && clearTimeout(interval);
  }, [otpSent, timer]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const sendOTP = async () => {
    if (!formData.email) return showToast('Enter your email address before requesting an OTP.', 'error');

    setIsLoading(true);
    setOtpVerificationFailed(false);
    setCanResendOtp(false);
    setTimer(60);

    try {
      const response = await fetch(`${BASE_URL}/sendOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Handle non-JSON response
        const textResponse = await response.text();
        console.log('Non-JSON response:', textResponse);
        throw new Error('Server returned non-JSON response');
      }

      if (response.ok) {
        setOtpSent(true);
        showToast('OTP sent. Check your email inbox.', 'success');
      } else {
        showToast(result.message || 'We could not send an OTP. Please try again.', 'error');
        setTimer(0);
        setCanResendOtp(true);
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      showToast('We could not reach Teleplay. Check your connection and try again.', 'error');
      setTimer(0);
      setCanResendOtp(true);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!formData.otp) return showToast('Enter the OTP sent to your email.', 'error');

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/verifyOTP`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setIsOtpVerified(true);
        setOtpVerificationFailed(false);
        showToast('Email verified. You can create your account.', 'success');
      } else {
        setOtpVerificationFailed(true);
        showToast(result.message || 'That OTP is invalid or has expired.', 'error');
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      showToast('We could not reach Teleplay. Check your connection and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    const { name, email, phoneNumber, password } = formData;
    if (!name || !email || !phoneNumber || !password)
      return showToast('Complete your name, email, phone number, and password.', 'error');
    if (!isOtpVerified) return showToast('Verify your email OTP before creating an account.', 'error');

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phoneNumber, password }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.token) {
        await SecureStore.setItemAsync('userId', String(result.channel.id));
        await SecureStore.setItemAsync('userName', name);
        await SecureStore.setItemAsync('userEmail', email);
        await SecureStore.setItemAsync('userData', JSON.stringify(result.channel || {}));
        await SecureStore.setItemAsync('userToken', result.token);
        logAuthToken(result.token, 'signup');

        router.replace('/');
      } else {
        showToast(result.message || 'We could not create your account. Please review your details.', 'error');
      }
    } catch (error) {
      console.error('SignUp Error:', error);
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
	        logAuthToken(result.token, 'google-signup');

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
      <View style={styles.header}>
        <TouchableOpacity
  style={styles.backButton}
  onPress={() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/auth/login');
    }
  }}
>
  <ArrowLeft size={24} color="#000" strokeWidth={2} />
</TouchableOpacity>

        <View style={styles.brand}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
          <Text style={styles.title}>TELEPLAY · SIGN UP</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Name Input */}
        <View style={styles.inputContainer}>
          <User size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#8e8e93"
            value={formData.name}
            onChangeText={text => handleInputChange('name', text)}
            cursorColor="#0088cc"
          />
        </View>

        {/* Email Input + OTP */}
        <View style={styles.inputContainer}>
          <Mail size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8e8e93"
            value={formData.email}
            onChangeText={text => handleInputChange('email', text)}
            editable={!otpSent}
            cursorColor="#0088cc"
          />
          {!otpSent && (
            <TouchableOpacity style={styles.otpButton} onPress={sendOTP} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.otpButtonText}>Send OTP</Text>}
            </TouchableOpacity>
          )}
        </View>

        {otpSent && timer > 0 && <Text style={styles.timerText}>Resend OTP in {timer}s</Text>}

        {otpSent && (
          <View style={styles.inputContainer}>
            <Shield size={20} color="#0088cc" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Enter OTP"
              placeholderTextColor="#8e8e93"
              value={formData.otp}
              onChangeText={text => handleInputChange('otp', text)}
              keyboardType="numeric"
              maxLength={6}
              cursorColor="#0088cc"
            />
            <TouchableOpacity
              style={styles.otpButton}
              onPress={otpVerificationFailed || canResendOtp ? sendOTP : verifyOTP}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.otpButtonText}>{otpVerificationFailed || canResendOtp ? 'Resend OTP' : 'Verify OTP'}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Phone Input */}
        <View style={styles.inputContainer}>
          <Phone size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#8e8e93"
            value={formData.phoneNumber}
            onChangeText={text => handleInputChange('phoneNumber', text)}
            keyboardType="phone-pad"
            cursorColor="#0088cc"
          />
        </View>

        {/* Password Input with Show/Hide Toggle */}
        <View style={styles.inputContainer}>
          <Lock size={20} color="#0088cc" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8e8e93"
            value={formData.password}
            onChangeText={text => handleInputChange('password', text)}
            secureTextEntry={!showPassword} // ✅ toggle
            cursorColor="#0088cc"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <EyeOff size={20} color="#0088cc" />
            ) : (
              <Eye size={20} color="#0088cc" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signUpButton, !isOtpVerified && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={!isOtpVerified || isLoading}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpButtonText}>Sign Up</Text>}
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

        {/* Link to Login */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={{ color: '#0088cc', fontSize: 16 }}>
              Already have an account? Log in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, backgroundColor: '#F7F9FC' },
  backButton: { position: 'absolute', left: 20, padding: 9, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EAECF0' },
  brand: { flexDirection: 'row', alignItems: 'center', maxWidth: '78%' },
  logo: { width: 36, height: 36, borderRadius: 11, marginRight: 9 },
  title: { color: '#101828', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 44, maxWidth: 540, width: '100%', alignSelf: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#D0D5DD', marginBottom: 14, paddingHorizontal: 15, height: 54 },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#000000', fontSize: 16 },
  otpButton: { backgroundColor: '#0B78D1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 10 },
  otpButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  timerText: { color: '#000', textAlign: 'center', marginBottom: 10 },
  signUpButton: { backgroundColor: '#0B78D1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  signUpButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
