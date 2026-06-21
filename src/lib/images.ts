/** Thin wrapper over expo-image-picker for attaching photos to notes. */

import * as ImagePicker from 'expo-image-picker';

export async function pickFromLibrary(): Promise<string | undefined> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  if (!res.canceled && res.assets.length > 0) return res.assets[0].uri;
  return undefined;
}

export async function takePhoto(): Promise<string | undefined> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return undefined;
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (!res.canceled && res.assets.length > 0) return res.assets[0].uri;
  return undefined;
}
