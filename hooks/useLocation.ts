import * as Location from "expo-location";
import { useState } from "react";
import { Alert } from "react-native";
import { LocationData } from "../types/database.types";
import { usePermissions } from "./usePermissions";

export function useLocation() {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { requestLocationPermission } = usePermissions();

  const getCurrentLocation = async (): Promise<LocationData | null> => {
    setLoadingLocation(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          "Izin Lokasi Ditolak",
          "Aktifkan izin lokasi di pengaturan untuk menggunakan fitur ini."
        );
        setLoadingLocation(false);
        return null;
      }

      // 🔍 Tambahan penting: cek apakah GPS / Location Service aktif
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        Alert.alert(
          "GPS Tidak Aktif",
          "Silakan aktifkan GPS / Lokasi di perangkat Anda."
        );
        setLoadingLocation(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      let addressText = "Alamat tidak ditemukan";
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address && address.length > 0) {
          const a = address[0];
          addressText = `${a.street || ""} ${a.name || ""}, ${
            a.city || ""
          }`.trim();
        }
      } catch (geocodeError) {
        console.log("Reverse geocode gagal:", geocodeError);
      }

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: addressText,
      };

      setCurrentLocation(locationData);
      return locationData;
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Gagal Mengambil Lokasi",
        "Pastikan GPS aktif dan coba lagi."
      );
      return null;
    } finally {
      setLoadingLocation(false);
    }
  };

  const clearLocation = () => {
    setCurrentLocation(null);
  };

  return {
    currentLocation,
    loadingLocation,
    getCurrentLocation,
    clearLocation,
  };
}
