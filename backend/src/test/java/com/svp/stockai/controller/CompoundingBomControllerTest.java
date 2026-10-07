package com.svp.stockai.controller;

import com.svp.stockai.dto.*;
import com.svp.stockai.service.CompoundingBomService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CompoundingBomController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class CompoundingBomControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompoundingBomService compoundingBomService;

    @Test
    void createBom_returns201AndBomDetails() throws Exception {
        CompoundingBomResponse response = CompoundingBomResponse.builder()
                .compoundingBomId(1L)
                .bomCode("BOM-SVP-01")
                .version("1.0")
                .targetBatchWeightKg(new BigDecimal("1000.0000"))
                .status("Draft")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .items(List.of(
                        CompoundingBomItemResponse.builder()
                                .compoundingBomItemId(10L)
                                .materialId(1L)
                                .materialCode("RM-PP-1030RG")
                                .materialName("Raffia 1030RG")
                                .percentage(new BigDecimal("85.0000"))
                                .targetQuantityKg(new BigDecimal("850.0000"))
                                .isRequired(true)
                                .build()
                ))
                .build();

        when(compoundingBomService.createBom(any(), any())).thenReturn(response);

        String jsonPayload = """
                {
                    "bomCode": "BOM-SVP-01",
                    "version": "1.0",
                    "targetBatchWeightKg": 1000.0000,
                    "items": [
                        { "materialId": 1, "percentage": 85.0000, "isRequired": true },
                        { "materialId": 2, "percentage": 15.0000, "isRequired": true }
                    ]
                }
                """;

        mockMvc.perform(post("/api/v1/factory/compounding/boms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.compoundingBomId").value(1))
                .andExpect(jsonPath("$.bomCode").value("BOM-SVP-01"))
                .andExpect(jsonPath("$.status").value("Draft"))
                .andExpect(jsonPath("$.items[0].materialCode").value("RM-PP-1030RG"))
                .andExpect(jsonPath("$.items[0].targetQuantityKg").value(850.0));
    }

    @Test
    void createBom_rejectsInvalidJson_returns400() throws Exception {
        String invalidPayload = """
                {
                    "bomCode": "",
                    "version": "",
                    "targetBatchWeightKg": 0,
                    "items": []
                }
                """;

        mockMvc.perform(post("/api/v1/factory/compounding/boms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getById_returns200AndBomDetails() throws Exception {
        CompoundingBomResponse response = CompoundingBomResponse.builder()
                .compoundingBomId(1L)
                .bomCode("BOM-SVP-01")
                .version("1.0")
                .status("Active")
                .items(List.of())
                .build();

        when(compoundingBomService.getBomById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/factory/compounding/boms/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.compoundingBomId").value(1))
                .andExpect(jsonPath("$.status").value("Active"));
    }

    @Test
    void activateBom_returns200AndUpdatedStatus() throws Exception {
        CompoundingBomResponse response = CompoundingBomResponse.builder()
                .compoundingBomId(1L)
                .bomCode("BOM-SVP-01")
                .version("1.0")
                .status("Active")
                .items(List.of())
                .build();

        when(compoundingBomService.activateBom(1L)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/factory/compounding/boms/1/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("Active"));
    }

    @Test
    void calculateRequirements_returns200AndCalculatedWeights() throws Exception {
        BatchRequirementCalculationResponse response = BatchRequirementCalculationResponse.builder()
                .compoundingBomId(1L)
                .bomCode("BOM-SVP-01")
                .version("1.0")
                .desiredBatchWeightKg(new BigDecimal("500.0000"))
                .calculatedRequirements(List.of(
                        BatchRequirementCalculationResponse.CalculatedItemRequirement.builder()
                                .materialId(1L)
                                .materialCode("RM-PP-1030RG")
                                .materialName("Raffia 1030RG")
                                .percentage(new BigDecimal("85.0000"))
                                .requiredQuantityKg(new BigDecimal("425.0000"))
                                .isRequired(true)
                                .build()
                ))
                .build();

        when(compoundingBomService.calculateBatchRequirements(eq(1L), any())).thenReturn(response);

        mockMvc.perform(get("/api/v1/factory/compounding/boms/1/calculate-requirements")
                        .param("batchWeightKg", "500.0000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.desiredBatchWeightKg").value(500.0))
                .andExpect(jsonPath("$.calculatedRequirements[0].requiredQuantityKg").value(425.0));
    }

    @Test
    void updateBom_returns200AndUpdatedBom() throws Exception {
        CompoundingBomResponse response = CompoundingBomResponse.builder()
                .compoundingBomId(1L)
                .bomCode("BOM-SVP-01")
                .version("1.1")
                .targetBatchWeightKg(new BigDecimal("1200.0000"))
                .status("Draft")
                .build();

        when(compoundingBomService.updateBom(eq(1L), any(), any())).thenReturn(response);

        String jsonPayload = """
                {
                    "bomCode": "BOM-SVP-01",
                    "version": "1.1",
                    "targetBatchWeightKg": 1200.0000,
                    "items": [
                        {
                            "materialId": 1,
                            "percentage": 100.0000,
                            "isRequired": true
                        }
                    ]
                }
                """;

        mockMvc.perform(put("/api/v1/factory/compounding/boms/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.compoundingBomId").value(1))
                .andExpect(jsonPath("$.version").value("1.1"));
    }
}
