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

@Slf4j
@Service
public class DeviceRegistryService {

    private final Map<String, DeviceCredential> registry = new ConcurrentHashMap<>();

    /**
     * Device credentials must come from runtime configuration.
     * There is deliberately no hard-coded production fallback.
     */
    @Value("${IOT_DEVICE_SALT:${stockai.iot.device-salt:}}")
    private String salt;

    /**
     * Primary EXT-01 credential. Additional devices can be supplied through
     * IOT_DEVICE_KEYS as comma-separated DEVICE_ID=SECRET entries.
     */
    @Value("${IOT_DEVICE_KEY:${stockai.iot.device-key:}}")
    private String ext01DeviceKey;

    @Value("${IOT_DEVICE_KEYS:}")
    private String configuredDeviceKeys;

    @PostConstruct
    public void init() {

        if (salt == null || salt.isBlank()) {
            log.warn("IoT device registry salt is not configured. Device authentication remains fail-closed.");
            return;
        }

        int registered = 0;

        // Primary EXT-01 machine.
        if (ext01DeviceKey != null && !ext01DeviceKey.isBlank()) {
            registerDevice(
                    "EXT-01",
                    ext01DeviceKey,
                    "Production Machine EXT-01",
                    DeviceStatus.ACTIVE
            );
            registered++;
        } else {
            log.warn("Skipping IoT device EXT-01 because no runtime credential is configured.");
        }

        // Optional additional device credentials.
        if (configuredDeviceKeys != null && !configuredDeviceKeys.isBlank()) {
            for (String entry : configuredDeviceKeys.split(",")) {
                String item = entry.trim();

                if (item.isBlank()) {
                    continue;
                }

                int separator = item.indexOf('=');

                if (separator <= 0 || separator == item.length() - 1) {
                    log.warn("Ignoring malformed IOT_DEVICE_KEYS entry.");
                    continue;
                }

                String deviceId = item.substring(0, separator).trim();
                String deviceKey = item.substring(separator + 1).trim();

                if (deviceId.isBlank() || deviceKey.isBlank()) {
                    log.warn("Ignoring IOT_DEVICE_KEYS entry with blank device ID or credential.");
                    continue;
                }

                // Avoid accidental duplicate registration of EXT-01.
                if ("EXT-01".equalsIgnoreCase(deviceId)) {
                    continue;
                }

                registerDevice(
                        deviceId,
                        deviceKey,
                        "Production Machine " + deviceId,
                        DeviceStatus.ACTIVE
                );

                registered++;
            }
        }

        log.info(
                "Initialized IoT Device Registry with {} runtime-configured machines.",
                registered
        );
    }

    public void registerDevice(
            String deviceId,
            String deviceKey,
            String deviceName,
            DeviceStatus status) {

        if (deviceId == null
                || deviceId.isBlank()
                || deviceKey == null
                || deviceKey.isBlank()) {
            throw new IllegalArgumentException(
                    "Device ID and device key must not be blank"
            );
        }

        String normalizedId = deviceId.trim().toUpperCase();
        String hashed = hashKey(normalizedId, deviceKey.trim());

        DeviceCredential credential = DeviceCredential.builder()
                .deviceId(normalizedId)
                .deviceName(
                        deviceName != null && !deviceName.isBlank()
                                ? deviceName
                                : normalizedId
                )
                .hashedKey(hashed)
                .status(
                        status != null
                                ? status
                                : DeviceStatus.ACTIVE
                )
                .registeredAt(Instant.now())
                .lastRotatedAt(Instant.now())
                .build();

        registry.put(normalizedId, credential);

        log.debug(
                "Registered IoT device: id={}, status={}",
                normalizedId,
                credential.getStatus()
        );
    }

    public boolean authenticateDevice(
            String deviceId,
            String deviceKey) {

        if (deviceId == null
                || deviceId.isBlank()
                || deviceKey == null
                || deviceKey.isBlank()) {
            return false;
        }

        String normalizedId = deviceId.trim().toUpperCase();

        DeviceCredential credential = registry.get(normalizedId);

        if (credential == null) {
            log.warn(
                    "IoT Device authentication failed: unregistered device ID {}",
                    normalizedId
            );
            return false;
        }

        if (credential.getStatus() != DeviceStatus.ACTIVE) {
            log.warn(
                    "IoT Device authentication rejected: device ID {} has status {}",
                    normalizedId,
                    credential.getStatus()
            );
            return false;
        }

        String presentedHash =
                hashKey(normalizedId, deviceKey.trim());

        boolean matched = MessageDigest.isEqual(
                credential.getHashedKey().getBytes(StandardCharsets.UTF_8),
                presentedHash.getBytes(StandardCharsets.UTF_8)
        );

        if (!matched) {
            log.warn(
                    "IoT Device authentication failed: invalid credential for device ID {}",
                    normalizedId
            );
        }

        return matched;
    }

    public void revokeDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential credential =
                    registry.get(deviceId.trim().toUpperCase());

            if (credential != null) {
                credential.setStatus(DeviceStatus.REVOKED);

                log.info(
                        "IoT Device ID {} has been REVOKED",
                        deviceId
                );
            }
        }
    }

    public void disableDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential credential =
                    registry.get(deviceId.trim().toUpperCase());

            if (credential != null) {
                credential.setStatus(DeviceStatus.DISABLED);

                log.info(
                        "IoT Device ID {} has been DISABLED",
                        deviceId
                );
            }
        }
    }

    public void activateDevice(String deviceId) {
        if (deviceId != null) {
            DeviceCredential credential =
                    registry.get(deviceId.trim().toUpperCase());

            if (credential != null) {
                credential.setStatus(DeviceStatus.ACTIVE);

                log.info(
                        "IoT Device ID {} has been ACTIVATED",
                        deviceId
                );
            }
        }
    }

    public void rotateDeviceKey(
            String deviceId,
            String newDeviceKey) {

        if (deviceId == null
                || deviceId.isBlank()
                || newDeviceKey == null
                || newDeviceKey.isBlank()) {
            throw new IllegalArgumentException(
                    "Device ID and new device key must not be blank"
            );
        }

        String normalizedId = deviceId.trim().toUpperCase();

        DeviceCredential credential = registry.get(normalizedId);

        if (credential == null) {
            throw new IllegalArgumentException(
                    "Device not found: " + deviceId
            );
        }

        credential.setHashedKey(
                hashKey(normalizedId, newDeviceKey.trim())
        );

        credential.setLastRotatedAt(Instant.now());

        log.info(
                "Rotated key for IoT device ID {}",
                normalizedId
        );
    }

    public Optional<DeviceCredential> getDevice(String deviceId) {
        if (deviceId == null) {
            return Optional.empty();
        }

        return Optional.ofNullable(
                registry.get(deviceId.trim().toUpperCase())
        );
    }

    private String hashKey(
            String deviceId,
            String deviceKey) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            String composite =
                    deviceId + ":" + salt + ":" + deviceKey;

            byte[] hash =
                    digest.digest(
                            composite.getBytes(StandardCharsets.UTF_8)
                    );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256 digest unavailable",
                    e
            );
        }
    }
}