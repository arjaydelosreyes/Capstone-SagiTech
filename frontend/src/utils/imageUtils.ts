/**
 * Enhanced Image Utilities with WebP Support
 * Handles image format conversion and validation
 */

export const convertWebPToJPEG = async (webpFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    console.group('🔄 Converting WebP to JPEG');
    console.log('Input file:', {
      name: webpFile.name,
      size: webpFile.size,
      type: webpFile.type
    });

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to JPEG blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert WebP to JPEG'));
              return;
            }
            
            const jpegFile = new File(
              [blob], 
              webpFile.name.replace(/\.webp$/i, '.jpg'),
              { type: 'image/jpeg' }
            );
            
            console.log('✅ Conversion successful:', {
              originalSize: webpFile.size,
              newSize: jpegFile.size,
              originalType: webpFile.type,
              newType: jpegFile.type
            });
            console.groupEnd();
            
            resolve(jpegFile);
          }, 'image/jpeg', 0.9); // High quality JPEG
          
        } catch (error) {
          console.error('❌ Canvas processing failed:', error);
          console.groupEnd();
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('❌ Image load failed:', error);
        console.groupEnd();
        reject(new Error('Failed to load WebP image for conversion'));
      };

      // Load the WebP file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        console.error('❌ FileReader failed');
        console.groupEnd();
        reject(new Error('Failed to read WebP file'));
      };
      
      reader.readAsDataURL(webpFile);
      
    } catch (error) {
      console.error('❌ Conversion setup failed:', error);
      console.groupEnd();
      reject(error);
    }
  });
};

export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  console.group('🔍 Validating Image File');
  console.log('File details:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    console.error('❌ File too large:', file.size, 'bytes');
    console.groupEnd();
    return {
      isValid: false,
      error: `File is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 10MB.`
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    console.error('❌ Invalid file type:', file.type);
    console.groupEnd();
    return {
      isValid: false,
      error: `Invalid file format (${file.type}). Please use JPEG, PNG, or WebP.`
    };
  }

  // Additional WebP validation
  if (file.type === 'image/webp') {
    // Check if browser supports WebP
    const canvas = document.createElement('canvas');
    const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (!webpSupported) {
      console.warn('⚠️ WebP not fully supported by browser');
      console.groupEnd();
      return {
        isValid: false,
        error: 'WebP format not fully supported. Please convert to JPEG or PNG.'
      };
    }
    
    console.log('✅ WebP format validated');
  }

  console.log('✅ File validation passed');
  console.groupEnd();
  
  return { isValid: true };
};

export const optimizeImageFile = async (file: File): Promise<File> => {
  console.group('⚡ Optimizing Image File');
  
  try {
    // If it's WebP and causing issues, convert to JPEG
    if (file.type === 'image/webp') {
      console.log('🔄 Converting WebP to JPEG for better compatibility...');
      const jpegFile = await convertWebPToJPEG(file);
      console.groupEnd();
      return jpegFile;
    }
    
    // For other formats, return as-is for now
    console.log('✅ No optimization needed');
    console.groupEnd();
    return file;
    
  } catch (error) {
    console.error('❌ Optimization failed:', error);
    console.log('🔄 Returning original file');
    console.groupEnd();
    return file;
  }
};

export default {
  convertWebPToJPEG,
  validateImageFile,
  optimizeImageFile
};