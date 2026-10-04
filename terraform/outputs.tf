output "vpc_id" {
  description = "StockAI production VPC"
  value       = data.aws_vpc.stockai.id
}

output "alb_security_group_id" {
  description = "Security group ID for the production ALB"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "Security group ID for ECS Fargate tasks"
  value       = aws_security_group.ecs.id
}

output "rds_security_group_id" {
  description = "Existing RDS security group ID"
  value       = var.rds_security_group_id
}

output "ecr_repository_url" {
  description = "ECR repository URL for the StockAI backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "documents_bucket_name" {
  description = "Private S3 bucket for StockAI application documents"
  value       = aws_s3_bucket.documents.bucket
}

output "documents_bucket_arn" {
  description = "ARN of the StockAI document bucket"
  value       = aws_s3_bucket.documents.arn
}

output "public_subnet_ids" {
  description = "Existing public subnet IDs"
  value       = var.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Existing private subnet IDs"
  value       = var.private_subnet_ids
}
output "ecs_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS application task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "cloudwatch_backend_log_group" {
  description = "CloudWatch log group for the StockAI backend"
  value       = aws_cloudwatch_log_group.backend.name
}

output "db_password_secret_arn" {
  description = "Secrets Manager ARN for database password"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "jwt_secret_arn" {
  description = "Secrets Manager ARN for JWT secret"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "redis_password_secret_arn" {
  description = "Secrets Manager ARN for Redis password"
  value       = aws_secretsmanager_secret.redis_password.arn
}

output "iot_device_key_secret_arn" {
  description = "Secrets Manager ARN for IoT device key"
  value       = aws_secretsmanager_secret.iot_device_key.arn
}

output "iot_device_salt_secret_arn" {
  description = "Secrets Manager ARN for IoT device salt"
  value       = aws_secretsmanager_secret.iot_device_salt.arn
}
output "alb_dns_name" {
  description = "Production ALB DNS name"
  value       = aws_lb.production.dns_name
}

output "alb_url" {
  description = "Production backend URL"
  value       = "https://${aws_lb.production.dns_name}"
}

output "ecs_cluster_name" {
  description = "ECS production cluster"
  value       = aws_ecs_cluster.production.name
}

output "ecs_service_name" {
  description = "ECS backend service"
  value       = aws_ecs_service.backend.name
}

output "ecs_task_definition" {
  description = "ECS backend task definition"
  value       = aws_ecs_task_definition.backend.family
}

output "redis_endpoint" {
  description = "Production Redis endpoint"
  value       = var.redis_endpoint
}