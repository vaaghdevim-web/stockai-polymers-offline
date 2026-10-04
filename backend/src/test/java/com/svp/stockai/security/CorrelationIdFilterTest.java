package com.svp.stockai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CorrelationIdFilter Distributed Tracing Unit Tests")
class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
        MDC.clear();
    }

    @Test
    @DisplayName("Preserves existing X-Correlation-ID header and propagates to MDC and response")
    void testExistingCorrelationIdPreserved() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Correlation-ID", "REQ-TEST-12345");
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcCaptured = new AtomicReference<>();

        FilterChain chain = (req, res) -> {
            mdcCaptured.set(MDC.get("correlationId"));
        };

        filter.doFilterInternal(request, response, chain);

        assertEquals("REQ-TEST-12345", mdcCaptured.get());
        assertEquals("REQ-TEST-12345", response.getHeader("X-Correlation-ID"));
        assertNull(MDC.get("correlationId"), "MDC must be cleared after request completion");
    }

    @Test
    @DisplayName("Generates new UUID correlation ID when header is missing")
    void testGeneratesNewCorrelationIdWhenMissing() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        AtomicReference<String> mdcCaptured = new AtomicReference<>();

        FilterChain chain = (req, res) -> {
            mdcCaptured.set(MDC.get("correlationId"));
        };

        filter.doFilterInternal(request, response, chain);

        assertNotNull(mdcCaptured.get());
        assertFalse(mdcCaptured.get().isBlank());
        assertEquals(mdcCaptured.get(), response.getHeader("X-Correlation-ID"));
        assertNull(MDC.get("correlationId"));
    }
}
