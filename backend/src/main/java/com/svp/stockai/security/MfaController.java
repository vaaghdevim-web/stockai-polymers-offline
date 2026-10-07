package com.svp.stockai.security;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/mfa")
@RequiredArgsConstructor
public class MfaController {

    private static final String ISSUER = "Sri Vidhya Polymers (StockAI)";

    private final AppUserRepository appUserRepository;
    private final MfaService mfaService;
    private final PasswordEncoder passwordEncoder;

    @Value("${stockai.security.mfa.enforced:false}")
    private boolean mfaEnforced;

    /**
     * Returns MFA status for the currently authenticated user.
     * Never returns the stored MFA secret.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(Authentication authentication) {
        AppUser user = currentUser(authentication);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mfaEnabled", Boolean.TRUE.equals(user.getMfaEnabled()));
        response.put("mfaEnforced", mfaEnforced);
        response.put("algorithm", "SHA1");
        response.put("digits", 6);
        response.put("periodSeconds", 30);

        return ResponseEntity.ok(response);
    }

    /**
     * Starts MFA enrollment for the currently authenticated user.
     * A new random secret is generated and stored with MFA still disabled.
     */
    @PostMapping("/enroll")
    public ResponseEntity<Map<String, Object>> enroll(Authentication authentication) {
        AppUser user = currentUser(authentication);

        String secret = mfaService.generateSecret();

        user.setMfaSecret(secret);
        user.setMfaEnabled(false);
        appUserRepository.save(user);

        String accountName = user.getEmail() != null && !user.getEmail().isBlank()
                ? user.getEmail()
                : user.getUserName();

        String provisioningUri =
                mfaService.buildProvisioningUri(
                        ISSUER,
                        accountName,
                        secret
                );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mfaEnabled", false);
        response.put("secret", secret);
        response.put("provisioningUri", provisioningUri);
        response.put("issuer", ISSUER);
        response.put("accountName", accountName);
        response.put("algorithm", "SHA1");
        response.put("digits", 6);
        response.put("periodSeconds", 30);

        return ResponseEntity.ok(response);
    }

    /**
     * Verifies the authenticator code and activates MFA.
     */
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, Object>> confirm(
            Authentication authentication,
            @RequestBody Map<String, Object> request) {

        AppUser user = currentUser(authentication);

        String totpCode = stringValue(request.get("totpCode"));

        if (!isValidTotpFormat(totpCode)) {
            return error(HttpStatus.BAD_REQUEST, "TOTP code must be exactly 6 digits.");
        }

        String secret = user.getMfaSecret();

        if (secret == null || secret.isBlank()) {
            return error(
                    HttpStatus.CONFLICT,
                    "MFA enrollment has not been started for this account."
            );
        }

        boolean valid = mfaService.verifyTotp(secret, Integer.parseInt(totpCode));

        if (!valid) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid MFA verification code."
            );
        }

        user.setMfaEnabled(true);
        appUserRepository.save(user);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mfaEnabled", true);
        response.put("message", "MFA successfully enabled.");

        return ResponseEntity.ok(response);
    }

    /**
     * Disables MFA only after password + current TOTP verification.
     * Global factory enforcement can prevent disabling MFA entirely.
     */
    @PostMapping("/disable")
    public ResponseEntity<Map<String, Object>> disable(
            Authentication authentication,
            @RequestBody Map<String, Object> request) {

        if (mfaEnforced) {
            return error(
                    HttpStatus.FORBIDDEN,
                    "MFA is globally enforced and cannot be disabled."
            );
        }

        AppUser user = currentUser(authentication);

        String password = stringValue(request.get("password"));
        String totpCode = stringValue(request.get("totpCode"));

        if (password == null || password.isBlank()) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "Password is required to disable MFA."
            );
        }

        if (!isValidTotpFormat(totpCode)) {
            return error(
                    HttpStatus.BAD_REQUEST,
                    "TOTP code must be exactly 6 digits."
            );
        }

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(password, user.getPasswordHash())) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid password."
            );
        }

        String secret = user.getMfaSecret();

        if (secret == null || secret.isBlank()
                || !mfaService.verifyTotp(secret, Integer.parseInt(totpCode))) {
            return error(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid MFA verification code."
            );
        }

        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        appUserRepository.save(user);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("mfaEnabled", false);
        response.put("message", "MFA successfully disabled.");

        return ResponseEntity.ok(response);
    }

    private AppUser currentUser(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new org.springframework.security.core.AuthenticationException(
                    "Authenticated user is required."
            ) {};
        }

        return appUserRepository
                .findByUserName(authentication.getName())
                .orElseThrow(() ->
                        new org.springframework.security.core.AuthenticationException(
                                "Authenticated user account was not found."
                        ) {});
    }

    private static boolean isValidTotpFormat(String code) {
        return code != null && code.matches("\\d{6}");
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static ResponseEntity<Map<String, Object>> error(
            HttpStatus status,
            String message) {

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", message);

        return ResponseEntity.status(status).body(response);
    }
}
