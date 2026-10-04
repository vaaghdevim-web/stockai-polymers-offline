package com.svp.stockai.exception;

import com.svp.stockai.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler Unit Tests")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/test");
    }

    @Test
    void handleBadCredentials_returns401() {
        BadCredentialsException ex = new BadCredentialsException("Invalid password");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleBadCredentials(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().getStatus());
        assertEquals("Invalid password", response.getBody().getMessage());
        assertEquals("/api/v1/test", response.getBody().getPath());
    }

    @Test
    void handleUsernameNotFound_returns401() {
        UsernameNotFoundException ex = new UsernameNotFoundException("User not found");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleUsernameNotFound(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().getStatus());
        assertEquals("User not found", response.getBody().getMessage());
    }

    @Test
    void handleAccessDenied_returns403() {
        AccessDeniedException ex = new AccessDeniedException("Access denied");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleAccessDenied(ex, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(403, response.getBody().getStatus());
        assertEquals("Access is denied", response.getBody().getMessage());
    }

    @Test
    void handleResponseStatusException_returnsMatchingStatus() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.NOT_FOUND, "Entity not found");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleResponseStatus(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().getStatus());
        assertEquals("Entity not found", response.getBody().getMessage());
    }

    @Test
    void handleIllegalArgumentException_returns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Bad input");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleIllegalArgument(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertEquals("Bad input", response.getBody().getMessage());
    }

    @Test
    void handleHttpMessageNotReadable_returns400() {
        HttpMessageNotReadableException ex = mock(HttpMessageNotReadableException.class);
        when(ex.getMessage()).thenReturn("Malformed JSON");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleHttpMessageNotReadable(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertEquals("Malformed JSON or invalid request format", response.getBody().getMessage());
    }

    @Test
    void handleIllegalStateException_returns409() {
        IllegalStateException ex = new IllegalStateException("Duplicate entry");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleIllegalState(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().getStatus());
        assertEquals("Duplicate entry", response.getBody().getMessage());
    }

    @Test
    void handleGenericException_returns500WithSanitizedMessage() {
        Exception ex = new RuntimeException("Sensitive database stacktrace or internal details");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGenericException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("An unexpected internal server error occurred", response.getBody().getMessage());
        assertFalse(response.getBody().getMessage().contains("stacktrace"));
    }
}
