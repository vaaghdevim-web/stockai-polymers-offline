package com.svp.stockai.config;

import io.minio.MinioClient;
import io.minio.credentials.IamAwsProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!test")
public class MinioConfig {

    @Value("${stockai.storage.s3.endpoint}")
    private String endpoint;

    @Value("${stockai.storage.s3.access-key:}")
    private String accessKey;

    @Value("${stockai.storage.s3.secret-key:}")
    private String secretKey;

    @Value("${stockai.storage.s3.region:us-east-1}")
    private String region;

    @Bean
    public MinioClient minioClient() {
        MinioClient.Builder builder = MinioClient.builder()
                .endpoint(endpoint)
                .region(region);

        if (accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank()) {
            builder.credentials(accessKey, secretKey);
        } else {
            builder.credentialsProvider(new IamAwsProvider(null, null));
        }

        return builder.build();
    }
}
