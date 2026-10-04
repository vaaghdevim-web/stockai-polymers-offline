package com.svp.stockai.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service managing short-lived, single-use stream tickets for SSE and WebSocket telemetry streaming.
 * Replaces insecure URL JWT query parameters (?token=JWT) with opaque, 30-second single-use tickets
 * cryptographically bound to the authenticated user and their RBAC permissions.
 */
@Slf4j
@Service
public class StreamTicketService {

    public static final long TICKET_EXPIRATION_SECONDS = 30;

    @Data
    @Builder
    @AllArgsConstructor
    public static class StreamTicket {
        private String ticketId;
        private String username;
        private Long plantId;
        private List<String> roles;
        private Instant expiresAt;
    }

    private final Map<String, StreamTicket> ticketStore = new ConcurrentHashMap<>();

    public StreamTicket createTicket(String username, Long plantId, List<String> roles) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username must not be blank to issue stream ticket");
        }
        String ticketId = "TKT-" + UUID.randomUUID().toString();
        StreamTicket ticket = StreamTicket.builder()
                .ticketId(ticketId)
                .username(username)
                .plantId(plantId)
                .roles(roles != null ? roles : List.of())
                .expiresAt(Instant.now().plusSeconds(TICKET_EXPIRATION_SECONDS))
                .build();

        ticketStore.put(ticketId, ticket);
        log.debug("Issued stream ticket: id={}, user={}, expires in {}s", ticketId, username, TICKET_EXPIRATION_SECONDS);
        return ticket;
    }

    /**
     * Atomically consumes and invalidates a stream ticket.
     * Enforces single-use and expiration guarantees.
     */
    public Optional<StreamTicket> consumeTicket(String ticketId) {
        if (ticketId == null || ticketId.isBlank()) {
            return Optional.empty();
        }
        // Atomic removal enforces single-use guarantee
        StreamTicket ticket = ticketStore.remove(ticketId.trim());
        if (ticket == null) {
            log.warn("Attempt to consume unknown or previously used stream ticket: {}", ticketId);
            return Optional.empty();
        }

        if (Instant.now().isAfter(ticket.getExpiresAt())) {
            log.warn("Stream ticket expired for user: {}", ticket.getUsername());
            return Optional.empty();
        }

        log.debug("Successfully consumed single-use stream ticket for user: {}", ticket.getUsername());
        return Optional.of(ticket);
    }
}
