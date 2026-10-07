package com.svp.stockai.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;
    private final TokenRevocationService tokenRevocationService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        if (token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Always retain explicit token revocation checks.
        if (tokenRevocationService != null
                && tokenRevocationService.isRevoked(token)) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Token has been revoked\"}"
            );
            return;
        }

        try {
            // Parse and cryptographically verify the JWT exactly once.
            Claims claims = jwtService.extractClaims(token);

            // Refresh tokens must never authenticate API requests.
            if ("REFRESH".equals(claims.get("tokenType", String.class))) {
                filterChain.doFilter(request, response);
                return;
            }

            String username = claims.getSubject();

            if (username == null
                    || username.isBlank()
                    || SecurityContextHolder.getContext().getAuthentication() != null) {

                filterChain.doFilter(request, response);
                return;
            }

            /*
             * Access tokens already contain signed role claims.
             *
             * Using these claims avoids two PostgreSQL lookups on every
             * authenticated API request. The JWT signature guarantees that
             * the caller cannot modify these claims without invalidating
             * the token.
             */
            List<GrantedAuthority> authorities = extractAuthorities(claims);

            /*
             * Backward compatibility:
             * older access tokens without a roles claim fall back to the
             * database-backed user/role lookup.
             */
            if (authorities.isEmpty()) {
                var user = customUserDetailsService.loadActiveUser(username);
                authorities = customUserDetailsService.loadAuthorities(user);
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            authorities
                    );

            SecurityContextHolder.getContext()
                    .setAuthentication(authentication);

        } catch (Exception ignored) {
            // Invalid/expired/malformed JWT remains unauthenticated and
            // is handled by normal Spring Security authorization rules.
        }

        filterChain.doFilter(request, response);
    }

    private List<GrantedAuthority> extractAuthorities(Claims claims) {

        Object rolesClaim = claims.get("roles");

        if (!(rolesClaim instanceof List<?> roles)) {
            return List.of();
        }

        List<GrantedAuthority> authorities = new ArrayList<>();

        for (Object role : roles) {

            if (!(role instanceof String roleName)) {
                continue;
            }

            String normalizedRole = roleName.trim();

            if (normalizedRole.isBlank()) {
                continue;
            }

            if (!normalizedRole.startsWith("ROLE_")) {
                normalizedRole = "ROLE_" + normalizedRole;
            }

            authorities.add(
                    new SimpleGrantedAuthority(normalizedRole)
            );
        }

        return List.copyOf(authorities);
    }
}