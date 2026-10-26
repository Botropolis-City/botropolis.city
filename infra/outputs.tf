output "name_servers" {
  description = "Set these as Custom DNS for each domain in the namecheap repo."
  value = {
    (var.primary_domain) = data.cloudflare_zone.primary.name_servers
    (var.backup_domain)  = data.cloudflare_zone.backup.name_servers
  }
}

output "account_id" {
  description = "CLOUDFLARE_ACCOUNT_ID for wrangler and the deploy workflow."
  value       = local.account_id
}

output "site_hostnames" {
  value = [for d in cloudflare_workers_custom_domain.site : d.hostname]
}

output "media_hostname" {
  value = cloudflare_r2_custom_domain.media.domain
}

output "packages_hostname" {
  value = cloudflare_r2_custom_domain.packages.domain
}

output "soak_bucket_url" {
  description = "The soak bucket's S3 endpoint and bucket, for BUCKET_URL."
  value       = "https://${local.account_id}.r2.cloudflarestorage.com/${cloudflare_r2_bucket.soak.name}"
}

output "soak_credentials" {
  description = "S3 keys for the soak bucket, write-only for the box and read-only for the laptop: the token's id and the SHA-256 of its value."
  sensitive   = true
  value = {
    for access, token in cloudflare_account_token.soak : access => {
      access_key_id     = token.id
      secret_access_key = sha256(token.value)
    }
  }
}
