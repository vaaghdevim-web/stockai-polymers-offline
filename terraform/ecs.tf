data "aws_secretsmanager_secret" "db_password" {
  name = "stockai/production/db-password"
}

data "aws_secretsmanager_secret" "jwt_secret" {
  name = "stockai/production/jwt-secret"
}

data "aws_secretsmanager_secret" "iot_device_key" {
  name = "stockai/production/iot-device-key"
}

data "aws_secretsmanager_secret" "iot_device_salt" {
  name = "stockai/production/iot-device-salt"
}

resource "aws_ecs_cluster" "production" {
  name = "stockai-production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "stockai-production"
  }
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "stockai-production-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]

  cpu    = "512"
  memory = "1024"

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([
    {
      name      = "stockai-backend"
      image     = "${aws_ecr_repository.backend.repository_url}@${var.backend_image_digest}"
      essential = true

      cpu    = 512
      memory = 1024

      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "DB_HOST"
          value = var.rds_endpoint
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = var.rds_database
        },
        {
          name  = "DB_USERNAME"
          value = var.rds_username
        },
        {
          name  = "REDIS_HOST"
          value = var.redis_endpoint
        },
        {
          name  = "REDIS_PORT"
          value = "6379"
        },
        {
          name  = "SPRING_DATA_REDIS_SSL_ENABLED"
          value = "true"
        },
        {
          name  = "REDIS_ACTIVE_MACHINE_TTL"
          value = "5s"
        },
        {
          name  = "JWT_EXPIRATION_MS"
          value = "3600000"
        },
        {
          name  = "MFA_ENFORCED"
          value = "false"
        },
        {
          name  = "KAFKA_ENABLED"
          value = "false"
        },
        {
          name  = "S3_BUCKET_NAME"
          value = var.documents_bucket_name
        },
        {
          name  = "S3_REGION"
          value = var.aws_region
        },
        {
          name  = "MINIO_ENDPOINT"
          value = "https://s3.us-east-1.amazonaws.com"
        },
        {
          name  = "CORS_ALLOWED_ORIGINS"
          value = var.cors_allowed_origins
        },
        {
          name  = "JPA_SHOW_SQL"
          value = "false"
        },
        {
          name  = "JPA_FORMAT_SQL"
          value = "false"
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = data.aws_secretsmanager_secret.db_password.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = data.aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "IOT_DEVICE_KEY"
          valueFrom = data.aws_secretsmanager_secret.iot_device_key.arn
        },
        {
          name      = "IOT_DEVICE_SALT"
          valueFrom = data.aws_secretsmanager_secret.iot_device_salt.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command = [
          "CMD-SHELL",
          "wget -q -O - http://localhost:8080/actuator/health || exit 1"
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      stopTimeout = 30
    }
  ])

  tags = {
    Name = "stockai-production-backend"
  }
}

resource "aws_ecs_service" "backend" {
  name            = "stockai-backend"
  cluster         = aws_ecs_cluster.production.id
  task_definition = aws_ecs_task_definition.backend.arn

  desired_count = 1

  launch_type      = "FARGATE"
  platform_version = "LATEST"

  enable_execute_command = false

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets = var.public_subnet_ids

    security_groups = [
      aws_security_group.ecs.id
    ]

    assign_public_ip = true
  }

  health_check_grace_period_seconds = 300

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "stockai-backend"
    container_port   = 8080
  }

  tags = {
    Name = "stockai-production-backend"
  }
}



