package com.svp.stockai.security;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe token revocation and blacklist service.
 * Prevents reuse of logged-out or invalidated JWT tokens.
 */
@Service
public class TokenRevocationService {

    private final Set<String> revokedTokens = ConcurrentHashMap.newKeySet();

    public void revoke(String token) {
        if (token != null && !token.isBlank()) {
            revokedTokens.add(token.trim());
        }
    }

    public boolean isRevoked(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return revokedTokens.contains(token.trim());
    }

    public void clear() {
        revokedTokens.clear();
    }
}
