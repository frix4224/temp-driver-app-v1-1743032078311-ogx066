import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { storage } from '@/lib/storage';

interface Driver {
  id: string;
  name: string;
}

export default function StartShiftScreen() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDriverInfo();
  }, []);

  const loadDriverInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get driver info from storage
      const driverInfoStr = await storage.getItem('driverInfo');
      if (!driverInfoStr) {
        router.replace('/login');
        return;
      }

      const driverInfo = JSON.parse(driverInfoStr);
      setDriver(driverInfo);
    } catch (err) {
      console.error('Error loading driver info:', err);
      setError('Failed to load driver information');
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = () => {
    // TODO: Implement shift start logic
    router.push('/(app)/route-overview');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, styles.centerContent]}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.content, styles.centerContent]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDriverInfo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.welcome}>Welcome, {driver?.name || 'Driver'}</Text>
        <Text style={styles.timeSlot}>Time Slot: 17:00–22:00</Text>
        <Text style={styles.status}>Shift Status: Not Started</Text>

        <TouchableOpacity style={styles.startButton} onPress={handleStartShift}>
          <MapPin size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Start Shift</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  timeSlot: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
});