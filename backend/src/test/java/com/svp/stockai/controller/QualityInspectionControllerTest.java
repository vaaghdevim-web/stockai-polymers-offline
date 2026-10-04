package com.svp.stockai.controller;

import com.svp.stockai.dto.QualityInspectionItemResponse;
import com.svp.stockai.dto.QualityInspectionResponse;
import com.svp.stockai.service.QualityInspectionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(QualityInspectionController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class QualityInspectionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private QualityInspectionService qualityInspectionService;

    @Test
    @DisplayName("POST /api/v1/qc/inspections returns 201 Created")
    void recordInspection_Returns201() throws Exception {
        QualityInspectionResponse response = QualityInspectionResponse.builder()
                .inspectionId(1L)
                .inspectionType("Incoming")
                .materialBatchId(10L)
                .materialBatchNo("MB-2026-PP-001")
                .status("Pass")
                .inspectionDate(OffsetDateTime.now())
                .items(List.of(
                        QualityInspectionItemResponse.builder()
                                .qiId(1L)
                                .parameterName("Melt Flow Index")
                                .observedValue(new BigDecimal("3.20"))
                                .result("Pass")
                                .build()
                ))
                .build();

        when(qualityInspectionService.recordInspection(any(), any())).thenReturn(response);

        String payload = """
                {
                    "inspectionType": "Incoming",
                    "materialBatchId": 10,
                    "items": [
                        {
                            "parameterName": "Melt Flow Index",
                            "observedValue": 3.20
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/v1/qc/inspections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inspectionId").value(1))
                .andExpect(jsonPath("$.status").value("Pass"))
                .andExpect(jsonPath("$.materialBatchNo").value("MB-2026-PP-001"));
    }

    @Test
    @DisplayName("GET /api/v1/qc/inspections/{id} returns 200 OK")
    void getInspectionById_Returns200() throws Exception {
        QualityInspectionResponse response = QualityInspectionResponse.builder()
                .inspectionId(5L)
                .inspectionType("Final")
                .status("Pass")
                .build();

        when(qualityInspectionService.getInspectionById(5L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/qc/inspections/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inspectionId").value(5))
                .andExpect(jsonPath("$.status").value("Pass"));
    }
}
