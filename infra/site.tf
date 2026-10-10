resource "cloudflare_workers_custom_domain" "site" {
  for_each = toset([var.primary_domain, "www.${var.primary_domain}"])

  account_id = local.account_id
  zone_id    = local.zones.primary
  hostname   = each.value
  service    = var.worker_name
}
