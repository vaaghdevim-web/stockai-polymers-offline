package com.svp.stockai.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI stockAiOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("StockAI X — Factory & Inventory Intelligence API")
                        .description("Sri Vidha Polymers enterprise ERP & IoT telemetry REST API documentation.")
                        .version("v2.4.0")
                        .contact(new Contact()
                                .name("Sri Vidha Polymers Engineering Team")
                                .email("dev@svpgroup.com")
                                .url("https://stockai.svpgroup.com"))
                        .license(new License()
                                .name("Proprietary Enterprise License")
                                .url("https://stockai.svpgroup.com/license")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Enter your JWT token obtained from POST /api/v1/auth/login")));
    }
}
