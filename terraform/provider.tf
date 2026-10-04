provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "StockAI"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}