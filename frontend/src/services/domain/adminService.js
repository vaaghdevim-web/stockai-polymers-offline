import api from '../api';

/**
 * Domain Service for Administration, User Profile, RBAC Verification, and TOTP MFA.
 * Backed strictly by Spring Boot UserProfileController, MfaController, and AuthController.
 * Reuses the application's configured Axios client with automatic 401/403 token refresh recovery.
 */

export const extractErrorMessage = (error, fallback = 'Operation failed.') => {
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error && typeof error.response.data.error === 'string') {
    return error.response.data.error;
  }
  if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
    return error.response.data.details.join('; ');
  }
  if (typeof error.response?.data === 'string') return error.response.data;
  return error.message || fallback;
};

/**
 * Executes an authenticated API request with automatic token refresh recovery.
 * Spring Security responds with 403 Forbidden when an access token has expired or is invalid.
 * If a valid 7-day refresh token is available, this intercepts 401/403, refreshes the token,
 * updates storage, and transparently retries the request once.
 */
const executeWithTokenRefresh = async (apiCall) => {
  try {
    return await apiCall();
  } catch (error) {
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;
    const originalRequest = error.config;

    if (isAuthError && originalRequest && !originalRequest._adminRetry) {
      originalRequest._adminRetry = true;
      const refreshToken = localStorage.getItem('stockai_refresh_token');
      if (refreshToken) {
        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          const newToken = res.data?.token;
          if (newToken) {
            localStorage.setItem('stockai_token', newToken);
            if (res.data?.refreshToken) {
              localStorage.setItem('stockai_refresh_token', res.data.refreshToken);
            }
            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return await api(originalRequest);
          }
        } catch {
          // Token refresh failed; re-throw original error
        }
      }
    }
    throw error;
  }
};

/**
 * Retrieves the current authenticated user's profile, roles, assigned plant, and account status.
 * Endpoint: GET /api/v1/users/me (or /api/v1/profile)
 */
export const getCurrentUserProfile = async () => {
  return executeWithTokenRefresh(() => api.get('/users/me'));
};

/**
 * Updates the current authenticated user's profile (username and email with uniqueness check).
 * Endpoint: PUT /api/v1/users/me
 */
export const updateCurrentUserProfile = async (payload) => {
  return executeWithTokenRefresh(() => api.put('/users/me', payload));
};

/**
 * Changes the current authenticated user's password after validating current password.
 * Endpoint: PUT /api/v1/users/me/password
 */
export const changeCurrentUserPassword = async (payload) => {
  return executeWithTokenRefresh(() => api.put('/users/me/password', payload));
};

/**
 * Retrieves the real-time TOTP MFA enrollment and activation status for the current user.
 * Endpoint: GET /api/v1/auth/mfa/status
 */
export const getMfaStatus = async () => {
  return executeWithTokenRefresh(() => api.get('/auth/mfa/status'));
};

/**
 * Initiates TOTP MFA enrollment by generating a Base32 secret and otpauth provisioning URI.
 * Endpoint: POST /api/v1/auth/mfa/enroll
 */
export const enrollMfa = async () => {
  return executeWithTokenRefresh(() => api.post('/auth/mfa/enroll'));
};

/**
 * Confirms and activates TOTP MFA by verifying a valid 6-digit numeric TOTP token.
 * Endpoint: POST /api/v1/auth/mfa/confirm
 */
export const confirmMfa = async (totpCode) => {
  return executeWithTokenRefresh(() => api.post('/auth/mfa/confirm', { totpCode }));
};

/**
 * Disables TOTP MFA requiring current password and active TOTP code validation.
 * Endpoint: POST /api/v1/auth/mfa/disable
 */
export const disableMfa = async (password, totpCode) => {
  return executeWithTokenRefresh(() => api.post('/auth/mfa/disable', { password, totpCode }));
};

/**
 * Revokes current session token server-side via TokenRevocationService.
 * Endpoint: POST /api/v1/auth/logout
 */
export const logoutSession = async () => {
  return api.post('/auth/logout');
};

export default {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeCurrentUserPassword,
  getMfaStatus,
  enrollMfa,
  confirmMfa,
  disableMfa,
  logoutSession,
  extractErrorMessage,
};
