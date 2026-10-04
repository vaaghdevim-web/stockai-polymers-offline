package com.svp.stockai.service;

import com.svp.stockai.dto.ActiveMachineResponse;
import com.svp.stockai.entity.Machine;
import com.svp.stockai.entity.ProductionUnit;
import com.svp.stockai.repository.MachineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MachineCacheServiceTest {

    private JacksonJsonRedisSerializer<List<ActiveMachineResponse>> serializer() {
        JsonMapper objectMapper = JsonMapper.builder().build();

        JavaType activeMachinesType = objectMapper.getTypeFactory()
                .constructCollectionType(List.class, ActiveMachineResponse.class);

        return new JacksonJsonRedisSerializer<>(
                objectMapper,
                activeMachinesType
        );
    }

    @Test
    void activeMachinesMapAndUseCacheAnnotation() throws NoSuchMethodException {
        MachineRepository machines = mock(MachineRepository.class);

        when(machines.findByIsActiveTrueAndStatusIn(List.of("Available", "Running")))
                .thenReturn(List.of(
                        Machine.builder()
                                .machineId(7L)
                                .machineCode("EXT-1")
                                .machineName("Extruder")
                                .status("Running")
                                .unit(ProductionUnit.builder().unitId(3L).build())
                                .build()
                ));

        List<ActiveMachineResponse> result =
                new MachineCacheService(machines).activeMachines();

        assertEquals(
                new ActiveMachineResponse(
                        7L,
                        "EXT-1",
                        "Extruder",
                        "Running",
                        3L
                ),
                result.getFirst()
        );

        assertTrue(
                MachineCacheService.class
                        .getMethod("activeMachines")
                        .isAnnotationPresent(Cacheable.class)
        );
    }

    @Test
    void activeMachineListRoundTripsThroughRedisJsonSerializer() {
        JacksonJsonRedisSerializer<List<ActiveMachineResponse>> serializer =
                serializer();

        List<ActiveMachineResponse> responses = List.of(
                new ActiveMachineResponse(
                        7L,
                        "EXT-1",
                        "Extruder",
                        "Running",
                        3L
                ),
                new ActiveMachineResponse(
                        8L,
                        "WEAV-1",
                        "Loom",
                        "Available",
                        4L
                )
        );

        byte[] serialized = serializer.serialize(responses);

        List<ActiveMachineResponse> restored =
                serializer.deserialize(serialized);

        assertInstanceOf(List.class, restored);
        assertEquals(responses, restored);
    }
}