import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";
import { usePermissions } from "./usePermissions";

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export function useImagePicker() {
  const [selectedImage, setSelectedImage] = useState<PickedImage | null>(null);
  const { requestCameraPermission } = usePermissions();

  const pickImage = async (fromCamera: boolean = false) => {
    try {
      if (fromCamera) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;
      }

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
        const fileName =
          asset.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
        const fileType = `image/${fileName.split(".").pop()}`;

        setSelectedImage({
          uri: asset.uri,
          name: fileName,
          type: fileType,
        });

        return true;
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Gagal memilih gambar");
    }

    return false;
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  return {
    selectedImage,
    pickImage,
    clearImage,
  };
}
