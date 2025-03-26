import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Navigation, ArrowLeft, Package } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

// Only import MapView when not on web
let MapView: any;
let Marker: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

interface Stop {
  id: string;
  orderId: string;
  customerName: string;
  address: string;
  type: 'dropoff' | 'pickup';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function MapViewScreen() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    getLocation();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          shipping_address,
          type,
          status,
          latitude,
          longitude
        `)
        .in('status', ['pending', 'processing'])
        .order('estimated_delivery', { ascending: true });

      if (fetchError) throw fetchError;

      if (!orders) {
        setStops([]);
        return;
      }

      const transformedStops: Stop[] = orders.map(order => ({
        id: order.id,
        orderId: order.order_number,
        customerName: order.customer_name,
        address: order.shipping_address,
        type: order.type as 'dropoff' | 'pickup',
        coordinates: {
          latitude: parseFloat(order.latitude || '52.3676'),
          longitude: parseFloat(order.longitude || '4.9041'),
        },
      }));

      setStops(transformedStops);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleNavigate = async () => {
    if (!selectedStop || !userLocation) return;

    if (Platform.OS === 'ios') {
      // iOS: Try Apple Maps first
      const appleMapsUrl = `maps://app?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
      const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);

      if (canOpenAppleMaps) {
        await Linking.openURL(appleMapsUrl);
      } else {
        // Try Google Maps as fallback
        const googleMapsUrl = `comgooglemaps://?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);

        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsUrl);
        } else {
          // If neither app is available, open in browser
          const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
          await Linking.openURL(webUrl);
        }
      }
    } else if (Platform.OS === 'android') {
      // Android
      const googleMapsUrl = `google.navigation:q=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
      const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);

      if (canOpenGoogleMaps) {
        await Linking.openURL(googleMapsUrl);
      } else {
        // Fallback to web URL
        const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
        await Linking.openURL(webUrl);
      }
    } else {
      // Web
      const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${selectedStop.coordinates.latitude},${selectedStop.coordinates.longitude}`;
      window.open(webUrl, '_blank');
    }
  };

  const handleStopPress = (stop: Stop) => {
    setSelectedStop(stop);
  };

  const handleBack = () => {
    router.back();
  };

  const handleOrderDetails = () => {
    if (selectedStop) {
      router.push({
        pathname: '/order-detail',
        params: { orderId: selectedStop.id },
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Web fallback UI
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Route Map</Text>
        </View>
        
        <View style={[styles.centerContent, { padding: 20 }]}>
          <MapPin size={48} color="#666" />
          <Text style={[styles.loadingText, { marginTop: 16, textAlign: 'center' }]}>
            The interactive map is not available in the web version.{'\n'}
            Please use the mobile app for full map functionality.
          </Text>
          {selectedStop && (
            <TouchableOpacity 
              style={[styles.navigateButton, { marginTop: 24 }]} 
              onPress={handleNavigate}
            >
              <Navigation size={20} color="#fff" />
              <Text style={styles.navigateButtonText}>Open in Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.stopsList}>
          <Text style={styles.stopsTitle}>Delivery Stops</Text>
          {stops.map((stop) => (
            <TouchableOpacity
              key={stop.id}
              style={[
                styles.stopItem,
                selectedStop?.id === stop.id && styles.selectedStop
              ]}
              onPress={() => handleStopPress(stop)}
            >
              <View style={styles.stopHeader}>
                <View style={styles.stopType}>
                  <Text style={styles.stopTypeText}>
                    {stop.type === 'dropoff' ? 'Drop-off' : 'Pick-up'}
                  </Text>
                </View>
                <Text style={styles.stopId}>{stop.orderId}</Text>
              </View>
              <Text style={styles.stopName}>{stop.customerName}</Text>
              <Text style={styles.stopAddress}>{stop.address}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  const initialRegion = stops.length > 0 ? {
    latitude: stops[0].coordinates.latitude,
    longitude: stops[0].coordinates.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : {
    latitude: 52.3676,
    longitude: 4.9041,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      <View style={styles.map}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton
        >
          {stops.map((stop) => (
            <Marker
              key={stop.id}
              coordinate={stop.coordinates}
              onPress={() => handleStopPress(stop)}
              pinColor={stop.type === 'dropoff' ? '#007AFF' : '#FF9500'}
            />
          ))}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              pinColor="#4CAF50"
            />
          )}
        </MapView>
      </View>

      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <ArrowLeft size={24} color="#1a1a1a" />
      </TouchableOpacity>

      {selectedStop && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <View
              style={[
                styles.typeIndicator,
                {
                  backgroundColor:
                    selectedStop.type === 'dropoff' ? '#007AFF' : '#FF9500',
                },
              ]}
            >
              <Text style={styles.typeText}>
                {selectedStop.type === 'dropoff' ? 'Drop-off' : 'Pick-up'}
              </Text>
            </View>
            <Text style={styles.orderId}>{selectedStop.orderId}</Text>
          </View>

          <Text style={styles.customerName}>{selectedStop.customerName}</Text>
          <Text style={styles.address}>{selectedStop.address}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={handleOrderDetails}
            >
              <Package size={20} color="#007AFF" />
              <Text style={styles.detailsButtonText}>Order Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navigateButton}
              onPress={handleNavigate}
            >
              <Navigation size={20} color="#fff" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginLeft: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
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
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      }
    }),
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      }
    }),
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  typeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  customerName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  detailsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    gap: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  stopsList: {
    flex: 1,
    padding: 20,
  },
  stopsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  stopItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  selectedStop: {
    borderColor: '#007AFF',
    backgroundColor: '#F5F9FF',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stopType: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stopTypeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  stopId: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  stopName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
});