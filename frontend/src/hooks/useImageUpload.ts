/**
 * Custom hook for image upload and camera functionality
 * Eliminates duplicate image handling logic across components
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseImageUploadReturn {
  selectedImage: string | null;
  showCamera: boolean;
  cameraStream: MediaStream | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  startCamera: () => Promise<void>;
  capturePhoto: () => void;
  stopCamera: () => void;
  resetImage: () => void;
  convertDataURLToFile: (dataUrl: string, filename: string) => File;
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.group('📁 File Upload');
    
    const file = event.target.files?.[0];
    if (!file) {
      console.log('❌ No file selected');
      console.groupEnd();
      return;
    }

    console.log('File Details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      toast({
        title: "Invalid File Type",
        description: "Please select a JPEG, PNG, or WebP image.",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size, 'bytes');
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      });
      console.groupEnd();
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      console.log('✅ File loaded successfully');
      console.groupEnd();
    };
    
    reader.onerror = (error) => {
      console.error('❌ File read error:', error);
      toast({
        title: "File Read Error",
        description: "Failed to read the selected file.",
        variant: "destructive",
      });
      console.groupEnd();
    };
    
    reader.readAsDataURL(file);
  }, []);

  const startCamera = useCallback(async () => {
    console.group('📹 Camera Access');
    
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back camera on mobile
        } 
      });
      
      console.log('✅ Camera access granted');
      console.log('Stream details:', {
        active: stream.active,
        tracks: stream.getVideoTracks().length
      });
      
      setCameraStream(stream);
      setShowCamera(true);
      
      // Set video source when camera opens
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      console.groupEnd();
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      
      let errorMessage = "Unable to access camera. Please check permissions.";
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera access denied. Please allow camera permissions and try again.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found. Please connect a camera or use file upload.";
        } else if (error.name === 'NotSupportedError') {
          errorMessage = "Camera not supported in this browser. Please use file upload.";
        }
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      console.groupEnd();
    }
  }, []);

  const capturePhoto = useCallback(() => {
    console.group('📸 Photo Capture');
    
    if (!videoRef.current) {
      console.error('❌ Video ref not available');
      toast({
        title: "Capture Error",
        description: "Camera not ready. Please try again.",
        variant: "destructive"
      });
      console.groupEnd();
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      });
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9); // High quality
      
      setSelectedImage(imageData);
      setShowCamera(false);
      
      console.log('✅ Photo captured successfully');
      console.log('Image size:', imageData.length, 'characters');
      
    } catch (error) {
      console.error('❌ Photo capture failed:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive"
      });
    }
    
    console.groupEnd();
  }, []);

  const stopCamera = useCallback(() => {
    console.log('🛑 Stopping camera...');
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      setCameraStream(null);
    }
    setShowCamera(false);
    
    console.log('✅ Camera stopped');
  }, [cameraStream]);

  const resetImage = useCallback(() => {
    console.log('🔄 Resetting image state...');
    
    setSelectedImage(null);
    setShowCamera(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    stopCamera();
    
    console.log('✅ Image state reset');
  }, [stopCamera]);

  const convertDataURLToFile = useCallback((dataUrl: string, filename: string): File => {
    console.group('🔄 Converting Data URL to File');
    
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) throw new Error('Invalid data URL format');
      
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      
      const file = new File([u8arr], filename, { type: mime });
      
      console.log('✅ Conversion successful:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      console.groupEnd();
      
      return file;
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      console.groupEnd();
      throw new Error('Failed to process image data');
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Auto-set video source when camera stream changes
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  return {
    selectedImage,
    showCamera,
    cameraStream,
    fileInputRef,
    videoRef,
    handleFileUpload,
    startCamera,
    capturePhoto,
    stopCamera,
    resetImage,
    convertDataURLToFile,
  };
};

export default useImageUpload;