import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView, ActivityIndicator, Image, BackHandler } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Camera, CircleCheck as CheckCircle, Upload, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';

interface DeliveryPhoto {
  uri: string;
  type: string;
  name: string;
}

export default function ProofOfDeliveryScreen() {
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const photoUri = params.photoUri as string;

  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  // Check order status on mount
  useEffect(() => {
    checkOrderStatus();
  }, [orderId]);

  const checkOrderStatus = async () => {
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      setOrderStatus(order.status);

      if (order.status === 'delivered') {
        setError('This order has already been marked as delivered');
      }
    } catch (err) {
      console.error('Error checking order status:', err);
      setError('Failed to check order status');
    }
  };

  // Handle new photo from camera
  useEffect(() => {
    if (photoUri) {
      const newPhoto = {
        uri: photoUri,
        type: 'image/jpeg',
        name: `photo-${Date.now()}.jpg`,
      };
      setPhotos(prev => [...prev, newPhoto]);
    }
  }, [photoUri]);

  const handleTakePhoto = () => {
    if (loading || orderStatus === 'delivered') return;
    router.push({
      pathname: '/take-photo',
      params: { orderId }
    });
  };

  const handleSelectPhoto = async () => {
    if (loading || orderStatus === 'delivered') return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('Media library permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 4 - photos.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
        }));
        setPhotos(prev => [...prev, ...newPhotos]);
        setError(null);
      }
    } catch (err) {
      console.error('Error selecting photos:', err);
      setError('Failed to select photos. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (loading || orderStatus === 'delivered') return;
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    setUploadProgress(0);

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        // Read file as base64 first
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to blob
        const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();

        // Generate unique filename
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const path = `delivery-photos/${orderId}/${filename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('delivery-photos')
          .upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(path);

        uploadedUrls.push(publicUrl);
        setUploadProgress((i + 1) / photos.length * 100);
      } catch (err) {
        console.error('Error uploading photo:', err);
        throw new Error(`Failed to upload photo ${i + 1}: ${err.message}`);
      }
    }

    return uploadedUrls;
  };

  const handleSubmit = async () => {
    try {
      if (orderStatus === 'delivered') {
        setError('This order has already been marked as delivered');
        return;
      }

      setLoading(true);
      setError(null);
      setUploadProgress(0);

      if (!signature.trim()) {
        setError('Please provide a signature name');
        setLoading(false);
        return;
      }

      if (photos.length === 0) {
        setError('Please add at least one delivery photo');
        setLoading(false);
        return;
      }

      // Upload photos first
      const photoUrls = await uploadPhotos();

      // Update order status and create log in a single transaction
      const { error: updateError } = await supabase.rpc('complete_delivery', {
        p_order_id: orderId,
        p_signature: signature,
        p_notes: notes,
        p_photos: photoUrls
      });

      if (updateError) throw updateError;

      // Navigate back to route overview
      router.replace('/route-overview');
    } catch (err) {
      console.error('Error completing delivery:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete delivery. Please try again.');
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleBack = () => {
    if (loading) return;
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Proof of Delivery</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Photos</Text>
          
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                  disabled={loading || orderStatus === 'delivered'}
                >
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < 4 && orderStatus !== 'delivered' && (
              <>
                <TouchableOpacity 
                  style={[styles.photoButton, loading && styles.photoButtonDisabled]} 
                  onPress={handleTakePhoto}
                  disabled={loading}
                >
                  <Camera size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.photoButton, loading && styles.photoButtonDisabled]} 
                  onPress={handleSelectPhoto}
                  disabled={loading}
                >
                  <Upload size={24} color="#007AFF" />
                  <Text style={styles.photoButtonText}>Upload Photo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>Uploading photos: {Math.round(uploadProgress)}%</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signature</Text>
          <TextInput
            style={[styles.input, (loading || orderStatus === 'delivered') && styles.inputDisabled]}
            placeholder="Enter name of person who received the delivery"
            placeholderTextColor="#666"
            value={signature}
            onChangeText={setSignature}
            editable={!loading && orderStatus !== 'delivered'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, (loading || orderStatus === 'delivered') && styles.inputDisabled]}
            placeholder="Add any additional delivery notes"
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!loading && orderStatus !== 'delivered'}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton, 
            (loading || orderStatus === 'delivered') && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading || orderStatus === 'delivered'}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {orderStatus === 'delivered' ? 'Already Delivered' : 'Complete Delivery'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoButton: {
    width: '48%',
    aspectRatio: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderStyle: 'dashed',
    gap: 8,
  },
  photoButtonDisabled: {
    opacity: 0.5,
  },
  photoButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
    textAlign: 'center',
  },
  photoPreview: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e1e1',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#e1e1e1',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});