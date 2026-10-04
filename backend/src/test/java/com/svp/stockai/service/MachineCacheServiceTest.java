package com.svp.stockai.service;

import com.svp.stockai.dto.ActiveMachineResponse;
import com.svp.stockai.entity.Machine;
import com.svp.stockai.entity.ProductionUnit;
import com.svp.stockai.repository.MachineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MachineCacheServiceTest {

    @Test
    void activeMachinesMapAndUseCacheAnnotation() throws NoSuchMethodException {
        MachineRepository machines = mock(MachineRepository.class);
        when(machines.findByIsActiveTrueAndStatusIn(List.of("Available", "Running"))).thenReturn(List.of(
                Machine.builder().machineId(7L).machineCode("EXT-1").machineName("Extruder")
                        .status("Running").unit(ProductionUnit.builder().unitId(3L).build()).build()));

        List<ActiveMachineResponse> result = new MachineCacheService(machines).activeMachines();

        assertEquals(new ActiveMachineResponse(7L, "EXT-1", "Extruder", "Running", 3L), result.getFirst());
        assertTrue(MachineCacheService.class.getMethod("activeMachines").isAnnotationPresent(Cacheable.class));
    }

    @Test
    void activeMachineResponseRoundTripsThroughRedisJsonSerializer() {
        GenericJacksonJsonRedisSerializer serializer = GenericJacksonJsonRedisSerializer.builder()
                .enableDefaultTyping(BasicPolymorphicTypeValidator.builder()
                        .allowIfSubType("com.svp.stockai.dto")
                        .allowIfSubType("java.util")
                        .build())
                .build();
        ActiveMachineResponse response = new ActiveMachineResponse(7L, "EXT-1", "Extruder", "Running", 3L);

        Object restored = serializer.deserialize(serializer.serialize(response));

        assertEquals(response, restored);
    }
}
