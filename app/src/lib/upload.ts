import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export async function pickImage(source: 'library' | 'camera'): Promise<ImagePicker.ImagePickerAsset | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: source === 'library',
    aspect: source === 'library' ? [1, 1] : undefined,
  };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0] ?? null;
}

/** 画像を <userId>/<timestamp>.jpg としてアップロードし、保存パスを返す */
export async function uploadImage(bucket: 'avatars' | 'id-documents', userId: string, asset: ImagePicker.ImagePickerAsset) {
  const body = await (await fetch(asset.uri)).arrayBuffer();
  const ext = asset.mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
