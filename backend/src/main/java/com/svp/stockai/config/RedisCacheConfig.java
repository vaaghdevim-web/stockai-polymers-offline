package com.svp.stockai.config;

import com.svp.stockai.dto.ActiveMachineResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

@Slf4j
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "spring.cache.type", havingValue = "redis")
public class RedisCacheConfig implements CachingConfigurer {

    @Bean
    RedisCacheConfiguration redisCacheConfiguration() {
        JsonMapper objectMapper = JsonMapper.builder().build();

        JavaType activeMachinesType = objectMapper.getTypeFactory()
                .constructCollectionType(List.class, ActiveMachineResponse.class);

        JacksonJsonRedisSerializer<List<ActiveMachineResponse>> serializer =
                new JacksonJsonRedisSerializer<>(objectMapper, activeMachinesType);

        return RedisCacheConfiguration.defaultCacheConfig()
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                );
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(
                    RuntimeException exception,
                    Cache cache,
                    Object key
            ) {
                log.warn(
                        "Redis Cache GET failed for key='{}' in cache='{}'. " +
                        "Gracefully falling back to database/underlying source. Error: {}",
                        key,
                        cache != null ? cache.getName() : "unknown",
                        exception.getMessage()
                );
            }

            @Override
            public void handleCachePutError(
                    RuntimeException exception,
                    Cache cache,
                    Object key,
                    Object value
            ) {
                log.warn(
                        "Redis Cache PUT failed for key='{}' in cache='{}'. " +
                        "Continuing execution. Error: {}",
                        key,
                        cache != null ? cache.getName() : "unknown",
                        exception.getMessage()
                );
            }

            @Override
            public void handleCacheEvictError(
                    RuntimeException exception,
                    Cache cache,
                    Object key
            ) {
                log.warn(
                        "Redis Cache EVICT failed for key='{}' in cache='{}'. " +
                        "Continuing execution. Error: {}",
                        key,
                        cache != null ? cache.getName() : "unknown",
                        exception.getMessage()
                );
            }

            @Override
            public void handleCacheClearError(
                    RuntimeException exception,
                    Cache cache
            ) {
                log.warn(
                        "Redis Cache CLEAR failed for cache='{}'. " +
                        "Continuing execution. Error: {}",
                        cache != null ? cache.getName() : "unknown",
                        exception.getMessage()
                );
            }
        };
    }
}