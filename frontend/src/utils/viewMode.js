/**
 * Viewport and Layout Controller for Responsive Mobile vs. Desktop View Switching
 */

export const getViewMode = () => {
  if (typeof window === 'undefined') return 'mobile';
  return localStorage.getItem('stockai_view_mode') || 'mobile';
};

export const applyViewMode = (mode) => {
  if (typeof document === 'undefined') return;
  localStorage.setItem('stockai_view_mode', mode);
  
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    if (mode === 'desktop') {
      viewportMeta.setAttribute(
        'content',
        'width=1280, initial-scale=0.32, minimum-scale=0.25, maximum-scale=3.0, user-scalable=yes'
      );
      document.documentElement.classList.add('forced-desktop-view');
    } else {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes'
      );
      document.documentElement.classList.remove('forced-desktop-view');
    }
  }
};
