resource "cloudflare_dns_record" "github_org_verification" {
  count = var.github_verification_code == "" ? 0 : 1

  zone_id = local.zones.primary
  name    = "_gh-${var.github_org}-o.${var.primary_domain}"
  type    = "TXT"
  content = "\"${var.github_verification_code}\""
  ttl     = 1
  comment = "GitHub org domain verification for ${var.github_org}"
}
