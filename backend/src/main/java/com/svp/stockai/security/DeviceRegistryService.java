package com.svp.stockai.security;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registry and lifecycle manager for Industrial IoT Machine & Gateway credentials.
 * Enforces per-device credentials cryptographically bound to specific Device IDs,
 * with state management (ACTIVE, DISABLED, REVOKED) and rotation capabilities.
 */
@Slf4j
@Service
public class DeviceRegistryService {

    private final Map<String, DeviceCredential> registry = new ConcurrentHashMap<>();

    @Value("${IOT_DEVICE_SALT}")
    private String salt;

    @Value("${IOT_DEVICE_KEY}")
    private String ext01DeviceKey;
    @PostConstruct
    public void init() {
        // Pre-register standard plant industrial devices with individual unique credentials
        String[] defaultDevices = {
                "EXT-01", "LOOM-01", "WIND-01", "CIRC-01",
                "BCONV-01", "AUTO-SEW-01", "LAMIN-01", "RECYCLE-01"
        };

        for (String devId : defaultDevices) {
            String initialKey = devId.equals("EXT-01") ? ext01DeviceKey : "KEY-" + devId + "-EDGE-9874";
            registerDevice(devId, initialKey, "Production Machine " + devId, DeviceStatus.ACTIVE);
        }
        log.info("Initialized IoT Device Registry with {} pre-registered machines.", defaultDevices.length);
    }

    public void registerDevice(String deviceId, String rawKey, String deviceName, DeviceStatus status) {
        if (deviceId == null || deviceId.isBlank() || rawKey == null || rawKey.isBlank()) {
            throw new IllegalArgumentException("Device ID and Raw Key must not be blank");
        }
        String normalizedId = deviceId.trim().toUpperCase();
        String hashed = hashKey(normalizedId, rawKey.trim());
        DeviceCredential credential = DeviceCredential.builder()
                .deviceId(normalizedId)
                .deviceName(deviceName != null ? deviceName : normalizedId)
                .hashedKey(hashed)
                .status(status != null ? status : DeviceStatus.ACTIVE)
                .registeredAt(Instant.now())
                .lastRotatedAt(Instant.now())
                .build();
        registry.put(normalizedId, credential);
        log.debug("Registered IoT device: id={}, status={}", normalizedId, credential.getStatus());
    }

    public boolean authenticateDevice(String deviceId, String rawKey) {
        if (deviceId == null || deviceId.isBlank() || rawKey == null || rawKey.isBlank()) {
            return false;
        }
        String normalizedId = deviceId.trim().toUpperCase();
        DeviceCredential cred = registry.get(normalizedId);
        if (cred == null) {
            log.warn("IoT Device authentication failed: unregistered device ID {}", normalizedId);
            return false;
        }

        if (cred.getStatus() != DeviceStatus.ACTIVE) {
            log.warn("IoT Device authentication rejected: device ID {} has status {}", normalizedId, cred.getStatus());
            return false;
        }

        String presentedHash = hashKey(normalizedId, rawKey.trim());
        boolean matched = MessageDigest.isEqual(
                cred.getHashedKey().getBytes(StandardCharsets.UTF_8),
                presentedHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matched) {
            log.warn("IoT Device authentication failed: invalid credential for device ID {}", normalizedId);
        }
        return matched;
    }

    public void revokeDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential cred = registry.get(deviceId.trim().toUpperCase());
            if (cred != null) {
                cred.setStatus(DeviceStatus.REVOKED);
                log.info("IoT Device ID {} has been REVOKED", deviceId);
            }
        }
    }

    public void disableDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential cred = registry.get(deviceId.trim().toUpperCase());
            if (cred != null) {
                cred.setStatus(DeviceStatus.DISABLED);
                log.info("IoT Device ID {} has been DISABLED", deviceId);
            }
        }
    }

    public void activateDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential cred = registry.get(deviceId.trim().toUpperCase());
            if (cred != null) {
                cred.setStatus(DeviceStatus.ACTIVE);
                log.info("IoT Device ID {} has been ACTIVATED", deviceId);
            }
        }
    }

    public void rotateDeviceKey(String deviceId, String newRawKey) {
        if (deviceId == null || newRawKey == null || newRawKey.isBlank()) {
            throw new IllegalArgumentException("Device ID and new key must not be blank");
        }
        String normalizedId = deviceId.trim().toUpperCase();
        DeviceCredential cred = registry.get(normalizedId);
        if (cred == null) {
            throw new IllegalArgumentException("Device not found: " + deviceId);
        }
        cred.setHashedKey(hashKey(normalizedId, newRawKey.trim()));
        cred.setLastRotatedAt(Instant.now());
        log.info("Rotated key for IoT device ID {}", normalizedId);
    }

    public Optional<DeviceCredential> getDevice(String deviceId) {
        if (deviceId == null) return Optional.empty();
        return Optional.ofNullable(registry.get(deviceId.trim().toUpperCase()));
    }

    private String hashKey(String deviceId, String rawKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            // Cryptographically bind the deviceId, salt, and raw key
            String composite = deviceId + ":" + salt + ":" + rawKey;
            byte[] hash = digest.digest(composite.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest unavailable", e);
        }
    }
}
