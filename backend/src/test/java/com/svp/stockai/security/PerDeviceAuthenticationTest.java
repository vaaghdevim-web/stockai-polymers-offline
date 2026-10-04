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

/**
 * Phase 5 Security Verification: Per-Device IoT Authentication & Registry Tests.
 * Ensures that device credentials cannot be shared, swapped, replayed, or escalated,
 * and that revoked/disabled devices fail closed.
 */
@DisplayName("Per-Device IoT Authentication Security Tests")
class PerDeviceAuthenticationTest {

    private DeviceRegistryService registryService;
    private DeviceAuthenticationFilter filter;

    private static final String EXT_KEY = "test-only-ext01-device-key-for-unit-tests";
    private static final String LOOM_KEY = "KEY-LOOM-01-EDGE-9874";

    @BeforeEach
    void setUp()  throws Exception { 
        SecurityContextHolder.clearContext();
        registryService = new DeviceRegistryService();

        Field saltField = DeviceRegistryService.class.getDeclaredField("salt");
        saltField.setAccessible(true);
        saltField.set(registryService, "test-only-iot-salt-for-unit-tests");

        Field keyField = DeviceRegistryService.class.getDeclaredField("ext01DeviceKey");
        keyField.setAccessible(true);
        keyField.set(registryService, "test-only-ext01-device-key-for-unit-tests");

        registryService.init();
        filter = new DeviceAuthenticationFilter(registryService);
    }

    @Test
    @DisplayName("1. Valid device credential succeeds with ROLE_MACHINE")
    void testValidDeviceCredential_Success() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("DEVICE:EXT-01", auth.getName());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MACHINE")));
        assertEquals(200, response.getStatus());
    }

    @Test
    @DisplayName("2. Invalid device credential rejected with 401")
    void testInvalidDeviceCredential_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", "COMPLETELY-WRONG-KEY");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid, disabled, or revoked"));
    }

    @Test
    @DisplayName("3. Revoked device rejected with 401")
    void testRevokedDevice_Rejected() throws Exception {
        registryService.revokeDevice("EXT-01");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid, disabled, or revoked"));
    }

    @Test
    @DisplayName("4. Disabled device rejected with 401")
    void testDisabledDevice_Rejected() throws Exception {
        registryService.disableDevice("EXT-01");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid, disabled, or revoked"));
    }

    @Test
    @DisplayName("5. Unregistered / wrong device ID rejected with 401")
    void testUnregisteredDeviceId_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "UNKNOWN-DEVICE-999");
        request.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("6. Credential/device mismatch rejected: EXT-01 key used for LOOM-01")
    void testCredentialDeviceMismatch_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "LOOM-01");
        request.addHeader("X-Device-Key", EXT_KEY); // Reusing EXT-01 key
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
    }

    @Test
    @DisplayName("7. Partial device header rejected with 401")
    void testPartialDeviceHeader_Rejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        // missing X-Device-Key
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Both X-Device-Id and X-Device-Key are required"));
    }

    @Test
    @DisplayName("8. Device key rotation allows new key and invalidates old key")
    void testDeviceKeyRotation() throws Exception {
        String newKey = "ROTATED-KEY-EXT-01-2026-XYZ";
        registryService.rotateDeviceKey("EXT-01", newKey);

        // Old key must now fail
        MockHttpServletRequest oldReq = new MockHttpServletRequest();
        oldReq.addHeader("X-Device-Id", "EXT-01");
        oldReq.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse oldResp = new MockHttpServletResponse();
        filter.doFilter(oldReq, oldResp, new MockFilterChain());
        assertEquals(401, oldResp.getStatus());

        // New key must now succeed
        MockHttpServletRequest newReq = new MockHttpServletRequest();
        newReq.addHeader("X-Device-Id", "EXT-01");
        newReq.addHeader("X-Device-Key", newKey);
        MockHttpServletResponse newResp = new MockHttpServletResponse();
        filter.doFilter(newReq, newResp, new MockFilterChain());
        assertEquals(200, newResp.getStatus());
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    @DisplayName("9. Privilege escalation prevention: ROLE_MACHINE has no admin/operator authorities")
    void testPrivilegeEscalationPrevention() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Device-Id", "EXT-01");
        request.addHeader("X-Device-Key", EXT_KEY);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertFalse(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        assertFalse(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPERVISOR")));
        assertFalse(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_OPERATOR")));
        assertEquals(1, auth.getAuthorities().size());
        assertEquals("ROLE_MACHINE", auth.getAuthorities().iterator().next().getAuthority());
    }
}


