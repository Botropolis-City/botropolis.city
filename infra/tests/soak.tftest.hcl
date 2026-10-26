mock_provider "cloudflare" {
  mock_data "cloudflare_zone" {
    defaults = {
      zone_id = "00000000000000000000000000000001"
      account = { id = "0000000000000000000000000000000a" }
    }
  }
}

override_resource {
  target = cloudflare_account_token.soak["write"]
  values = { id = "write-id", value = "write-value" }
}

override_resource {
  target = cloudflare_account_token.soak["read"]
  values = { id = "read-id", value = "read-value" }
}

variables {
  soak_permission_groups = { write = "item-write-id", read = "item-read-id" }
}

run "when_the_soak_bucket_is_built" {
  command = apply

  assert {
    condition     = cloudflare_r2_bucket.soak.name == "botropolis-soak"
    error_message = "it should be named botropolis-soak"
  }

  assert {
    condition     = output.soak_bucket_url == "https://0000000000000000000000000000000a.r2.cloudflarestorage.com/botropolis-soak"
    error_message = "it should give the account's S3 endpoint and the bucket as its URL"
  }
}

run "and_its_lifecycle_is_read" {
  command = apply

  assert {
    condition     = cloudflare_r2_bucket_lifecycle.soak.bucket_name == cloudflare_r2_bucket.soak.name
    error_message = "it should apply to the soak bucket"
  }

  assert {
    condition     = one(cloudflare_r2_bucket_lifecycle.soak.rules).conditions.prefix == ""
    error_message = "it should cover every object"
  }

  assert {
    condition     = one(cloudflare_r2_bucket_lifecycle.soak.rules).delete_objects_transition.condition.max_age == 30 * 24 * 60 * 60
    error_message = "it should delete objects after 30 days"
  }

  assert {
    condition     = one(cloudflare_r2_bucket_lifecycle.soak.rules).abort_multipart_uploads_transition.condition.max_age == 24 * 60 * 60
    error_message = "it should abort unfinished uploads after a day"
  }
}

run "and_its_credentials_are_read" {
  command = apply

  assert {
    condition     = toset(keys(cloudflare_account_token.soak)) == toset(["write", "read"])
    error_message = "it should make one write-only and one read-only credential"
  }

  assert {
    condition = alltrue([
      for access, token in cloudflare_account_token.soak :
      one(one(token.policies).permission_groups).id == var.soak_permission_groups[access]
    ])
    error_message = "it should give each credential only its own permission group"
  }

  assert {
    condition = alltrue([
      for token in cloudflare_account_token.soak :
      jsondecode(one(token.policies).resources) == { "com.cloudflare.edge.r2.bucket.0000000000000000000000000000000a_default_botropolis-soak" = "*" }
    ])
    error_message = "it should scope each credential to the soak bucket alone"
  }

  assert {
    condition     = alltrue([for token in cloudflare_account_token.soak : token.expires_on == var.soak_token_expires_on])
    error_message = "it should make each credential expire"
  }

  assert {
    condition = output.soak_credentials == {
      write = { access_key_id = "write-id", secret_access_key = sha256("write-value") }
      read  = { access_key_id = "read-id", secret_access_key = sha256("read-value") }
    }
    error_message = "it should give each token's id and the SHA-256 of its value as its S3 keys"
  }
}
