package com.svp.stockai.dto;

public record ActiveMachineResponse(Long machineId, String machineCode, String machineName,
                                    String status, Long unitId) {
}
