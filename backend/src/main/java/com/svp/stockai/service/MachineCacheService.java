package com.svp.stockai.service;

import com.svp.stockai.dto.ActiveMachineResponse;
import com.svp.stockai.repository.MachineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MachineCacheService {
    private final MachineRepository machineRepository;

    @Cacheable(cacheNames = "active-machines", key = "'running-and-available'")
    public List<ActiveMachineResponse> activeMachines() {
        return machineRepository.findByIsActiveTrueAndStatusIn(List.of("Available", "Running")).stream()
                .map(machine -> new ActiveMachineResponse(machine.getMachineId(), machine.getMachineCode(),
                        machine.getMachineName(), machine.getStatus(), machine.getUnit().getUnitId())).toList();
    }
}
