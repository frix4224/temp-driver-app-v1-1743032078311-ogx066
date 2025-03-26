import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: "Eazyy Driver",
  slug: "eazyy-driver",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "eazyy",
  userInterfaceStyle: "automatic",
  experiments: {
    typedRoutes: true,
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.eazyy.driver",
    config: {
      googleMapsApiKey: "AIzaSyACA7XEfHbsp5gXZ_Eup5eDNxuYojhQl6A"
    },
    infoPlist: {
      NSCameraUsageDescription: "Allow Eazyy Driver to access your camera to take delivery photos",
      NSPhotoLibraryUsageDescription: "Allow Eazyy Driver to access your photos to upload delivery proof",
      NSPhotoLibraryAddUsageDescription: "Allow Eazyy Driver to save delivery photos to your photo library"
    }
  },
  android: {
    package: "com.eazyy.driver",
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundColor: "#000000"
    },
    config: {
      googleMaps: {
        apiKey: "AIzaSyACA7XEfHbsp5gXZ_Eup5eDNxuYojhQl6A"
      }
    },
    permissions: [
      "android.permission.CAMERA",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.ACCESS_MEDIA_LOCATION"
    ]
  },
  plugins: [
    "expo-router",
    [
      "expo-camera",
      {
        cameraPermission: "Allow Eazyy Driver to access your camera to take delivery photos"
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow Eazyy Driver to access your photos to upload delivery proof",
        savePhotosPermission: "Allow Eazyy Driver to save photos to your photo library"
      }
    ],
    [
      "expo-media-library",
      {
        photosPermission: "Allow Eazyy Driver to access your photos",
        savePhotosPermission: "Allow Eazyy Driver to save photos to your photo library",
        isAccessMediaLocationEnabled: true
      }
    ]
  ]
};

export default config;