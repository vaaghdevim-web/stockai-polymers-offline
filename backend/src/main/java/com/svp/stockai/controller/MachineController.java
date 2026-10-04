package com.svp.stockai.controller;

import com.svp.stockai.dto.ActiveMachineResponse;
import com.svp.stockai.entity.Machine;
import com.svp.stockai.repository.MachineRepository;
import com.svp.stockai.service.MachineCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/machines")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('OPERATOR', 'SUPERVISOR', 'ADMIN', 'MANAGER')")
public class MachineController {
    private final MachineCacheService machineCacheService;
    private final MachineRepository machineRepository;

    @GetMapping("/active")
    public List<ActiveMachineResponse> activeMachines() {
        return machineCacheService.activeMachines();
    }

    @GetMapping
    public List<ActiveMachineResponse> allMachines() {
        return machineRepository.findAll().stream()
                .map(m -> new ActiveMachineResponse(m.getMachineId(), m.getMachineCode(),
                        m.getMachineName(), m.getStatus(),
                        m.getUnit() != null ? m.getUnit().getUnitId() : null))
                .toList();
    }

    @GetMapping("/{id}")
    public ActiveMachineResponse getMachineById(@PathVariable Long id) {
        Machine m = machineRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Machine not found with ID: " + id));
        return new ActiveMachineResponse(m.getMachineId(), m.getMachineCode(),
                m.getMachineName(), m.getStatus(),
                m.getUnit() != null ? m.getUnit().getUnitId() : null);
    }
}
