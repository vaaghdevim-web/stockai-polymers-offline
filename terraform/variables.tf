variable "aws_region" {
  description = "AWS region for StockAI production"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "stockai"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "Existing StockAI VPC"
  type        = string
  default     = "vpc-03524c167600c037b"
}

variable "public_subnet_ids" {
  description = "Existing public subnets"
  type        = list(string)

  default = [
    "subnet-0bf5d36923860cf3a",
    "subnet-09a7bea5b346ebca0"
  ]
}

variable "private_subnet_ids" {
  description = "Existing private subnets"
  type        = list(string)

  default = [
    "subnet-0b9bafd98182e6ecf",
    "subnet-0249cea872eb92082"
  ]
}

variable "rds_security_group_id" {
  description = "Existing RDS PostgreSQL security group"
  type        = string
  default     = "sg-0659e3f34266150c7"
}

variable "documents_bucket_name" {
  description = "Private S3 bucket for StockAI application documents"
  type        = string
  default     = "stockai-documents-970547378393"
}

variable "rds_endpoint" {
  description = "Production RDS endpoint"
  type        = string
  default     = "stockai-postgres.cc5w8qo2iuf9.us-east-1.rds.amazonaws.com"
}

variable "rds_database" {
  description = "Production database name"
  type        = string
  default     = "stockai"
}

variable "rds_username" {
  description = "Production database username"
  type        = string
  default     = "stockai_app_user"
}

variable "redis_endpoint" {
  description = "Production Redis primary endpoint"
  type        = string
  default     = "master.stockai-production-redis.oybhrm.use1.cache.amazonaws.com"
}

variable "backend_image_digest" {
  description = "Immutable ECR backend image digest"
  type        = string
  default     = "sha256:c56bd4afdee9e271580e328532fe997fe073fbef581dc9137ab1b126586c2941"
}

variable "cors_allowed_origins" {
  description = "Allowed frontend origins"
  type        = string
  default     = "http://localhost:5173"
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of the ACM certificate for the ALB HTTPS listener (same region as the ALB)"
}



