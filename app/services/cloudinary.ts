// Cloudinary service for image uploads
import * as ImagePicker from 'expo-image-picker';

const CLOUDINARY_CONFIG = {
  cloud_name: 'AntojosGo',
  api_key: '444269592214698',
  api_secret: 'vJMGQgaCuT_2kWpIpxieH8EtvTA',
  upload_preset: 'antojosgo_upload' // We'll need to create this preset in Cloudinary console
};

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const cloudinaryService = {
  /**
   * Upload an image to Cloudinary
   * @param imageUri - Local image URI (from ImagePicker or camera)
   * @param folder - Optional folder name in Cloudinary
   * @returns Promise with upload result
   */
  async uploadImage(imageUri: string, folder?: string): Promise<CloudinaryUploadResult> {
    try {
      // Create form data for upload
      const formData = new FormData();
      
      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      formData.append('file', blob as any);
      formData.append('upload_preset', CLOUDINARY_CONFIG.upload_preset);
      
      if (folder) {
        formData.append('folder', folder);
      }
      
      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/upload`;
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const uploadResult = await uploadResponse.json();
      
      if (uploadResponse.ok && uploadResult.secure_url) {
        return {
          success: true,
          url: uploadResult.secure_url
        };
      } else {
        return {
          success: false,
          error: uploadResult.error?.message || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Pick image from device gallery and upload to Cloudinary
   * @param folder - Optional folder name in Cloudinary
   * @returns Promise with upload result
   */
  async pickAndUploadImage(folder?: string): Promise<CloudinaryUploadResult> {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access media library is required'
        };
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // Good for restaurant/food images
        quality: 0.8,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Image selection canceled'
        };
      }

      // Upload the selected image
      return await this.uploadImage(result.assets[0].uri, folder);
    } catch (error) {
      console.error('Pick and upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Take photo with camera and upload to Cloudinary
   * @param folder - Optional folder name in Cloudinary
   * @returns Promise with upload result
   */
  async takePictureAndUpload(folder?: string): Promise<CloudinaryUploadResult> {
    try {
      // Request permission to access camera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Permission to access camera is required'
        };
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled) {
        return {
          success: false,
          error: 'Photo capture canceled'
        };
      }

      // Upload the captured image
      return await this.uploadImage(result.assets[0].uri, folder);
    } catch (error) {
      console.error('Take picture and upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Generate optimized Cloudinary URL with transformations
   * @param publicId - Cloudinary public ID
   * @param width - Image width
   * @param height - Image height
   * @param quality - Image quality (auto, 80, etc.)
   * @returns Optimized image URL
   */
  getOptimizedUrl(publicId: string, width?: number, height?: number, quality: string = 'auto'): string {
    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload`;
    const transformations = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    transformations.push(`q_${quality}`, 'f_auto');
    
    const transformationString = transformations.join(',');
    
    return `${baseUrl}/${transformationString}/${publicId}`;
  }
};