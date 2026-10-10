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
