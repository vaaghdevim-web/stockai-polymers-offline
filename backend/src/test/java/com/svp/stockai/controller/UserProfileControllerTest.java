package com.svp.stockai.controller;

import com.svp.stockai.entity.AppRole;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.repository.AppUserRepository;
import com.svp.stockai.security.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserProfileController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserRepository appUserRepository;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("PUT /api/v1/users/me updates profile with fullName and phoneNumber")
    void updateCurrentUser_PersistsFullNameAndPhone() throws Exception {
        AppUser user = AppUser.builder()
                .userId(1L)
                .userName("admin")
                .email("admin@stockai.com")
                .fullName("System Administrator")
                .phoneNumber("+91-9988776655")
                .isActive(true)
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "admin", "password", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        when(customUserDetailsService.loadActiveUser("admin")).thenReturn(user);
        when(appUserRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String payload = """
                {
                    "userName": "admin",
                    "email": "admin@stockai.com",
                    "fullName": "System Administrator",
                    "phoneNumber": "+91-9988776655"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("System Administrator"))
                .andExpect(jsonPath("$.phoneNumber").value("+91-9988776655"));
    }

    @Test
    @DisplayName("PUT /api/v1/users/me/password updates password when valid")
    void changePassword_SucceedsWithValidCredentials() throws Exception {
        AppUser user = AppUser.builder()
                .userId(1L)
                .userName("admin")
                .passwordHash("hashedOldPassword")
                .isActive(true)
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                "admin", "password", List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        when(customUserDetailsService.loadActiveUser("admin")).thenReturn(user);
        when(passwordEncoder.matches("OldPass123!", "hashedOldPassword")).thenReturn(true);
        when(passwordEncoder.encode("NewPass123!")).thenReturn("hashedNewPassword");
        when(appUserRepository.save(any(AppUser.class))).thenReturn(user);

        String payload = """
                {
                    "currentPassword": "OldPass123!",
                    "newPassword": "NewPass123!"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/password")
                        .principal(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));
    }
}
