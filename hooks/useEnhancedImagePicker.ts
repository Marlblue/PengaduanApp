import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";
import { usePermissions } from "./usePermissions";

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export function useEnhancedImagePicker() {
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const [compressing, setCompressing] = useState(false);
  const { requestCameraPermission } = usePermissions();

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const compressedImage = await manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } }, // Resize max width 1200px
        ],
        {
          compress: 0.7, // 70% quality
          format: SaveFormat.JPEG,
        }
      );

      return compressedImage.uri;
    } catch (error) {
      console.error("Error compressing image:", error);
      return uri; // Return original if compression fails
    }
  };

  const pickImage = async (fromCamera: boolean = false): Promise<boolean> => {
    try {
      if (fromCamera) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return false;
      }

      setCompressing(true);

      const result = await (fromCamera
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          }));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Compress image
        const compressedUri = await compressImage(asset.uri);

        const fileName = `photo_${Date.now()}.jpg`;
        const fileType = "image/jpeg";

        // Get file size
        const response = await fetch(compressedUri);
        const blob = await response.blob();

        setSelectedImage({
          uri: compressedUri,
          name: fileName,
          type: fileType,
          size: blob.size,
        });

        return true;
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Gagal memilih gambar");
    } finally {
      setCompressing(false);
    }

    return false;
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  return {
    selectedImage,
    compressing,
    pickImage,
    clearImage,
  };
}
