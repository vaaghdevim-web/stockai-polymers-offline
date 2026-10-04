resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}/production/db-password"
  description             = "StockAI production PostgreSQL password"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-production-db-password"
  }
}


resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/production/jwt-secret"
  description             = "StockAI production JWT signing secret"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-production-jwt-secret"
  }
}


resource "aws_secretsmanager_secret" "redis_password" {
  name                    = "${var.project_name}/production/redis-password"
  description             = "StockAI production Redis password"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-production-redis-password"
  }
}


resource "aws_secretsmanager_secret" "iot_device_key" {
  name                    = "${var.project_name}/production/iot-device-key"
  description             = "StockAI production IoT device key"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-production-iot-device-key"
  }
}


resource "aws_secretsmanager_secret" "iot_device_salt" {
  name                    = "${var.project_name}/production/iot-device-salt"
  description             = "StockAI production IoT device salt"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.project_name}-production-iot-device-salt"
  }
}