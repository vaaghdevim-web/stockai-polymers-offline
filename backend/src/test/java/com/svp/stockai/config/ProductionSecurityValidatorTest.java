package com.svp.stockai.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ProductionSecurityValidator Unit Tests")
class ProductionSecurityValidatorTest {

    @Test
    @DisplayName("Non-production profiles should pass validation even with default secret")
    void testNonProduction_PassesWithDefaultSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("local");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                env,
                ProductionSecurityValidator.INSECURE_DEFAULT_JWT_KEY,
                "postgres"
        );

        assertDoesNotThrow(validator::validateProductionSecurity);
    }

    @Test
    @DisplayName("Production profile with default insecure secret must throw IllegalStateException")
    void testProduction_ThrowsOnDefaultSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                env,
                ProductionSecurityValidator.INSECURE_DEFAULT_JWT_KEY,
                "strong-db-password"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionSecurity);
        assertTrue(ex.getMessage().contains("Insecure default placeholder JWT_SECRET detected"));
    }

    @Test
    @DisplayName("Production profile with too short secret must throw IllegalStateException")
    void testProduction_ThrowsOnShortSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                env,
                "short-secret-123",
                "strong-db-password"
        );

        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionSecurity);
        assertTrue(ex.getMessage().contains("at least 256 bits"));
    }

    @Test
    @DisplayName("Production profile with strong custom secret should pass validation")
    void testProduction_PassesWithStrongSecret() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");

        ProductionSecurityValidator validator = new ProductionSecurityValidator(
                env,
                "A_VERY_SECURE_AND_COMPLEX_256_BIT_PRODUCTION_KEY_FOR_SVP_STOCKAI_2026",
                "strong-db-password"
        );

        assertDoesNotThrow(validator::validateProductionSecurity);
    }
}
