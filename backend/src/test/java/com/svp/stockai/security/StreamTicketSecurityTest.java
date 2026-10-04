package com.svp.stockai.security;

import com.svp.stockai.controller.IoTTelemetryStreamingController;
import com.svp.stockai.service.IoTTelemetryStreamingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Phase 6 Security Verification: Stream Ticket & URL Token Removal Tests.
 * Ensures that JWT tokens in query parameters (?token=...) are strictly rejected,
 * while single-use, short-lived stream tickets (?ticket=...) and Authorization headers work.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Stream Ticket & Query Param JWT Security Tests")
class StreamTicketSecurityTest {

    @Mock
    private IoTTelemetryStreamingService streamingService;

    private StreamTicketService streamTicketService;
    private IoTTelemetryStreamingController controller;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        streamTicketService = new StreamTicketService();
        controller = new IoTTelemetryStreamingController(streamingService, streamTicketService);
    }

    @Test
    @DisplayName("Reject JWT access token passed via query parameter (?token=...)")
    void testRejectJwtInQueryParam() {
        assertThatThrownBy(() -> controller.streamTelemetry("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", null, "EXT-01", "UNIT-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("JWT tokens are forbidden in URL query parameters");
    }

    @Test
    @DisplayName("Accept single-use stream ticket issued to authenticated user")
    void testAcceptValidStreamTicket() {
        when(streamingService.createStream(any(), any())).thenReturn(new SseEmitter());

        // Authenticated user requests a ticket
        var auth = new UsernamePasswordAuthenticationToken("operator1", null, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));
        var response = controller.issueStreamTicket(auth);
        String ticketId = (String) response.getBody().get("ticket");
        assertThat(ticketId).startsWith("TKT-");

        // Use the ticket
        SecurityContextHolder.clearContext();
        SseEmitter emitter = controller.streamTelemetry(null, ticketId, "EXT-01", "UNIT-1");
        assertThat(emitter).isNotNull();

        // Verify SecurityContext was established with ticket credentials
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("operator1");
    }

    @Test
    @DisplayName("Reject replayed / reused single-use stream ticket")
    void testRejectReusedStreamTicket() {
        when(streamingService.createStream(any(), any())).thenReturn(new SseEmitter());

        var auth = new UsernamePasswordAuthenticationToken("operator1", null, List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));
        var response = controller.issueStreamTicket(auth);
        String ticketId = (String) response.getBody().get("ticket");

        // First use succeeds
        controller.streamTelemetry(null, ticketId, "EXT-01", "UNIT-1");

        // Second use of same ticket must be rejected
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> controller.streamTelemetry(null, ticketId, "EXT-01", "UNIT-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid, expired, or previously used stream ticket");
    }

    @Test
    @DisplayName("Reject invalid or forged stream ticket")
    void testRejectInvalidStreamTicket() {
        assertThatThrownBy(() -> controller.streamTelemetry(null, "TKT-FORGED-INVALID-UUID", "EXT-01", "UNIT-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid, expired, or previously used stream ticket");
    }

    @Test
    @DisplayName("Accept valid Authorization header authentication")
    void testAcceptValidHeaderAuthentication() {
        when(streamingService.createStream(any(), any())).thenReturn(new SseEmitter());

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("supervisor1", null, List.of(new SimpleGrantedAuthority("ROLE_SUPERVISOR")))
        );

        SseEmitter emitter = controller.streamTelemetry(null, null, "LOOM-01", "UNIT-2");
        assertThat(emitter).isNotNull();
    }

    @Test
    @DisplayName("Reject unauthenticated request without header or ticket")
    void testRejectUnauthenticatedRequest() {
        SecurityContextHolder.clearContext();

        assertThatThrownBy(() -> controller.streamTelemetry(null, null, "EXT-01", "UNIT-1"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Authentication required");
    }
}
