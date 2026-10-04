package com.svp.stockai.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceCredential {
    private String deviceId;
    private String deviceName;
    private String hashedKey;
    private DeviceStatus status;
    private Instant registeredAt;
    private Instant lastRotatedAt;
}
