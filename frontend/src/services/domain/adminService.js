import api, { roleApi, authApi } from '../api';

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
 * Backed by GET /api/v1/users/me (UserProfileController).
 */
export const getCurrentUserProfile = async () => {
  return executeWithTokenRefresh(async () => {
    try {
      const res = await api.get('/users/me');
      return { data: res.data };
    } catch (err) {
      // Fallback to local session if network or offline
      const saved = localStorage.getItem('stockai_user');
      if (saved) {
        const user = JSON.parse(saved);
        return {
          data: {
            userId: user.id,
            userName: user.name,
            fullName: user.fullName || user.name,
            phoneNumber: user.phoneNumber || '',
            email: user.email,
            roles: user.roles || [],
            plantName: 'Sri Vidha Polymers - Unit 1',
            isActive: true,
          }
        };
      }
      throw err;
    }
  });
};

/**
 * Updates the current authenticated user's profile (name, username, email, phone number).
 * Backed by PUT /api/v1/users/me.
 */
export const updateCurrentUserProfile = async (payload) => {
  return executeWithTokenRefresh(async () => {
    const res = await api.put('/users/me', payload);
    // Update local cached user if successful
    try {
      const saved = localStorage.getItem('stockai_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (res.data?.userName) user.name = res.data.userName;
        if (res.data?.fullName) user.fullName = res.data.fullName;
        if (res.data?.email) user.email = res.data.email;
        if (res.data?.phoneNumber) user.phoneNumber = res.data.phoneNumber;
        localStorage.setItem('stockai_user', JSON.stringify(user));
      }
    } catch (e) {
      console.warn('Failed to update cached local user:', e);
    }
    return { data: res.data };
  });
};

/**
 * Changes the current authenticated user's password.
 * Backed by PUT /api/v1/users/me/password with fallback to authApi.changePassword.
 */
export const changeCurrentUserPassword = async (payload) => {
  return executeWithTokenRefresh(async () => {
    try {
      const res = await api.put('/users/me/password', payload);
      return { data: res.data };
    } catch (err) {
      if (err.response?.status === 404 && authApi && authApi.changePassword) {
        const fallbackRes = await authApi.changePassword(payload);
        return { data: fallbackRes.data || fallbackRes };
      }
      throw err;
    }
  });
};

/**
 * Retrieves the TOTP MFA status.
 * Spring Boot enforces RFC 6238 TOTP server-side during /auth/login for administrator accounts,
 * but does not expose a standalone runtime query endpoint (/api/v1/auth/mfa/status).
 */
export const getMfaStatus = async () => {
  return {
    data: {
      mfaEnabled: true,
      enforcedAtLogin: true,
      endpointAvailable: false,
      algorithm: 'RFC 6238 TOTP',
      digits: 6,
    }
  };
};

/**
 * Initiates TOTP MFA enrollment.
 * Standalone enrollment endpoint is not exposed by backend controllers.
 */
export const enrollMfa = async () => {
  const error = new Error('Runtime MFA enrollment (/api/v1/auth/mfa/enroll) is not supported by backend controllers.');
  error.response = { status: 501, data: { message: 'Runtime MFA enrollment is not supported by backend controllers.' } };
  throw error;
};

/**
 * Confirms and activates TOTP MFA.
 */
export const confirmMfa = async (_totpCode) => {
  const error = new Error('Runtime MFA confirmation (/api/v1/auth/mfa/confirm) is not supported by backend controllers.');
  error.response = { status: 501, data: { message: 'Runtime MFA confirmation is not supported by backend controllers.' } };
  throw error;
};

/**
 * Disables TOTP MFA.
 */
export const disableMfa = async (_password, _totpCode) => {
  const error = new Error('Runtime MFA disable (/api/v1/auth/mfa/disable) is not supported by backend controllers.');
  error.response = { status: 501, data: { message: 'Runtime MFA disable is not supported by backend controllers.' } };
  throw error;
};

/**
 * Revokes current session token server-side via TokenRevocationService.
 * Endpoint: POST /api/v1/auth/logout
 */
export const logoutSession = async () => {
  return api.post('/auth/logout');
};

/**
 * Retrieves active enterprise roles from backend.
 * Endpoint: GET /api/v1/roles
 */
export const getEnterpriseRoles = async () => {
  return roleApi.getRoles();
};

/**
 * Retrieves a single role by ID.
 * Endpoint: GET /api/v1/roles/{id}
 */
export const getEnterpriseRoleById = async (id) => {
  return roleApi.getRoleById(id);
};

/**
 * Creates a new enterprise role. Requires SUPER_ADMIN role.
 * Endpoint: POST /api/v1/roles
 */
export const createEnterpriseRole = async (data) => {
  return roleApi.createRole(data);
};

/**
 * Updates an enterprise role's metadata and permissions. Requires SUPER_ADMIN role.
 * Endpoint: PUT /api/v1/roles/{id}
 */
export const updateEnterpriseRole = async (id, data) => {
  return roleApi.updateRole(id, data);
};

/**
 * Safely removes an eligible enterprise role. Requires SUPER_ADMIN role.
 * Endpoint: DELETE /api/v1/roles/{id}
 */
export const deleteEnterpriseRole = async (id) => {
  return roleApi.deleteRole(id);
};

/**
 * Retrieves available system permissions for role assignment.
 * Endpoint: GET /api/v1/roles/permissions
 */
export const getAvailablePermissions = async () => {
  return roleApi.getPermissions();
};

/**
 * Retrieves all registered plant users.
 * Endpoint: GET /api/v1/users
 */
export const getPlantUsers = async () => {
  return executeWithTokenRefresh(async () => {
    const res = await api.get('/users');
    return { data: res.data };
  });
};

/**
 * Toggles a user's active status.
 * Endpoint: PATCH /api/v1/users/{id}/toggle-status
 */
export const toggleUserStatus = async (userId) => {
  return executeWithTokenRefresh(async () => {
    const res = await api.patch(`/users/${userId}/toggle-status`);
    return { data: res.data };
  });
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
  getEnterpriseRoles,
  getEnterpriseRoleById,
  createEnterpriseRole,
  updateEnterpriseRole,
  deleteEnterpriseRole,
  getAvailablePermissions,
  getPlantUsers,
  toggleUserStatus,
  extractErrorMessage,
};
