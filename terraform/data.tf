data "aws_vpc" "stockai" {
  id = var.vpc_id
}

data "aws_subnet" "public_a" {
  id = var.public_subnet_ids[0]
}

data "aws_subnet" "public_b" {
  id = var.public_subnet_ids[1]
}

data "aws_subnet" "private_a" {
  id = var.private_subnet_ids[0]
}

data "aws_subnet" "private_b" {
  id = var.private_subnet_ids[1]

}

data "aws_caller_identity" "current" {}