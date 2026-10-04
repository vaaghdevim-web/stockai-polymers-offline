package com.svp.stockai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filter that authenticates edge gateways, PLCs, and IoT sensors using machine headers:
 * - X-Device-Id: Identifier of the machine or edge gateway (e.g., EXT-01, GW-UNIT2-01)
 * - X-Device-Key: Pre-shared secret key or hardware device token
 */
@Slf4j
@Component
public class DeviceAuthenticationFilter extends OncePerRequestFilter {

    public static final String HEADER_DEVICE_ID = "X-Device-Id";
    public static final String HEADER_DEVICE_KEY = "X-Device-Key";

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private DeviceRegistryService deviceRegistryService;

    public DeviceAuthenticationFilter() {
        this.deviceRegistryService = null;
    }

    public DeviceAuthenticationFilter(DeviceRegistryService deviceRegistryService) {
        this.deviceRegistryService = deviceRegistryService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String deviceId = request.getHeader(HEADER_DEVICE_ID);
        String deviceKey = request.getHeader(HEADER_DEVICE_KEY);

        // If machine headers are present, enforce strict per-device authentication
        if ((deviceId != null && !deviceId.isBlank()) || (deviceKey != null && !deviceKey.isBlank())) {
            if (deviceId == null || deviceId.isBlank() || deviceKey == null || deviceKey.isBlank()) {
                log.warn("Partial IoT device authentication headers provided");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Both X-Device-Id and X-Device-Key are required\"}");
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                boolean authenticated = deviceRegistryService != null && deviceRegistryService.authenticateDevice(deviceId, deviceKey);
                if (authenticated) {
                    List<GrantedAuthority> authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_MACHINE")
                    );

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    "DEVICE:" + deviceId.trim().toUpperCase(),
                                    null,
                                    authorities
                            );

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("Authenticated IoT machine/gateway: {}", deviceId);
                } else {
                    log.warn("IoT Machine authentication failed for deviceId: {}. Invalid, disabled, or revoked key.", deviceId);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid, disabled, or revoked machine device credentials\"}");
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
