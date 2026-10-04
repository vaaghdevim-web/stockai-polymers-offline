data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    actions = [
      "sts:AssumeRole"
    ]
  }
}


resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-production-ecs-execution-role"

  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = "${var.project_name}-production-ecs-execution-role"
  }
}


resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-production-ecs-task-role"

  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json

  tags = {
    Name = "${var.project_name}-production-ecs-task-role"
  }
}


data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    sid    = "ListDocumentBucket"
    effect = "Allow"

    actions = [
      "s3:ListBucket"
    ]

    resources = [
      aws_s3_bucket.documents.arn
    ]
  }

  statement {
    sid    = "ManageDocumentObjects"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject"
    ]

    resources = [
      "${aws_s3_bucket.documents.arn}/*"
    ]
  }
}


resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project_name}-production-s3-documents"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}


data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    sid    = "ReadStockAISecrets"
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue"
    ]

    resources = [
      aws_secretsmanager_secret.db_password.arn,
      aws_secretsmanager_secret.jwt_secret.arn,
      aws_secretsmanager_secret.redis_password.arn,
      aws_secretsmanager_secret.iot_device_key.arn,
      aws_secretsmanager_secret.iot_device_salt.arn
    ]
  }
}


resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.project_name}-production-secrets-read"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}