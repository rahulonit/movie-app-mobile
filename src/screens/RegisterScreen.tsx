import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { register } from '../store/slices/authSlice';
import { AppDispatch } from '../store';

type Props = {
  navigation: any;
};

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>();

  const validate = () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return false;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return false;
    }

    const complexity = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!complexity.test(password)) {
      Alert.alert('Error', 'Password must contain uppercase, lowercase, and number');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await dispatch(register({ email, password, profileName: name })).unwrap();
      // No manual navigation; navigator will switch to ProfileSelection when auth state updates
    } catch (error: unknown) {
      // Handle both string and Thunk rejection payloads
      let message = 'Registration failed';
      if (typeof error === 'string') message = error;
      else if (error && typeof error === 'object') {
        // @ts-ignore - attempt common shapes
        message = error?.message || error?.toString?.() || message;
      }
      Alert.alert('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Sign Up</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.skipText}>SKIP</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Create an account to explore endless entertainment.
        </Text>

        <View style={styles.ssoContainer}>
          <TouchableOpacity style={styles.ssoButton}>
            <Text style={styles.ssoText}>G</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ssoButton}>
            <Text style={styles.ssoText}>f</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Shubham Kumari"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
          maxLength={50}
        />

        <Text style={styles.fieldLabel}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Your email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? 'Loading...' : 'CREATE ACCOUNT'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginButton}>
          <Text style={styles.link}>
            Already Have an Account? <Text style={styles.linkBold}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141414',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipText: {
    fontSize: 14,
    color: '#b3b3b3',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#b3b3b3',
    marginBottom: 30,
    lineHeight: 20,
  },
  ssoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  ssoButton: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  ssoText: {
    fontSize: 28,
    color: '#666',
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  button: {
    backgroundColor: '#E50914',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  link: {
    color: '#8f8f8f',
    textAlign: 'center',
    fontSize: 14,
  },
  linkBold: {
    color: '#fff',
    fontWeight: '600',
  },
});
