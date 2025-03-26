import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { Svg, Path } from 'react-native-svg';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if the driver exists and is active
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, email, name')
        .eq('email', email.toLowerCase())
        .eq('status', true)
        .single();

      if (driverError || !driver) {
        setError('Invalid credentials or inactive account');
        return;
      }

      // Store the driver info in storage
      await storage.setItem('driverInfo', JSON.stringify(driver));

      // If successful, redirect to the app
      router.replace('/(app)/start-shift');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Svg width={120} height={40} viewBox="0 0 2249.8 753.1">
            <Path
              fill="#007AFF"
              d="M373.5,218.1c-35.5-34.3-83.8-53.8-133.5-58.1v-4.3c-.5-17.5-.9-21.3-3.2-26.4-4-8.8-10.1-15-25.4-25.6-7.5-5.2-15.6-11.2-17.8-13.4-6.8-6.5-8.3-18.3-3.3-26.1,1.1-1.7,5.2-4.6,9.1-6.6,12.4-6.2,28.4-4.5,37.9,3.9,6.1,5.5,7.9,10.4,8.8,25,.6,9.4,1.4,13,3.1,14.7,8.1,8.3,44.8,7,49.4-1.7,1.8-3.4.4-25.7-2.3-37.1-5.4-22.7-22.7-44.7-42.8-54.3-12.3-5.9-21.4-7.8-36.8-7.8h0c-21.1,0-37.5,4.9-51.7,15.6-25.6,19.2-38.1,49.7-31.8,77.2,4.3,18.7,14.7,32.4,35,46.2,13,8.9,17.5,13.6,18.4,21.8-38.5,5.1-75.5,19.4-105.6,43.2C32.8,242.2,6,298,1,358.4c-4,46.2,4.8,95.3,28.4,135.7,58.7,100,191.2,128.9,293.8,82.4,31.6-14.2,58.4-37.4,77.7-66,6.9-10.2,15.6-22.5,16-35.6,0-9.8-5.8-17.4-14.9-20.7-6.9-3.6-14.5-3.6-21.4-3.6h-34.2c-8.4,0-17.4,0-25.4,3.6-10.2,4.7-16.7,14.5-24.4,22.5-10.2,10.5-21.8,19.3-35.3,24.7-40.9,16.4-93.6,6.2-121.8-28.3-15.5-19.1-22.1-41.7-26.4-65.3h158c0,0,106.5,0,106.5,0,12.7,0,32,3.6,42.7-4.4,14.5-10.6,10.9-37.3,9.8-52.7-4-49.6-19.7-97.1-56.4-132.5ZM117.1,337.4c15.6-76.6,109.9-114,171.1-63.6,9.5,7.6,17.1,17.4,22.9,28,6.2,11.2,10.9,22.9,12.4,35.5H117.1Z"
            />
            <Path
              fill="#007AFF"
              d="M2240.9,178.3c-7.6-5.1-17.5-5.1-26.5-5.1h-40.6c-12.7,0-25.4,0-33.8,11.7-6.5,8.7-8.7,21.1-12,31.3-6.5,20.4-12.7,40.5-19.2,60.9-21.1,67.2-41.2,134.7-63.3,201.6l-.2-1.4c-8.7-18.5-13.5-39.9-19.7-59.6-9.5-31.3-19.3-62.7-29.5-93.8-10.9-33.8-21.5-67.6-32-101.4-4.4-14.2-7.3-34.5-19.7-44.3-7.3-5.8-16-6.5-25.1-6.5-13.1,0-26.2,0-39.3,0s-17.4,0-25.5,3.6c-8.4,3.6-14.5,10.2-15.6,19.3,0,11.3,5.1,22.9,8.7,33.1,7.6,20,14.9,39.8,22.6,59.6,27.7,71.6,54.8,143.6,81.9,215.5,6.9,18.5,14.2,37.1,21.1,55.8,3.6,8.7,8.7,18.5,9.1,28,0,14.5-7.6,32-14.5,44.4-10.9,18.9-28.3,35.3-51.1,36.6-15.6,0-38.5-8.3-51.3,4.8-6.9,7.3-5.8,18.2-5.8,27.3,0,17.1-3.6,36.6,15.3,45.7,3.6,3.6,7.6,3.6,11.3,4,15.3,4,31.3,3.6,46.9,3.6,28,0,55.5-3.6,79.9-17.8,30.9-18.9,48.7-50.7,64.3-82.2,29.8-60.4,49.8-126.2,74.1-188.9,12.7-33.5,25.4-66.8,37.9-100.2,17.1-45.3,34.5-90.4,51.5-135.7,5.8-15.3,16.7-38.3,0-49.6Z"
            />
            <Path
              fill="#007AFF"
              d="M918.9,468.9v-215.5c0-15.3,0-30.5,0-45.6,0-9.8,0-21.1-8.4-28.4-8-8-18.9-8.4-29.8-8.4s-30.5,0-45.7,0-15.3,3.6-20.4,8.4c-9.1,10.2-6.2,27.3-6.2,39.8-16-18.5-32.4-33.8-54.5-44.6-76.3-37.3-171.8-8.3-222.5,57.4-80.5,104-55.8,285.9,66.7,346.4,31.6,15.6,67.7,21.1,102.7,17.4,45.2-4.3,82.1-24.7,111.9-58.6-.2,13.7-3.3,31.6,9.1,41.1,7.6,6.5,18.2,6.2,27.6,6.2,20.7,0,56.9,6.9,65.9-17.8,4-10.9,3.6-24,3.6-35.6v-62.1ZM745.7,503.8c-8.7,3.6-18.2,6.2-28,6.9-12.7,0-25.8,0-38-3.6-91.8-25.8-107.4-164.9-45.4-227.2,18.9-18.9,43-28.4,69.4-30.2v.4c43.5-3.6,82.8,26.9,99.7,65.4,27.6,63.2,12.4,159.5-57.6,188.2Z"
            />
            <Path
              fill="#007AFF"
              d="M1798.2,177.1c-7.6-5.1-17.5-4.7-26.5-5.1h-40.6c-12.7,0-25.4,0-33.8,11.7-6.5,8.7-8.7,21.1-12,31.3-6.5,20.4-12.7,40.5-19.2,60.9-20.7,67.2-41.2,134.7-63.3,201.6l-.9-1.4c-8.7-18.5-13.5-39.9-19.7-59.6-9.5-31.3-19.3-62.7-29.5-93.8-10.9-33.8-21.5-67.6-31.7-101.4-4.4-14.2-7.3-34.5-19.6-44.3-7.3-5.8-16-6.5-25.1-6.5-13.1,0-26.2,0-39.3,0-8.4,0-17.4,0-25.5,3.6-8.4,3.6-14.5,10.2-15.6,19.3,0,10.9,4.8,21.8,8.4,31.6,7.6,19.6,14.9,39.8,22.6,59.6,27.6,71.2,53.9,143,81.5,214.2,7.3,18.9,14.6,38,21.8,57,3.6,9.1,9.1,19.3,9.5,29.1,0,14.5-7.6,32-14.5,44.4-10.9,18.9-28.3,35.3-51.1,36.6-15.6,0-38.5-8.3-51.3,4.8-6.9,7.3-5.8,18.2-5.8,27.3,0,17.1-3.6,36.5,15.3,45.7,3.6,3.6,7.6,3.6,11.3,4.4,15.3,4,31.3,3.6,46.9,3.6,28,0,55.5-3.6,79.9-17.8,34.2-21.1,53.7-58.1,69.5-93.6,25.8-57.9,46-118.4,68.8-177.5,12.7-33.5,25.4-66.8,38-100.2,17.1-45.3,34.5-90.4,51.5-135.7,5.8-15.3,16.7-38.3,0-49.6Z"
            />
            <Path
              fill="#007AFF"
              d="M1347.1,503.9c-10.9-5.8-25.1-4-36.7-4h-73.5s-105.2,0-105.2,0c54.6-70,114.8-136,171.6-204.2,13.4-16,31.6-32,40.9-50.7,5.1-9.8,4.3-21.1,4.3-31.6s0-17.4-3.6-25.5c-6.2-16.7-22.5-17.8-38-17.8h-36.8s-176.2,0-176.2,0h-46.9c-9.1,0-19.3,0-28,3.6-5.8,3.6-10.5,7.6-13.1,13.5-3.6,6.9-3.6,14.5-3.6,21.4,0,14.9-3.6,32.4,12.7,41.2,9.5,5.8,21.1,4.4,31.6,4.4h62.1s95.1,0,95.1,0l.3.3c-57.4,69.5-116,137.9-174.1,206.7-13.1,15.3-30.9,31.3-39.7,49.5-6.9,14.2-6.9,42.2,0,57,3.6,8.7,11.6,14.2,21.1,16,18.9,3.6,40.3,0,59.6,0h191.4c0,0,52,0,52,0,10.2,0,21.1,0,30.5-3.6,5.8-3.6,9.8-7.3,12.4-13.1,3.6-6.9,3.6-14.2,3.6-21.4,0-14.9,0-33.4-13.8-41.6Z"
            />
          </Svg>
        </View>
        <Text style={styles.subtitle}>Driver Portal</Text>
      </View>

      <View style={styles.form}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LogIn size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Login</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  form: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#111',
    color: '#fff',
  },
  loginButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});