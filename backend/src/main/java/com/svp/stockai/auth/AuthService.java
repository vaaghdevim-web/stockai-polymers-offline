package com.svp.stockai.auth;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.security.CustomUserDetailsService;
import com.svp.stockai.security.JwtService;
import com.svp.stockai.security.MfaService;
import com.svp.stockai.security.TokenRevocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final CustomUserDetailsService customUserDetailsService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Autowired(required = false)
    private MfaService mfaService;

    @Autowired(required = false)
    private TokenRevocationService tokenRevocationService;

    @org.springframework.beans.factory.annotation.Value("${stockai.security.mfa.enforced:false}")
    private boolean mfaEnforced;

    public LoginResponse login(LoginRequest request) {

        // 1. Find the active user
        AppUser user = customUserDetailsService
                .loadActiveUser(request.getUsernameOrEmail());

        // 2. Make sure the user has a stored password
        if (user.getPasswordHash() == null
                || user.getPasswordHash().isBlank()) {
            throw new BadCredentialsException(
                    "Password is not configured for this user"
            );
        }

        // 3. Compare entered password with stored password hash
        if (!passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash())) {
            throw new BadCredentialsException(
                    "Invalid username or password"
            );
        }

        // 4. Load user's active roles
        List<GrantedAuthority> authorities =
                customUserDetailsService.loadAuthorities(user);

        List<String> roles = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .map(role -> role.replaceFirst("^ROLE_", ""))
                .toList();

        // 5. Enforce MFA for Administrators and privileged/MFA-enabled users
        boolean isAdmin = roles.contains("ADMIN");
        boolean mfaRequired = isAdmin || Boolean.TRUE.equals(user.getMfaEnabled()) || mfaEnforced;

        if (mfaRequired) {
            if (request.getTotpCode() == null || request.getTotpCode().isBlank()) {
                throw new BadCredentialsException("MFA TOTP code is required for administrator accounts");
            }
            String userSecret = user.getMfaSecret();
            if (userSecret == null || userSecret.isBlank()) {
                throw new BadCredentialsException("MFA secret is not configured for administrator account");
            }
            if (mfaService == null) {
                throw new IllegalStateException("MFA verification service is unavailable");
            }
            try {
                int code = Integer.parseInt(request.getTotpCode().trim());
                boolean mfaValid = mfaService.verifyTotp(userSecret, code);
                if (!mfaValid) {
                    throw new BadCredentialsException("Invalid MFA TOTP verification code");
                }
            } catch (NumberFormatException e) {
                throw new BadCredentialsException("MFA code must be a 6-digit numeric string");
            }
        } else if (request.getTotpCode() != null && !request.getTotpCode().isBlank() && mfaService != null) {
            // Optional MFA verification for non-privileged user who has an MFA secret configured
            String userSecret = user.getMfaSecret();
            if (userSecret != null && !userSecret.isBlank()) {
                try {
                    int code = Integer.parseInt(request.getTotpCode().trim());
                    if (!mfaService.verifyTotp(userSecret, code)) {
                        throw new BadCredentialsException("Invalid MFA TOTP verification code");
                    }
                } catch (NumberFormatException e) {
                    throw new BadCredentialsException("MFA code must be a 6-digit numeric string");
                }
            }
        }

        Long plantId = user.getPlant() != null ? user.getPlant().getPlantId() : null;

        // 6. Generate Access Token & Refresh Token
        String token = jwtService.generateToken(
                user.getUserName(),
                user.getUserId(),
                plantId,
                roles
        );

        String refreshToken = jwtService.generateRefreshToken(
                user.getUserName(),
                user.getUserId()
        );

        // 7. Return token and user information
        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .userName(user.getUserName())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }

    public LoginResponse refreshToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("Refresh token is required");
        }

        if (tokenRevocationService != null && tokenRevocationService.isRevoked(refreshToken)) {
            throw new BadCredentialsException("Refresh token has been revoked");
        }

        if (!jwtService.validateToken(refreshToken) || !jwtService.isRefreshToken(refreshToken)) {
            throw new BadCredentialsException("Invalid or expired refresh token");
        }

        String username = jwtService.extractUsername(refreshToken);
        AppUser user = customUserDetailsService.loadActiveUser(username);

        List<GrantedAuthority> authorities = customUserDetailsService.loadAuthorities(user);
        List<String> roles = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .map(role -> role.replaceFirst("^ROLE_", ""))
                .toList();

        Long plantId = user.getPlant() != null ? user.getPlant().getPlantId() : null;

        String newAccessToken = jwtService.generateToken(
                user.getUserName(),
                user.getUserId(),
                plantId,
                roles
        );

        String newRefreshToken = jwtService.generateRefreshToken(
                user.getUserName(),
                user.getUserId()
        );

        // Revoke the old refresh token to prevent replay attacks
        if (tokenRevocationService != null) {
            tokenRevocationService.revoke(refreshToken);
        }

        return LoginResponse.builder()
                .token(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .userName(user.getUserName())
                .email(user.getEmail())
                .roles(roles)
                .build();
    }
}