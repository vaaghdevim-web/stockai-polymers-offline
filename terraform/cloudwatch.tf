resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.project_name}/production/backend"
  retention_in_days = 30

  tags = {
    Name = "${var.project_name}-production-backend-logs"
  }
}