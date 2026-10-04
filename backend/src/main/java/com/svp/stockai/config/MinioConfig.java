package com.svp.stockai.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!test")
public class MinioConfig {

    @Value("${stockai.storage.s3.endpoint}")
    private String endpoint;

    @Value("${stockai.storage.s3.access-key}")
    private String accessKey;

    @Value("${stockai.storage.s3.secret-key}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        if (accessKey == null || accessKey.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException(
                    "MinIO credentials are required when the application starts"
            );
        }

        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
