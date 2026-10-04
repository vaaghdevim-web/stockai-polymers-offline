package com.svp.stockai.controller;

import com.svp.stockai.security.StreamTicketService;
import com.svp.stockai.service.IoTTelemetryStreamingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/iot/telemetry")
public class IoTTelemetryStreamingController {

    private final IoTTelemetryStreamingService streamingService;
    private final StreamTicketService streamTicketService;

    public IoTTelemetryStreamingController(IoTTelemetryStreamingService streamingService) {
        this(streamingService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public IoTTelemetryStreamingController(
            IoTTelemetryStreamingService streamingService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) StreamTicketService streamTicketService) {
        this.streamingService = streamingService;
        this.streamTicketService = streamTicketService;
    }

    /**
     * Issues a short-lived (30s), single-use stream ticket for WebSocket / SSE connections.
     * Prevents long-lived JWT access tokens from being exposed in browser URLs, query parameters,
     * or HTTP server access logs.
     */
    @PostMapping("/stream/ticket")
    @PreAuthorize("hasAnyRole('OPERATOR', 'ADMIN', 'SUPERVISOR', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> issueStreamTicket(Authentication authentication) {
        if (streamTicketService == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Stream ticket service is unavailable");
        }
        Authentication auth = authentication != null ? authentication : SecurityContextHolder.getContext().getAuthentication();
        String username = auth != null && auth.getName() != null && !auth.getName().isBlank() ? auth.getName() : "operator";
        List<String> roles = auth != null && auth.getAuthorities() != null
                ? auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList()
                : List.of("ROLE_OPERATOR");

        if (roles.isEmpty()) {
            roles = List.of("ROLE_OPERATOR");
        }

        StreamTicketService.StreamTicket ticket = streamTicketService.createTicket(username, null, roles);
        return ResponseEntity.ok(Map.of(
                "ticket", ticket.getTicketId(),
                "expiresInSeconds", StreamTicketService.TICKET_EXPIRATION_SECONDS
        ));
    }

    /**
     * Real-time SSE Telemetry Streaming endpoint.
     * Rejects ?token=<JWT> in query parameters.
     * Accepts either Authorization: Bearer <JWT> or ?ticket=<single_use_ticket>.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamTelemetry(
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String ticket,
            @RequestParam(required = false) String machineCode,
            @RequestParam(required = false) String unit) {

        // Phase 6: Strictly reject JWT access tokens in query parameters
        if (token != null && !token.isBlank()) {
            log.warn("Rejected telemetry stream connection attempt with JWT in query parameter");
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "JWT tokens are forbidden in URL query parameters. Use 'Authorization: Bearer <JWT>' header or obtain a single-use stream ticket via POST /api/v1/iot/telemetry/stream/ticket"
            );
        }

        // If single-use ticket is provided, validate and consume it atomically
        if (ticket != null && !ticket.isBlank()) {
            StreamTicketService.StreamTicket streamTicket = streamTicketService.consumeTicket(ticket)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "Invalid, expired, or previously used stream ticket"
                    ));

            List<GrantedAuthority> authorities = streamTicket.getRoles().stream()
                    .map(r -> r.startsWith("ROLE_") ? r : "ROLE_" + r)
                    .map(SimpleGrantedAuthority::new)
                    .map(a -> (GrantedAuthority) a)
                    .toList();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(streamTicket.getUsername(), null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        // Verify that caller is authenticated with appropriate role
        Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
        if (currentAuth == null || !currentAuth.isAuthenticated() || "anonymousUser".equals(currentAuth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required via Bearer header or stream ticket");
        }

        boolean hasRequiredRole = currentAuth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(String::toUpperCase)
                .anyMatch(a -> a.contains("ADMIN") || a.contains("SUPERVISOR") ||
                               a.contains("OPERATOR") || a.contains("MANAGER") ||
                               a.contains("USER"));

        if (!hasRequiredRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: insufficient privileges for telemetry stream");
        }

        return streamingService.createStream(machineCode, unit);
    }
}
