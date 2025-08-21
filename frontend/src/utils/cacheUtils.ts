/**
 * Cache utilities to force browser refresh when needed
 */

export const clearBrowserCache = () => {
  console.group('🗑️ Clearing Browser Cache');
  
  // Clear localStorage
  const keysToKeep = ['sagitech-token', 'sagitech-tokens', 'sagitech-user'];
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Force reload with cache bypass
  console.log('🔄 Forcing cache bypass reload...');
  console.groupEnd();
  
  // Use location.reload with cache bypass
  window.location.reload();
};

export const forceRefresh = () => {
  console.log('🔄 Forcing application refresh...');
  window.location.href = window.location.href + '?t=' + Date.now();
};

export default { clearBrowserCache, forceRefresh };