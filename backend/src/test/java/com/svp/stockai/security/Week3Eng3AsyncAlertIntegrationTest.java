package com.svp.stockai.security;

import com.svp.stockai.dto.AlertAcceptedResponse;
import com.svp.stockai.dto.AlertRequest;
import com.svp.stockai.dto.AlertSeverity;
import com.svp.stockai.entity.AppUser;
import com.svp.stockai.service.AlertService;
import com.svp.stockai.service.AsyncAlertWorker;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = true)
@ActiveProfiles("test")
class Week3Eng3AsyncAlertIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AlertService alertService;

    @Autowired
    private AsyncAlertWorker asyncAlertWorker;

    @Autowired
    @Qualifier("alertTaskExecutor")
    private Executor alertTaskExecutor;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void unauthenticatedAccess_isRejectedOnAlertAsyncEndpoint() throws Exception {
        String json = """
                {
                    "alertType": "LINE_STOP",
                    "severity": "CRITICAL",
                    "message": "Extruder stopped unexpectedly"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    @Test
    void nonPermittedRole_isForbiddenOnAlertAsyncEndpoint() throws Exception {
        String token = jwtService.generateToken("viewer01", 2L, List.of("VIEWER"));
        AppUser viewerUser = AppUser.builder().userId(2L).userName("viewer01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("viewer01")).thenReturn(viewerUser);
        when(customUserDetailsService.loadAuthorities(viewerUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_VIEWER")));

        String json = """
                {
                    "alertType": "LINE_STOP",
                    "severity": "CRITICAL",
                    "message": "Extruder stopped unexpectedly"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isForbidden());
    }

    @Test
    void operatorAccess_isAllowedOnAlertAsyncEndpoint_andReturns202() throws Exception {
        String token = jwtService.generateToken("operator01", 1L, List.of("OPERATOR"));
        AppUser operatorUser = AppUser.builder().userId(1L).userName("operator01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("operator01")).thenReturn(operatorUser);
        when(customUserDetailsService.loadAuthorities(operatorUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_OPERATOR")));

        String json = """
                {
                    "alertType": "TEMPERATURE_EXCEEDED",
                    "severity": "HIGH",
                    "message": "Extrusion barrel zone 4 temperature threshold breached (255C)",
                    "sourceType": "MACHINE",
                    "sourceId": "EXT-01",
                    "machineId": 1
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.message").value("Alert accepted for background processing"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void adminAccess_isAllowedOnAlertAsyncEndpoint_andReturns202() throws Exception {
        String token = jwtService.generateToken("admin01", 99L, List.of("ADMIN"));
        AppUser adminUser = AppUser.builder().userId(99L).userName("admin01").isActive(true).build();

        when(customUserDetailsService.loadActiveUser("admin01")).thenReturn(adminUser);
        when(customUserDetailsService.loadAuthorities(adminUser))
                .thenReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        String json = """
                {
                    "alertType": "POWER_SURGE",
                    "severity": "CRITICAL",
                    "message": "Power surge detected on main feeder line",
                    "sourceType": "FACILITY",
                    "sourceId": "GRID-MAIN"
                }
                """;

        mockMvc.perform(post("/api/v1/alerts/async")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("ACCEPTED"))
                .andExpect(jsonPath("$.message").value("Alert accepted for background processing"))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    void alertTaskExecutor_isProperlyConfiguredWithWorkerThreadPrefix() {
        assertNotNull(alertTaskExecutor);
        assertInstanceOf(ThreadPoolTaskExecutor.class, alertTaskExecutor);

        ThreadPoolTaskExecutor threadPool = (ThreadPoolTaskExecutor) alertTaskExecutor;
        assertEquals(4, threadPool.getCorePoolSize());
        assertEquals(8, threadPool.getMaxPoolSize());
        assertEquals(100, threadPool.getQueueCapacity());
        assertEquals("alert-worker-", threadPool.getThreadNamePrefix());
    }

    @Test
    void asyncExecution_runsOnDedicatedAlertWorkerThread() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> workerThreadName = new AtomicReference<>();

        // Submit task to alertTaskExecutor to verify thread naming
        alertTaskExecutor.execute(() -> {
            workerThreadName.set(Thread.currentThread().getName());
            latch.countDown();
        });

        boolean completed = latch.await(5, TimeUnit.SECONDS);
        assertTrue(completed, "Task should complete within timeout");
        assertNotNull(workerThreadName.get());
        assertTrue(workerThreadName.get().startsWith("alert-worker-"),
                "Thread name should start with 'alert-worker-', but was: " + workerThreadName.get());
    }

    @Test
    void alertServiceSubmit_returnsImmediatelyAndProcessesAsync() {
        AlertRequest request = AlertRequest.builder()
                .alertType("PRESSURE_HIGH")
                .severity(AlertSeverity.MEDIUM)
                .message("Hydraulic pressure at 180 bar")
                .sourceType("MACHINE")
                .sourceId("HYD-01")
                .build();

        AlertAcceptedResponse response = alertService.submitAlert(request);

        assertNotNull(response);
        assertEquals("ACCEPTED", response.getStatus());
        assertNotNull(response.getCorrelationId());
    }
}

