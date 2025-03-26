import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Package, MapPin, ArrowRight, QrCode, Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';

type OrderType = 'dropoff' | 'pickup';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  shipping_address: string;
  estimated_delivery: string;
  status: string;
  type: OrderType;
}

interface DriverInfo {
  id: string;
  name: string;
}

export default function RouteOverviewScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadDriverInfo();
    return () => {
      // Cleanup subscriptions on unmount
      supabase.removeAllSubscriptions();
    };
  }, []);

  useEffect(() => {
    if (driverInfo?.id) {
      fetchDriverOrders(driverInfo.id);
      setupRealtimeSubscriptions(driverInfo.id);
    }
  }, [driverInfo, selectedDate]);

  const loadDriverInfo = async () => {
    try {
      const driverInfoStr = await storage.getItem('driverInfo');
      if (!driverInfoStr) {
        router.replace('/login');
        return;
      }
      const driver = JSON.parse(driverInfoStr);
      setDriverInfo(driver);
    } catch (err) {
      console.error('Error loading driver info:', err);
      setError('Failed to load driver information');
    }
  };

  const setupRealtimeSubscriptions = (driverId: string) => {
    // Subscribe to package changes
    const packageSubscription = supabase
      .channel('package-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_packages',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          // Refresh orders when package changes
          fetchDriverOrders(driverId);
        }
      )
      .subscribe();

    // Subscribe to package order changes
    const orderSubscription = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'package_orders',
        },
        () => {
          // Refresh orders when package orders change
          fetchDriverOrders(driverId);
        }
      )
      .subscribe();

    // Subscribe to order status changes
    const statusSubscription = supabase
      .channel('status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // Refresh orders when order status changes
          fetchDriverOrders(driverId);
        }
      )
      .subscribe();

    return () => {
      packageSubscription.unsubscribe();
      orderSubscription.unsubscribe();
      statusSubscription.unsubscribe();
    };
  };

  const fetchDriverOrders = async (driverId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Format date for query
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      // First get all packages for the driver for this date
      const { data: packages, error: packagesError } = await supabase
        .from('driver_packages')
        .select('id')
        .eq('driver_id', driverId)
        .eq('package_date', startOfDay.toISOString().split('T')[0]);

      if (packagesError) {
        throw packagesError;
      }

      if (!packages || packages.length === 0) {
        setOrders([]);
        return;
      }

      const packageIds = packages.map(pkg => pkg.id);

      // Then get all orders for these packages
      const { data: packageOrders, error: ordersError } = await supabase
        .from('package_orders')
        .select(`
          order:orders (
            id,
            order_number,
            customer_name,
            shipping_address,
            estimated_delivery,
            status,
            type
          )
        `)
        .in('package_id', packageIds)
        .order('sequence_number', { ascending: true });

      if (ordersError) throw ordersError;

      const orders = packageOrders
        .map(po => po.order)
        .filter((order): order is Order => order !== null);

      setOrders(orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    if (isToday) {
      return {
        main: 'Today',
        sub: monthDay,
        isToday
      };
    } else if (isTomorrow) {
      return {
        main: 'Tomorrow',
        sub: monthDay,
        isToday: false
      };
    } else {
      return {
        main: dayName,
        sub: monthDay,
        isToday: false
      };
    }
  };

  const handleScanPress = () => {
    router.push('/qr-scan');
  };

  const handleStartRoute = () => {
    if (unscannedDropoffs.length > 0) {
      return;
    }
    router.push('/map-view');
  };

  const dropoffs = orders.filter(order => order.type === 'dropoff');
  const pickups = orders.filter(order => order.type === 'pickup');
  const unscannedDropoffs = dropoffs.filter(order => order.status === 'pending');

  const formatTimeSlot = (datetime: string) => {
    const date = new Date(datetime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push({ pathname: '/order-detail', params: { orderId: item.id } })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Package size={20} color="#007AFF" />
          <Text style={styles.orderId}>{item.order_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.customerName}>{item.customer_name}</Text>
        <View style={styles.addressContainer}>
          <MapPin size={16} color="#666" style={styles.addressIcon} />
          <Text style={styles.address}>{item.shipping_address}</Text>
        </View>
        <Text style={styles.timeSlot}>{formatTimeSlot(item.estimated_delivery)}</Text>
      </View>

      <View style={styles.viewButton}>
        <Text style={styles.viewButtonText}>View Details</Text>
        <ArrowRight size={16} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Route Overview</Text>
        </View>
        <View style={[styles.content, styles.centerContent]}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Route Overview</Text>
        </View>
        <View style={[styles.content, styles.centerContent]}>
          <Text style={styles.errorText}>{error}</Text>
          {driverInfo && (
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => fetchDriverOrders(driverInfo.id)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  const dateInfo = formatDate(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Overview</Text>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
          <QrCode size={20} color="#fff" />
          <Text style={styles.scanButtonText}>Scan Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => handleDateChange(-1)}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <View style={[styles.dateContainer, dateInfo.isToday && styles.todayContainer]}>
          <Calendar size={20} color={dateInfo.isToday ? '#007AFF' : '#666'} />
          <View style={styles.dateTextContainer}>
            <Text style={[styles.dateMainText, dateInfo.isToday && styles.todayText]}>
              {dateInfo.main}
            </Text>
            <Text style={styles.dateSubText}>{dateInfo.sub}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => handleDateChange(1)}
        >
          <ChevronRight size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Drop-offs ({dropoffs.length})</Text>
          <FlatList
            data={dropoffs}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No drop-off orders available</Text>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick-ups ({pickups.length})</Text>
          <FlatList
            data={pickups}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <Text style={styles.emptyText}>No pick-up orders available</Text>
            )}
          />
        </View>
      </View>

      {selectedDate.toDateString() === new Date().toDateString() && (
        <TouchableOpacity
          style={[
            styles.startRouteButton,
            unscannedDropoffs.length > 0 && styles.startRouteButtonDisabled,
          ]}
          onPress={handleStartRoute}
          disabled={unscannedDropoffs.length > 0}
        >
          <MapPin size={20} color="#fff" />
          <Text style={styles.startRouteButtonText}>
            {unscannedDropoffs.length > 0
              ? `Scan ${unscannedDropoffs.length} More Orders`
              : 'Start Route'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStatusColor = (status: string) => {
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

const formatStatus = (status: string) => {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  dateButton: {
    padding: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 200,
    justifyContent: 'center',
  },
  todayContainer: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dateTextContainer: {
    alignItems: 'center',
  },
  dateMainText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  todayText: {
    color: '#007AFF',
  },
  dateSubText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginTop: 2,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  orderDetails: {
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressIcon: {
    marginRight: 4,
  },
  address: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    flex: 1,
  },
  timeSlot: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  startRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    gap: 8,
  },
  startRouteButtonDisabled: {
    backgroundColor: '#999',
  },
  startRouteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingText: {
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
});