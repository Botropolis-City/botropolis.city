resource "cloudflare_r2_bucket" "media" {
  account_id = local.account_id
  name       = var.media_bucket
  location   = "enam"
}

resource "cloudflare_r2_custom_domain" "media" {
  account_id  = local.account_id
  bucket_name = cloudflare_r2_bucket.media.name
  zone_id     = local.zones.primary
  domain      = "media.${var.primary_domain}"
  enabled     = true
  min_tls     = "1.2"
}
