import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Package, MapPin, Phone, Mail, MessageSquare, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Navigation } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  email: string;
  phone: string;
  shipping_address: string;
  estimated_delivery: string;
  status: string;
  special_instructions?: string;
  items: OrderItem[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId && typeof orderId === 'string') {
      fetchOrderDetails(orderId);
    }
  }, [orderId]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          email,
          phone,
          shipping_address,
          estimated_delivery,
          status,
          special_instructions,
          order_items (
            id,
            product_name,
            quantity
          )
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      const transformedOrder: Order = {
        ...orderData,
        items: orderData.order_items || [],
        coordinates: {
          latitude: 52.3676,
          longitude: 4.9041,
        },
      };

      setOrder(transformedOrder);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleNavigate = () => {
    if (!order) return;

    if (Platform.OS === 'web') {
      const url = `https://www.google.com/maps/search/?api=1&query=${order.coordinates.latitude},${order.coordinates.longitude}`;
      window.open(url, '_blank');
    } else {
      router.push({
        pathname: '/map-view',
        params: { orderId: order.id },
      });
    }
  };

  const handleCall = () => {
    if (Platform.OS === 'web' && order?.phone) {
      window.open(`tel:${order.phone}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (Platform.OS === 'web' && order?.email) {
      window.open(`mailto:${order.email}`, '_blank');
    }
  };

  const handleDelivered = () => {
    if (!order) return;

    // Navigate to proof of delivery screen
    router.push({
      pathname: '/proof-of-delivery',
      params: { orderId: order.id }
    });
  };

  const handleReportIssue = () => {
    // Implement issue reporting logic
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
        </View>
        <View style={[styles.content, styles.centerContent]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
        </View>
        <View style={[styles.content, styles.centerContent]}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => orderId && typeof orderId === 'string' && fetchOrderDetails(orderId)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatTimeSlot = (datetime: string) => {
    const date = new Date(datetime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Package size={24} color="#007AFF" />
            <Text style={styles.orderId}>{order.order_number}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{formatStatus(order.status)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <Text style={styles.customerName}>{order.customer_name}</Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
              <Phone size={20} color="#007AFF" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
              <Mail size={20} color="#007AFF" />
              <Text style={styles.contactButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleReportIssue}>
              <MessageSquare size={20} color="#007AFF" />
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.deliveryInfo}>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <Text style={styles.infoText}>{order.shipping_address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={20} color="#666" />
              <Text style={styles.infoText}>{formatTimeSlot(order.estimated_delivery)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate}>
            <Navigation size={20} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate to Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          ))}
        </View>

        {order.special_instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsText}>{order.special_instructions}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.issueButton} 
          onPress={handleReportIssue}
        >
          <AlertCircle size={20} color="#FF3B30" />
          <Text style={styles.issueButtonText}>Report Issue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.deliveredButton,
            order.status === 'delivered' && styles.deliveredButtonDisabled
          ]} 
          onPress={handleDelivered}
          disabled={order.status === 'delivered'}
        >
          <CheckCircle2 size={20} color="#fff" />
          <Text style={styles.deliveredButtonText}>
            {order.status === 'delivered' ? 'Delivered' : 'Complete Delivery'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#FFC107';
    case 'processing':
      return '#2196F3';
    case 'finished':
      return '#4CAF50';
    case 'shipped':
      return '#4CAF50';
    case 'delivered':
      return '#4CAF50';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#999';
  }
};

const formatStatus = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderId: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  deliveryInfo: {
    gap: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
  },
  itemQuantity: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  instructionsBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  instructionsText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  issueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  issueButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  deliveredButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    gap: 8,
  },
  deliveredButtonDisabled: {
    opacity: 0.7,
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});