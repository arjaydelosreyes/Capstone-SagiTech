/**
 * Unit tests for ApiService
 */

import { apiService } from '@/services/ApiService';
import { toast } from '@/hooks/use-toast';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn()
}));

describe('ApiService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    (toast as jest.Mock).mockClear();
    localStorage.clear();
  });

  describe('predict', () => {
    it('should make prediction request with correct parameters', async () => {
      const mockResponse = {
        id: 1,
        image_url: 'http://example.com/image.jpg',
        total_count: 5,
        ripeness_distribution: { mature: 3, ripe: 2, not_mature: 0, over_ripe: 0 },
        confidence: 85.5,
        bounding_boxes: [],
        processed_at: new Date().toISOString(),
        processing_metadata: {
          model_version: 'v1.0',
          processing_time: 2.5,
          analysis_mode: 'standard',
          confidence_threshold: 0.5
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await apiService.predict(imageFile, 'standard');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/predict/',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData)
        })
      );
      
      expect(result).toEqual(mockResponse);
    });

    it('should handle prediction errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(apiService.predict(imageFile)).rejects.toThrow('Network error');
      expect(toast).toHaveBeenCalledWith({
        title: "Prediction Failed",
        description: "Network error. Please check your connection and try again.",
        variant: "destructive",
      });
    });

    it('should handle file size errors with user-friendly message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Image is too large'));

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(apiService.predict(imageFile)).rejects.toThrow('Image is too large');
      expect(toast).toHaveBeenCalledWith({
        title: "Prediction Failed",
        description: "Image is too large. Please use an image under 10MB.",
        variant: "destructive",
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token on 401 response', async () => {
      // Mock initial 401 response
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response)
        // Mock successful token refresh
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access: 'new-token' })
        } as Response)
        // Mock successful retry
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as Response);

      localStorage.setItem('sagitech-tokens', JSON.stringify({ refresh: 'refresh-token' }));

      const result = await apiService.getDashboardOverview();

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(localStorage.getItem('sagitech-token')).toBe('new-token');
    });
  });
});