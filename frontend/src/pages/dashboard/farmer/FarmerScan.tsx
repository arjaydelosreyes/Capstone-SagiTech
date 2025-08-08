import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, RotateCcw, Check, X, Settings, Eye, BarChart3, Zap } from "lucide-react";
import { AppLayout } from "@/layouts/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { User } from "@/types";
import { toast } from "@/hooks/use-toast";
import { authService } from "@/utils/authService";
import { 
  AdvancedBananaAnalyzer, 
  AdvancedAnalysisResult, 
  BananaDetection,
  AnalysisConfig 
} from "@/utils/advancedAnalyzeBanana";

export const FarmerScan = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AdvancedAnalysisResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Advanced configuration
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    confidence_threshold: 0.75,
    iou_threshold: 0.5,
    return_visualization: true,
    save_results: true
  });

  useEffect(() => {
    const userData = localStorage.getItem("sagitech-user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== "farmer") {
        navigate("/login");
        return;
      }
      setUser(parsedUser);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    return () => {
      if (!showCamera && cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    };
  }, [showCamera, cameraStream]);

  // Draw detection overlays on canvas
  useEffect(() => {
    if (result && showVisualization && canvasRef.current && imageRef.current && result.detections.length > 0) {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      
      // Wait for image to load
      if (img.complete) {
        AdvancedBananaAnalyzer.drawDetectionOverlay(
          canvas, 
          result.detections, 
          img.naturalWidth, 
          img.naturalHeight
        );
      } else {
        img.onload = () => {
          AdvancedBananaAnalyzer.drawDetectionOverlay(
            canvas, 
            result.detections, 
            img.naturalWidth, 
            img.naturalHeight
          );
        };
      }
    }
  }, [result, showVisualization]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        } 
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please try uploading an image instead.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      setSelectedImage(imageData);
      
      // Create file from captured image
      const file = AdvancedBananaAnalyzer['dataURLToFile'](imageData, `capture_${Date.now()}.jpg`);
      setSelectedFile(file);
      
      setShowCamera(false);
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile || !user) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      // Show analysis starting
      toast({
        title: "Analysis Started",
        description: "Processing your image with advanced AI...",
      });

      const analysisResult = await AdvancedBananaAnalyzer.analyzeImage(
        selectedFile, 
        analysisConfig
      );

      setResult(analysisResult);

      if (analysisResult.success) {
        const qualityGrade = AdvancedBananaAnalyzer.getQualityGrade(analysisResult.overall_quality_score);
        
        toast({
          title: "Analysis Complete!",
          description: `Found ${analysisResult.banana_count} banana(s) with ${qualityGrade.grade} quality (${AdvancedBananaAnalyzer.formatProcessingTime(analysisResult.processing_time)})`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: analysisResult.error_message || "Unknown error occurred",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScan = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setResult(null);
    setShowCamera(false);
    setShowVisualization(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const renderDetectionDetails = (detection: BananaDetection, index: number) => {
    const qualityGrade = AdvancedBananaAnalyzer.getQualityGrade(detection.quality_score);
    
    return (
      <div key={index} className="p-4 bg-glass rounded-lg border border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-block px-3 py-1 rounded-lg font-medium border text-sm ${AdvancedBananaAnalyzer.getRipenessBadgeClass(detection.class_name)}`}>
            {detection.class_name}
          </span>
          <span className="text-xs text-muted-foreground">#{index + 1}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <span className="ml-2 font-medium">{(detection.confidence * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Quality:</span>
            <span className="ml-2 font-medium" style={{ color: qualityGrade.color }}>
              {qualityGrade.grade}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Area:</span>
            <span className="ml-2 font-medium">{detection.area.toFixed(0)} px²</span>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

  return (
    <AppLayout title="Advanced Banana Scanner" user={user}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            Advanced AI Banana Scanner
          </h1>
          <p className="text-muted-foreground">
            Production-grade YOLOv8 with polygon segmentation for precise ripeness analysis
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
                muted
                className="w-full max-w-2xl mx-auto rounded-lg"
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
                  Select how you'd like to capture your banana images for AI analysis
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

        {/* Advanced Settings */}
        {selectedImage && (
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Analysis Settings
              </h3>
              <GlassButton
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                variant="glass"
                size="sm"
              >
                {showAdvancedSettings ? 'Hide' : 'Show'}
              </GlassButton>
            </div>

            {showAdvancedSettings && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-glass-border">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confidence Threshold: {(analysisConfig.confidence_threshold! * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={analysisConfig.confidence_threshold}
                    onChange={(e) => setAnalysisConfig(prev => ({ 
                      ...prev, 
                      confidence_threshold: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    IoU Threshold: {(analysisConfig.iou_threshold! * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={analysisConfig.iou_threshold}
                    onChange={(e) => setAnalysisConfig(prev => ({ 
                      ...prev, 
                      iou_threshold: parseFloat(e.target.value) 
                    }))}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="visualization"
                    checked={analysisConfig.return_visualization}
                    onChange={(e) => setAnalysisConfig(prev => ({ 
                      ...prev, 
                      return_visualization: e.target.checked 
                    }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="visualization" className="text-sm text-foreground">
                    Generate visualization
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save_results"
                    checked={analysisConfig.save_results}
                    onChange={(e) => setAnalysisConfig(prev => ({ 
                      ...prev, 
                      save_results: e.target.checked 
                    }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="save_results" className="text-sm text-foreground">
                    Save to database
                  </label>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {/* Image Analysis Section */}
        {selectedImage && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Image Preview */}
            <div className="xl:col-span-2">
              <GlassCard>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Image Analysis</h3>
                    <div className="flex gap-2">
                      {result && result.detections.length > 0 && (
                        <GlassButton
                          onClick={() => setShowVisualization(!showVisualization)}
                          variant="glass"
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showVisualization ? 'Hide' : 'Show'} Overlays
                        </GlassButton>
                      )}
                      <GlassButton
                        onClick={analyzeImage}
                        variant="primary"
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
                  
                  <div className="relative aspect-video bg-muted/50 rounded-lg overflow-hidden">
                    <img
                      ref={imageRef}
                      src={selectedImage}
                      alt="Selected banana"
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Overlay Canvas */}
                    {showVisualization && (
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    )}
                    
                    {/* Server-side visualization */}
                    {result?.visualization_image && !showVisualization && (
                      <img
                        src={result.visualization_image}
                        alt="Analysis visualization"
                        className="absolute top-0 left-0 w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Results Panel */}
            <div className="space-y-6">
              {/* Overall Results */}
              <GlassCard>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Analysis Results
                  </h3>
                  
                  {isAnalyzing && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                      <p className="text-muted-foreground">AI is analyzing your bananas...</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Using YOLOv8 with polygon segmentation
                      </p>
                    </div>
                  )}

                  {result && result.success && (
                    <div className="space-y-4">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-glass rounded-lg">
                          <div className="text-2xl font-bold text-foreground">{result.banana_count}</div>
                          <div className="text-xs text-muted-foreground">Bananas Detected</div>
                        </div>
                        <div className="text-center p-3 bg-glass rounded-lg">
                          <div className="text-2xl font-bold text-foreground">
                            {AdvancedBananaAnalyzer.getQualityGrade(result.overall_quality_score).grade}
                          </div>
                          <div className="text-xs text-muted-foreground">Quality Grade</div>
                        </div>
                      </div>

                      {/* Processing Stats */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Time:</span>
                          <span className="font-medium">
                            {AdvancedBananaAnalyzer.formatProcessingTime(result.processing_time)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model Version:</span>
                          <span className="font-medium text-xs">{result.model_version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Confidence:</span>
                          <span className="font-medium">
                            {(result.quality_metrics.avg_confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Ripeness Distribution */}
                      {Object.keys(result.ripeness_distribution).length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-foreground">Ripeness Distribution</h4>
                          {Object.entries(result.ripeness_distribution).map(([ripeness, count]) => (
                            <div key={ripeness} className="flex items-center justify-between text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${AdvancedBananaAnalyzer.getRipenessBadgeClass(ripeness)}`}>
                                {ripeness}
                              </span>
                              <span className="font-medium">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {result && !result.success && (
                    <div className="text-center py-8">
                      <div className="text-red-500 mb-2">Analysis Failed</div>
                      <p className="text-sm text-muted-foreground">{result.error_message}</p>
                    </div>
                  )}

                  {!result && !isAnalyzing && (
                    <div className="text-center py-8 text-muted-foreground">
                      Click "Analyze Image" to start the AI analysis
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Individual Detections */}
              {result?.detections && result.detections.length > 0 && (
                <GlassCard>
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Individual Detections</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {result.detections.map((detection, index) => 
                        renderDetectionDetails(detection, index)
                      )}
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Actions */}
              {result?.success && (
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
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <GlassCard className="bg-primary-glass border-primary/30">
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Production-Grade AI Features</h4>
            <ul className="space-y-1 text-sm text-foreground">
              <li>• <strong>YOLOv8 Model:</strong> State-of-the-art object detection with polygon segmentation</li>
              <li>• <strong>Quality Assurance:</strong> Comprehensive validation with confidence scoring</li>
              <li>• <strong>Real-time Processing:</strong> Optimized inference pipeline for fast results</li>
              <li>• <strong>Advanced Visualization:</strong> Polygon overlays and bounding box detection</li>
              <li>• <strong>Performance Monitoring:</strong> Detailed metrics and processing analytics</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};