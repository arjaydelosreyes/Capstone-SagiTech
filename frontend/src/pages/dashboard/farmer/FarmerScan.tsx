import { useNavigate } from "react-router-dom";
import { Camera, Upload, RotateCcw, Check, X, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { getRipenessBadgeClass } from "@/utils/analyzeBanana";
import { toast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import useImageUpload from "@/hooks/useImageUpload";
import usePrediction from "@/hooks/usePrediction";
import ErrorBoundary from "@/components/ErrorBoundary";
import { apiService } from "@/services/ApiService";
import { validateImageFile, optimizeImageFile } from "@/utils/imageUtils";

const FarmerScanContent = () => {
  const navigate = useNavigate();
  
  // Use custom hooks to eliminate duplicate code
  const { user, isLoading: authLoading } = useAuth({ requiredRole: 'farmer' });
  
  const {
    selectedImage,
    showCamera,
    fileInputRef,
    videoRef,
    handleFileUpload,
    startCamera,
    capturePhoto,
    stopCamera,
    resetImage,
    convertDataURLToFile
  } = useImageUpload();

  const {
    result,
    isAnalyzing,
    error: predictionError,
    hasError,
    analyze,
    reset: resetPrediction,
    clearError
  } = usePrediction({
    onSuccess: (result) => {
      console.log('🎉 Prediction successful:', result);
    },
    onError: (error) => {
      console.error('🔴 Prediction failed:', error);
    }
  });

  const analyzeImage = async () => {
    if (!selectedImage || !user) return;

    console.group('🍌 COMPLETELY FIXED FarmerScan.analyzeImage');
    console.log('🚀 BYPASSING ALL OLD SERVICES - DIRECT API CALL');
    console.log('🎯 Target endpoint: /api/predict/ (NEW ARCHITECTURE)');
    console.log('User:', user.username);
    console.log('Image preview:', selectedImage.substring(0, 50) + '...');
    console.log('Timestamp:', new Date().toISOString());

    try {
      // Convert data URL to File with enhanced WebP support
      let filename = `scan_${Date.now()}`;
      let detectedMime = 'image/jpeg'; // default
      
      // Enhanced format detection
      if (selectedImage.includes('data:image/webp') || selectedImage.includes('webp')) {
        filename += '.webp';
        detectedMime = 'image/webp';
        console.log('🖼️ WebP format detected - ensuring proper handling');
      } else if (selectedImage.includes('data:image/png')) {
        filename += '.png';
        detectedMime = 'image/png';
        console.log('🖼️ PNG format detected');
      } else {
        filename += '.jpg';
        detectedMime = 'image/jpeg';
        console.log('🖼️ JPEG format (default)');
      }
      
      const file = convertDataURLToFile(selectedImage, filename);
      
      // Validate the file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid image file');
      }
      
      // Optimize the file (handles WebP conversion if needed)
      const optimizedFile = await optimizeImageFile(file);
      
      console.log('📁 File prepared and optimized:', {
        originalName: file.name,
        optimizedName: optimizedFile.name,
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
        originalType: file.type,
        optimizedType: optimizedFile.type,
        wasConverted: file.type !== optimizedFile.type
      });

      // COMPLETELY BYPASS OLD SERVICES - DIRECT API CALL
      console.log('🚀 Making DIRECT API call to /api/predict/');
      console.log('🎯 Using optimized file for better compatibility');
      
      const prediction = await apiService.predict(optimizedFile, 'standard');
      
      // Convert to ScanResult format
      const analysisResult = {
        id: prediction.id.toString(),
        userId: user.id,
        timestamp: new Date(prediction.processed_at),
        image: prediction.image_url,
        ripeness: convertRipenessFromDistribution(prediction.ripeness_distribution),
        bananaCount: prediction.total_count,
        confidence: prediction.confidence,
        ripenessResults: prediction.bounding_boxes.map(box => ({
          ripeness: box.ripeness,
          confidence: box.confidence,
          bbox: box.bbox
        })),
        ripenessDistribution: prediction.ripeness_distribution,
        processingMetadata: prediction.processing_metadata
      };

      // Update state directly
      setResult(analysisResult);
      
      console.log('✅ DIRECT API CALL SUCCESS:', {
        totalBananas: analysisResult.bananaCount,
        confidence: analysisResult.confidence,
        ripeness: analysisResult.ripeness,
        processingTime: prediction.processing_metadata.processing_time + 's'
      });

      toast({
        title: "Analysis Complete! 🎉",
        description: `Found ${analysisResult.bananaCount} banana(s) with ${analysisResult.confidence}% confidence. Results saved automatically!`,
        variant: "default",
      });

      console.groupEnd();
      
    } catch (error) {
      console.groupEnd();
      console.error('🔴 DIRECT API CALL FAILED:', error);
      
      // Enhanced error handling
      let errorMessage = "Failed to analyze the image. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('format') || error.message.includes('WebP') || error.message.includes('webp')) {
          errorMessage = "WebP format detected but there was an issue. Please try converting to JPEG or PNG format, or ensure the WebP file is valid.";
        } else if (error.message.includes('size') || error.message.includes('large')) {
          errorMessage = "Image is too large. Please use an image under 10MB.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = "Session expired. Please log in again.";
        }
      }
      
      toast({
        title: "Image Analysis Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Helper function to convert ripeness distribution to dominant ripeness
  const convertRipenessFromDistribution = (distribution: Record<string, number>) => {
    const ripenessMap = {
      'not_mature': 'Not Mature',
      'mature': 'Mature', 
      'ripe': 'Ripe',
      'over_ripe': 'Over Ripe'
    };

    let maxCount = 0;
    let dominantRipeness = 'Mature';

    for (const [stage, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantRipeness = ripenessMap[stage] || 'Mature';
      }
    }

    return dominantRipeness;
  };

  const resetScan = () => {
    resetImage();
    resetPrediction();
    clearError();
  };

  if (!user) return null;

  return (
    <AppLayout title="Banana Scanner" user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">AI Banana Scanner 🍌</h1>
          <p className="text-muted-foreground">
            Upload an image or use your camera to analyze banana ripeness and count
          </p>
        </div>

        {/* Camera View */}
        {showCamera && (
          <GlassCard className="text-center">
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-lg mx-auto rounded-lg"
              />
              <div className="flex gap-4 justify-center">
                <GlassButton onClick={capturePhoto} variant="primary">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </GlassButton>
                <GlassButton onClick={() => setShowCamera(false)} variant="glass">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Upload Section */}
        {!selectedImage && !showCamera && (
          <GlassCard className="text-center py-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Choose Your Method</h3>
                <p className="text-muted-foreground">
                  Select how you'd like to capture your banana images
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <GlassButton
                  onClick={startCamera}
                  variant="primary"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Camera className="h-5 w-5" />
                  Use Camera
                </GlassButton>
                
                <GlassButton
                  onClick={() => fileInputRef.current?.click()}
                  variant="glass"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  Upload Image
                </GlassButton>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </GlassCard>
        )}

        {/* Image Preview & Analysis */}
        {selectedImage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Preview */}
            <GlassCard>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Image Preview</h3>
                <div className="aspect-square bg-muted/50 rounded-lg overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="Selected banana"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <GlassButton
                    onClick={analyzeImage}
                    variant="primary"
                    className="flex-1"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Analyze Image
                      </>
                    )}
                  </GlassButton>
                  <GlassButton onClick={resetScan} variant="glass">
                    <RotateCcw className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            </GlassCard>

            {/* Results */}
            <GlassCard>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Analysis Results</h3>
                
                {isAnalyzing && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                    <p className="text-muted-foreground">AI is analyzing your bananas...</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {/* Ripeness */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Ripeness Level</label>
                      <span className={`inline-block px-4 py-2 rounded-lg font-medium border ${getRipenessBadgeClass(result.ripeness)}`}>
                        {result.ripeness}
                      </span>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Confidence</label>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{result.confidence}%</span>
                          <span className="text-muted-foreground">Accuracy</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${result.confidence}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banana Count */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Banana Count</label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">{result.bananaCount}</span>
                        <span className="text-muted-foreground">banana{result.bananaCount !== 1 ? 's' : ''} detected</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="pt-4 border-t border-glass-border">
                      <p className="text-sm text-muted-foreground">
                        Scanned on {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <GlassButton
                        onClick={() => navigate("/dashboard/farmer/history")}
                        variant="glass"
                        size="sm"
                        className="flex-1"
                      >
                        View History
                      </GlassButton>
                      <GlassButton
                        onClick={resetScan}
                        variant="primary"
                        size="sm"
                        className="flex-1"
                      >
                        Scan Another
                      </GlassButton>
                    </div>
                  </div>
                )}

                {!result && !isAnalyzing && (
                  <div className="text-center py-8 text-muted-foreground">
                    Click "Analyze Image" to start the AI analysis
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Instructions */}
        <GlassCard className="bg-primary-glass border-primary/30">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Tips for Best Results</h4>
            <ul className="space-y-1 text-sm text-foreground">
              <li>• Ensure good lighting for clear banana visibility</li>
              <li>• Position bananas in the center of the frame</li>
              <li>• Avoid shadows or reflections on the bananas</li>
              <li>• Multiple bananas in one image are supported</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

// Export with Error Boundary wrapper
export const FarmerScan = () => (
  <ErrorBoundary>
    <FarmerScanContent />
  </ErrorBoundary>
);