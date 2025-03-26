import { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Camera as CameraIcon, X, QrCode } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

interface QRCodeData {
  order_number: string;
  customer_name: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

export default function QRScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedOrders, setScannedOrders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    try {
      if (scanned) return; // Prevent multiple scans
      setScanned(true);
      setError(null);
      
      // Parse the QR code data
      let qrData: QRCodeData;
      try {
        qrData = JSON.parse(data);
      } catch (err) {
        throw new Error('Invalid QR code format. Please scan a valid order QR code.');
      }

      // Validate QR code data structure
      if (!qrData.order_number) {
        throw new Error('Invalid QR code. Missing order number.');
      }

      // Check if order exists in database
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          qr_code
        `)
        .eq('order_number', qrData.order_number)
        .single();

      if (fetchError) {
        throw new Error('Failed to verify order');
      }

      if (!order) {
        throw new Error('Order not found');
      }

      // Verify QR code matches the one in database
      const storedQRData = JSON.parse(order.qr_code || '{}');
      if (storedQRData.order_number !== qrData.order_number) {
        throw new Error('Invalid QR code. Please scan the correct order QR code.');
      }

      // Check if order is already processed
      if (order.status !== 'pending') {
        throw new Error(`Order is already ${order.status}`);
      }

      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'processing' })
        .eq('id', order.id);

      if (updateError) {
        throw new Error('Failed to update order status');
      }

      // Add to scanned orders list
      setScannedOrders(prev => [...prev, order.order_number]);
      
      // Navigate to order details
      router.push({
        pathname: '/order-detail',
        params: { orderId: order.id }
      });
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to process QR code');
      setScanned(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        <View style={styles.webCamera}>
          <CameraIcon size={48} color="#666" />
          <Text style={styles.webCameraText}>
            QR code scanning is not available in the web preview.
          </Text>
          <Text style={styles.webCameraSubtext}>
            Please use the mobile app to scan QR codes.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.scannedTitle}>
            Scanned Orders ({scannedOrders.length})
          </Text>
          {scannedOrders.map((orderId, index) => (
            <Text key={index} style={styles.scannedOrder}>
              ✓ {orderId}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.message}>Checking camera permissions...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <QrCode size={48} color="#666" />
          <Text style={styles.message}>We need your permission to use the camera</Text>
          <TouchableOpacity 
            style={styles.button}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>Scan QR Code</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.footer}>
        <Text style={styles.scannedTitle}>
          Scanned Orders ({scannedOrders.length})
        </Text>
        {scannedOrders.map((orderId, index) => (
          <Text key={index} style={styles.scannedOrder}>
            ✓ {orderId}
          </Text>
        ))}
        {scanned && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setScanned(false)}
          >
            <Text style={styles.buttonText}>Scan Another</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    padding: 16,
    borderRadius: 12,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
    gap: 16,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  webCamera: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  webCameraText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    maxWidth: '80%',
  },
  webCameraSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scannedTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  scannedOrder: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4CAF50',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});