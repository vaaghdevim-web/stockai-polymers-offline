\# Production Architecture



\## Overview



StockAI Polymers is an Industrial Management System (IMS) with a React/Vite frontend, Spring Boot backend, and PostgreSQL database.



\## Production Stack



\* \*\*Frontend:\*\* React/Vite

\* \*\*Backend:\*\* Spring Boot

\* \*\*Database:\*\* Amazon RDS PostgreSQL

\* \*\*Compute:\*\* AWS ECS

\* \*\*Ingress:\*\* Application Load Balancer

\* \*\*Images:\*\* Amazon ECR

\* \*\*Secrets:\*\* AWS Secrets Manager

\* \*\*Monitoring:\*\* Amazon CloudWatch

\* \*\*Backups:\*\* Amazon S3

\* \*\*Infrastructure:\*\* Terraform



\## Request Flow



```text

User

&#x20; |

&#x20; v

Application Load Balancer

&#x20; |

&#x20; v

ECS Backend

&#x20; |

&#x20; +--> RDS PostgreSQL

&#x20; +--> Secrets Manager

&#x20; +--> CloudWatch



PostgreSQL Backup

&#x20; |

&#x20; v

Amazon S3

```



\## Security



\* Public traffic enters through the Application Load Balancer.

\* ECS backend tasks are protected by security groups.

\* RDS is not publicly accessible.

\* Database access is restricted to the application security boundary.

\* Production secrets are stored outside source control.

\* IAM permissions follow least-privilege principles.



\## Deployment



Terraform manages the AWS infrastructure.



Production deployments should use immutable container image tags or digests. The mutable `latest` tag should not be used for production deployments.



\## Recovery



PostgreSQL backups are stored separately from the application runtime.



Restore testing must use a temporary or non-production database. Destructive restore testing must never be performed directly against production.



\## Performance



Load testing must be performed only against a dedicated non-production environment. Performance threshold failures must be recorded honestly and must not be reported as passing results.
