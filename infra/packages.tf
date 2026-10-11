resource "cloudflare_r2_bucket" "packages" {
  account_id = local.account_id
  name       = var.packages_bucket
  location   = "enam"
}

resource "cloudflare_r2_custom_domain" "packages" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.packages.name
  zone_id     = local.zones.primary
  domain      = "pkg.${var.primary_domain}"
  enabled     = true
  min_tls     = "1.2"
}
