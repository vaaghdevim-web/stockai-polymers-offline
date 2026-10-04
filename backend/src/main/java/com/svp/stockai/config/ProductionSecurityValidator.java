package com.svp.stockai.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Startup validator ensuring production environments do not launch with
 * hardcoded, default, or weak secrets.
 */
@Slf4j
@Component
public class ProductionSecurityValidator {

    public static final String INSECURE_DEFAULT_JWT_KEY =
            "SVP_STOCKAI_SUPER_SECRET_KEY_FOR_JWT_SECURITY_2026_PRODUCTION_OVERRIDE_KEY";
    public static final String INSECURE_DEFAULT_REDIS_PASSWORD =
            "stockai-secure-redis-2026";

    private final Environment environment;
    private final String jwtSecret;
    private final String dbPassword;
    private final String redisPassword;

    public ProductionSecurityValidator(
            Environment environment,
            String jwtSecret,
            String dbPassword) {
        this(environment, jwtSecret, dbPassword, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ProductionSecurityValidator(
            Environment environment,
            @Value("${jwt.secret:}") String jwtSecret,
            @Value("${spring.datasource.password:}") String dbPassword,
            @Value("${spring.data.redis.password:}") String redisPassword) {
        this.environment = environment;
        this.jwtSecret = jwtSecret;
        this.dbPassword = dbPassword;
        this.redisPassword = redisPassword;
    }

    @PostConstruct
    public void validateProductionSecurity() {
        boolean isProduction = environment.matchesProfiles("prod", "production");

        if (isProduction) {
            log.info("Validating production environment security configuration...");

            // 1. Enforce strong, non-default JWT Secret in production
            if (jwtSecret == null || jwtSecret.isBlank()) {
                throw new IllegalStateException("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing or blank in production profile.");
            }

            if (jwtSecret.equals(INSECURE_DEFAULT_JWT_KEY)) {
                throw new IllegalStateException("CRITICAL SECURITY ERROR: Insecure default placeholder JWT_SECRET detected in production! "
                        + "A cryptographically strong, unique 256-bit secret must be configured via environment variables or secret manager.");
            }

            if (jwtSecret.length() < 32) {
                throw new IllegalStateException("CRITICAL SECURITY ERROR: JWT_SECRET in production must be at least 256 bits (32 characters) long.");
            }

            // 2. Validate database password
            if (dbPassword == null || dbPassword.isBlank() || "postgres".equalsIgnoreCase(dbPassword.trim())) {
                log.warn("PRODUCTION SECURITY WARNING: Database password appears to be default or blank. Ensure strong credentials are used.");
            }

            // 3. Enforce strong, non-default Redis password in production
            if (redisPassword != null && !redisPassword.isBlank()) {
                if (INSECURE_DEFAULT_REDIS_PASSWORD.equals(redisPassword.trim())) {
                    throw new IllegalStateException("CRITICAL SECURITY ERROR: Insecure default placeholder REDIS_PASSWORD detected in production! "
                            + "A strong, unique password must be configured via environment variables.");
                }
            }

            log.info("Production security configuration passed validation successfully.");
        }
    }
}
