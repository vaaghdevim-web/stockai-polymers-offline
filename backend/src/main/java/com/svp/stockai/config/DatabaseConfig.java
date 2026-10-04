package com.svp.stockai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.EnableTransactionManagement;

/**
 * Database and Persistence Layer Configuration.
 *
 * <p>Architectural Notes:
 * <ul>
 *   <li><b>Transaction Management:</b> Enabled via {@link EnableTransactionManagement}
 *       to support standard declarative {@code @Transactional} demarcation across repository and service layers.</li>
 *   <li><b>DataSource & Connection Pool:</b> Spring Boot auto-configuration automatically binds
 *       {@code spring.datasource.hikari.*} properties to instantiate {@code com.zaxxer.hikari.HikariDataSource}.
 *       No manual {@code DataSource} or {@code PlatformTransactionManager} beans are created to avoid overriding
 *       Spring Boot's native connection pool health indicators and metrics.</li>
 *   <li><b>JPA Auditing:</b> Deliberately not enabled at this stage because domain entities do not exist yet.
 *       Auditing infrastructure (such as {@code @EnableJpaAuditing} and {@code AuditorAware}) will be introduced
 *       in subsequent steps alongside entity definitions.</li>
 * </ul>
 */
@Configuration
@EnableTransactionManagement
public class DatabaseConfig {

    // Custom database-related beans or interceptors can be declared here when needed in future modules.

}
