package com.svp.stockai.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("DeviceAuthenticationFilter Unit Tests")
class DeviceAuthenticationFilterTest {

    private static final String VALID_KEY =
            "test-only-ext01-device-key-for-unit-tests";

    private DeviceRegistryService registryService;
    private DeviceAuthenticationFilter filter;

    @BeforeEach
    void setUp() throws Exception {
        SecurityContextHolder.clearContext();

        registryService = new DeviceRegistryService();

        Field saltField =
                DeviceRegistryService.class.getDeclaredField("salt");
        saltField.setAccessible(true);
        saltField.set(
                registryService,
                "test-only-iot-salt-for-unit-tests"
        );

        Field keyField =
                DeviceRegistryService.class.getDeclaredField("ext01DeviceKey");
        keyField.setAccessible(true);
        keyField.set(
                registryService,
                "test-only-ext01-device-key-for-unit-tests"
        );

        registryService.init();

        filter = new DeviceAuthenticationFilter(registryService);
    }

    @Test
    @DisplayName("Should authenticate valid device headers with ROLE_MACHINE only (least privilege)")
    void testValidDeviceCredentials_Authenticates() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", VALID_KEY);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        var auth =
                SecurityContextHolder.getContext().getAuthentication();

        assertNotNull(
                auth,
                "Authentication should be established"
        );

        assertEquals(
                "DEVICE:EXT-01",
                auth.getName()
        );

        assertTrue(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(a ->
                                a.getAuthority()
                                        .equals("ROLE_MACHINE")
                        )
        );

        assertFalse(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(a ->
                                a.getAuthority()
                                        .equals("ROLE_OPERATOR")
                        )
        );

        assertEquals(
                200,
                response.getStatus()
        );
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for invalid device key")
    void testInvalidDeviceCredentials_Rejects401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", "WRONG-KEY");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(
                SecurityContextHolder.getContext().getAuthentication()
        );

        assertEquals(
                401,
                response.getStatus()
        );

        assertTrue(
                response.getContentAsString()
                        .contains(
                                "Invalid, disabled, or revoked machine device credentials"
                        )
        );
    }

    @Test
    @DisplayName("Should pass through if machine headers are absent")
    void testNoHeaders_PassesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(
                SecurityContextHolder.getContext().getAuthentication()
        );

        assertEquals(
                200,
                response.getStatus()
        );
    }
}
