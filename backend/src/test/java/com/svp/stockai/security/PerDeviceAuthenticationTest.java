package com.svp.stockai.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Field;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Per-Device IoT Authentication Security Tests")
class PerDeviceAuthenticationTest {

    private DeviceRegistryService registryService;
    private DeviceAuthenticationFilter filter;

    private String extKey;
    private String loomKey;

    @BeforeEach
    void setUp() throws Exception {
        SecurityContextHolder.clearContext();

        extKey = UUID.randomUUID().toString();
        loomKey = UUID.randomUUID().toString();

        registryService = new DeviceRegistryService();

        Field saltField =
                DeviceRegistryService.class.getDeclaredField("salt");
        saltField.setAccessible(true);
        saltField.set(
                registryService,
                UUID.randomUUID().toString()
        );

        Field keyField =
                DeviceRegistryService.class.getDeclaredField("ext01DeviceKey");
        keyField.setAccessible(true);
        keyField.set(registryService, extKey);

        registryService.init();

        registryService.registerDevice(
                "LOOM-01",
                loomKey,
                "Production Machine LOOM-01",
                DeviceStatus.ACTIVE
        );

        filter = new DeviceAuthenticationFilter(registryService);
    }

    @Test
    @DisplayName("1. Valid device credential succeeds with ROLE_MACHINE")
    void testValidDeviceCredential_Success() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", extKey);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        var auth =
                SecurityContextHolder.getContext().getAuthentication();

        assertNotNull(auth);
        assertEquals("DEVICE:EXT-01", auth.getName());
        assertTrue(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(
                                a -> a.getAuthority()
                                        .equals("ROLE_MACHINE")
                        )
        );
        assertEquals(200, response.getStatus());
    }

    @Test
    @DisplayName("2. Invalid device credential rejected with 401")
    void testInvalidDeviceCredential_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader(
                "X-Device-Key",
                UUID.randomUUID().toString()
        );

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("3. Revoked device rejected with 401")
    void testRevokedDevice_Rejected() throws Exception {
        registryService.revokeDevice("EXT-01");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", extKey);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("4. Disabled device rejected with 401")
    void testDisabledDevice_Rejected() throws Exception {
        registryService.disableDevice("EXT-01");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", extKey);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("5. Unregistered device ID rejected with 401")
    void testUnregisteredDeviceId_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(
                "X-Device-Id",
                "UNKNOWN-DEVICE-" + UUID.randomUUID()
        );
        request.addHeader("X-Device-Key", extKey);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("6. Credential/device mismatch rejected")
    void testCredentialDeviceMismatch_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "LOOM-01");
        request.addHeader("X-Device-Key", extKey);

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("7. Partial device header rejected with 401")
    void testPartialDeviceHeader_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");

        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        assertNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("8. Device key rotation invalidates old credential")
    void testDeviceKeyRotation() throws Exception {
        String newKey = UUID.randomUUID().toString();

        registryService.rotateDeviceKey(
                "EXT-01",
                newKey
        );

        MockHttpServletRequest oldRequest =
                new MockHttpServletRequest();
        oldRequest.addHeader(
                "X-Device-Id",
                "EXT-01"
        );
        oldRequest.addHeader(
                "X-Device-Key",
                extKey
        );

        MockHttpServletResponse oldResponse =
                new MockHttpServletResponse();

        filter.doFilter(
                oldRequest,
                oldResponse,
                new MockFilterChain()
        );

        assertEquals(
                401,
                oldResponse.getStatus()
        );

        SecurityContextHolder.clearContext();

        MockHttpServletRequest newRequest =
                new MockHttpServletRequest();
        newRequest.addHeader(
                "X-Device-Id",
                "EXT-01"
        );
        newRequest.addHeader(
                "X-Device-Key",
                newKey
        );

        MockHttpServletResponse newResponse =
                new MockHttpServletResponse();

        filter.doFilter(
                newRequest,
                newResponse,
                new MockFilterChain()
        );

        assertEquals(
                200,
                newResponse.getStatus()
        );

        assertNotNull(
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
        );
    }

    @Test
    @DisplayName("9. ROLE_MACHINE has no privileged authorities")
    void testPrivilegeEscalationPrevention() throws Exception {
        MockHttpServletRequest request =
                new MockHttpServletRequest();

        request.addHeader(
                "X-Device-Id",
                "EXT-01"
        );
        request.addHeader(
                "X-Device-Key",
                extKey
        );

        MockHttpServletResponse response =
                new MockHttpServletResponse();

        filter.doFilter(
                request,
                response,
                new MockFilterChain()
        );

        var auth =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        assertNotNull(auth);

        assertFalse(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(
                                a -> a.getAuthority()
                                        .equals("ROLE_ADMIN")
                        )
        );

        assertFalse(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(
                                a -> a.getAuthority()
                                        .equals("ROLE_SUPERVISOR")
                        )
        );

        assertFalse(
                auth.getAuthorities()
                        .stream()
                        .anyMatch(
                                a -> a.getAuthority()
                                        .equals("ROLE_OPERATOR")
                        )
        );

        assertEquals(
                1,
                auth.getAuthorities().size()
        );

        assertEquals(
                "ROLE_MACHINE",
                auth.getAuthorities()
                        .iterator()
                        .next()
                        .getAuthority()
        );
    }
}