package com.svp.stockai.config;

import com.svp.stockai.security.CustomUserDetailsService;
import com.svp.stockai.security.JwtAuthenticationFilter;
import com.svp.stockai.security.JwtService;
import lombok.RequiredArgsConstructor;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter(
            JwtService jwtService,
            CustomUserDetailsService customUserDetailsService,
            com.svp.stockai.security.TokenRevocationService tokenRevocationService) {
        return new JwtAuthenticationFilter(jwtService, customUserDetailsService, tokenRevocationService);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            com.svp.stockai.security.DeviceAuthenticationFilter deviceAuthenticationFilter,
            com.svp.stockai.security.CorrelationIdFilter correlationIdFilter)
            throws Exception {

        http
                // Enable CORS for frontend clients (React/Vite/Next.js)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // REST API uses JWT, so CSRF is disabled
                .csrf(csrf -> csrf.disable())

                // JWT authentication is stateless
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // Access rules
                .authorizeHttpRequests(auth -> auth

                        // Unconditionally permit HTTP OPTIONS preflight requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
                        // Only login and token refresh are public.
                        // Logout and MFA management require an authenticated JWT.
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh"
                        )
                        .permitAll()

                        .requestMatchers(
                                "/api/v1/auth/logout",
                                "/api/v1/auth/mfa/**"
                        )
                        .authenticated()

                        // Health check can remain public
                        .requestMatchers("/actuator/health")
                        .permitAll()

                        // Landing page and static assets
                        .requestMatchers("/", "/index.html", "/favicon.ico", "/static/**")
                        .permitAll()

                        // SSE Telemetry Streaming endpoint: uses single-use stream tickets for browser EventSource
                        // The controller itself validates the ticket or JWT token and enforces RBAC
                        .requestMatchers("/api/v1/iot/telemetry/stream", "/api/v1/iot/telemetry/stream/**")
                        .permitAll()

                        // OpenAPI 3.0 / Swagger UI documentation endpoints
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/swagger-resources/**",
                                "/webjars/**"
                        ).permitAll()

                        // Error dispatch
                        .requestMatchers("/error")
                        .permitAll()

                        // All other APIs require authentication
                        .anyRequest()
                        .authenticated()
                )

                // Run correlation ID filter first to ensure all logs capture correlationId
                .addFilterBefore(
                        correlationIdFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                // Run device authentication filter for edge machine tokens before JWT filter
                .addFilterBefore(
                        deviceAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                // Run our JWT filter before Spring's username/password filter
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @org.springframework.beans.factory.annotation.Value("${stockai.cors.allowed-origins:http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:5176,https://stockai.svpgroup.com}")
    private String allowedOrigins;

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        // Support dynamic port patterns (e.g., Vite/React dev ports on localhost or 127.0.0.1)
        List<String> originPatterns = new ArrayList<>(origins);
        originPatterns.add("http://localhost:[*]");
        originPatterns.add("http://127.0.0.1:[*]");
        originPatterns.add("https://*.svpgroup.com");
        originPatterns.add("https://stockai.svpgroup.com");

        configuration.setAllowedOriginPatterns(originPatterns);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With",
                "X-Device-Id",
                "X-Device-Key",
                "X-Correlation-ID",
                "*"
        ));
        configuration.setExposedHeaders(List.of(
                "Authorization",
                "Link",
                "X-Total-Count",
                "X-Correlation-ID",
                "Content-Disposition",
                "Content-Type"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
