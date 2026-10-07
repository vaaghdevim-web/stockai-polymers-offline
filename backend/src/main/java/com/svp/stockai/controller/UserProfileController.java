package com.svp.stockai.controller;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final AppUserRepository appUserRepository;
    private final CustomUserDetailsService customUserDetailsService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAllUsers() {
        List<Map<String, Object>> users = appUserRepository.findAll().stream()
                .map(this::toProfile)
                .toList();
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/{id}/toggle-status")
    @Transactional
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        AppUser user = appUserRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        AppUser saved = appUserRepository.save(user);
        return ResponseEntity.ok(toProfile(saved));
    }

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required"
            ));
        }

        AppUser user =
                customUserDetailsService.loadActiveUser(authentication.getName());

        return ResponseEntity.ok(toProfile(user));
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<?> updateCurrentUser(
            Authentication authentication,
            @RequestBody ProfileUpdateRequest request) {

        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required"
            ));
        }

        AppUser user =
                customUserDetailsService.loadActiveUser(authentication.getName());

        String newUserName = request.userName() == null
                ? user.getUserName()
                : request.userName().trim();

        String newEmail = request.email() == null
                ? user.getEmail()
                : request.email().trim();

        if (newUserName.isBlank() || newEmail.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "Username and email are required"
            ));
        }

        if (!newUserName.equalsIgnoreCase(user.getUserName())
                && appUserRepository.findByUserName(newUserName).isPresent()) {
            return ResponseEntity.status(409).body(Map.of(
                    "status", 409,
                    "error", "Conflict",
                    "message", "Username is already in use"
            ));
        }

        if (!newEmail.equalsIgnoreCase(user.getEmail())
                && appUserRepository.findByEmail(newEmail).isPresent()) {
            return ResponseEntity.status(409).body(Map.of(
                    "status", 409,
                    "error", "Conflict",
                    "message", "Email is already in use"
            ));
        }

        user.setUserName(newUserName);
        user.setEmail(newEmail);
        if (request.fullName() != null) {
            user.setFullName(request.fullName().trim());
        }
        if (request.phoneNumber() != null) {
            user.setPhoneNumber(request.phoneNumber().trim());
        }

        return ResponseEntity.ok(
                toProfile(appUserRepository.save(user))
        );
    }

    @PutMapping("/me/password")
    @Transactional
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @RequestBody PasswordChangeRequest request) {

        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", 401,
                    "error", "Unauthorized",
                    "message", "Authentication required"
            ));
        }

        if (request.currentPassword() == null
                || request.currentPassword().isBlank()
                || request.newPassword() == null
                || request.newPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "Current password and new password are required"
            ));
        }

        if (request.newPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "New password must be at least 8 characters"
            ));
        }

        AppUser user =
                customUserDetailsService.loadActiveUser(authentication.getName());

        if (!passwordEncoder.matches(
                request.currentPassword(),
                user.getPasswordHash())) {
            return ResponseEntity.status(400).body(Map.of(
                    "status", 400,
                    "error", "Bad Request",
                    "message", "Current password is incorrect"
            ));
        }

        user.setPasswordHash(
                passwordEncoder.encode(request.newPassword())
        );

        appUserRepository.save(user);

        return ResponseEntity.ok(
                Map.of("message", "Password updated successfully")
        );
    }

    private Map<String, Object> toProfile(AppUser user) {

        List<String> roles = customUserDetailsService
                .loadAuthorities(user)
                .stream()
                .map(GrantedAuthority::getAuthority)
                .map(role -> role.replaceFirst("^ROLE_", ""))
                .toList();

        Map<String, Object> response = new HashMap<>();

        response.put("userId", user.getUserId());
        response.put("userName", user.getUserName());
        response.put("fullName", user.getFullName());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("email", user.getEmail());
        response.put("roles", roles);
        response.put("isActive", Boolean.TRUE.equals(user.getIsActive()));
        response.put(
                "plantName",
                user.getPlant() != null
                        ? user.getPlant().getPlantName()
                        : null
        );
        response.put("createdAt", user.getCreatedAt());

        return response;
    }

    public record ProfileUpdateRequest(
            String userName,
            String fullName,
            String email,
            String phoneNumber
    ) {}

    public record PasswordChangeRequest(
            String currentPassword,
            String newPassword
    ) {}
}
