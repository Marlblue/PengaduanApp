import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

export function usePermissions() {
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    const locationStatus = await Location.getForegroundPermissionsAsync();

    setCameraPermission(cameraStatus.granted);
    setLocationPermission(locationStatus.granted);
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    const granted = status === "granted";
    setCameraPermission(granted);

    if (!granted) {
      Alert.alert(
        "Izin Kamera Diperlukan",
        "Aplikasi memerlukan akses kamera untuk mengambil foto pengaduan.",
        [
          { text: "Batal", style: "cancel" },
          { text: "Buka Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }

    return granted;
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setLocationPermission(granted);

    if (!granted) {
      Alert.alert(
        "Izin Lokasi Diperlukan",
        "Aplikasi memerlukan akses lokasi untuk melacak lokasi pengaduan.",
        [
          { text: "Batal", style: "cancel" },
          { text: "Buka Settings", onPress: () => Linking.openSettings() },
        ]
      );
    }

    return granted;
  };

  return {
    cameraPermission,
    locationPermission,
    requestCameraPermission,
    requestLocationPermission,
    checkPermissions,
  };
}
