resource "cloudflare_r2_bucket" "soak" {
  account_id = local.account_id
  name       = var.soak_bucket
  location   = "enam"
}

resource "cloudflare_r2_bucket_lifecycle" "soak" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.soak.name

  rules = [{
    id         = "expire-reports"
    enabled    = true
    conditions = { prefix = "" }
    delete_objects_transition = {
      condition = { type = "Age", max_age = 30 * 24 * 60 * 60 }
    }
    abort_multipart_uploads_transition = {
      condition = { type = "Age", max_age = 24 * 60 * 60 }
    }
  }]
}

data "cloudflare_account_api_token_permission_groups_list" "all" {
  count      = var.soak_permission_groups == null ? 1 : 0
  account_id = local.account_id
}

locals {
  soak_access = {
    write = "Workers R2 Storage Bucket Item Write"
    read  = "Workers R2 Storage Bucket Item Read"
  }

  soak_permission_groups = var.soak_permission_groups != null ? var.soak_permission_groups : {
    for access, name in local.soak_access : access => one([
      for g in data.cloudflare_account_api_token_permission_groups_list.all[0].result : g.id
      if g.name == name
    ])
  }
}

resource "cloudflare_account_token" "soak" {
  for_each = local.soak_access

  account_id = local.account_id
  name       = "${var.soak_bucket} ${each.key}"
  expires_on = var.soak_token_expires_on

  policies = [{
    effect            = "allow"
    permission_groups = [{ id = local.soak_permission_groups[each.key] }]
    resources = jsonencode({
      "com.cloudflare.edge.r2.bucket.${local.account_id}_default_${cloudflare_r2_bucket.soak.name}" = "*"
    })
  }]
}
