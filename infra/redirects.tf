resource "cloudflare_dns_record" "backup_placeholder" {
  for_each = toset([var.backup_domain, "www.${var.backup_domain}"])

  zone_id = local.zones.backup
  name    = each.value
  type    = "AAAA"
  content = "100::"
  ttl     = 1
  proxied = true
  comment = "No origin; exists so the redirect rule below has traffic to act on"
}

resource "cloudflare_ruleset" "backup_redirect" {
  zone_id = local.zones.backup
  name    = "${var.backup_domain} to ${var.primary_domain}"
  kind    = "zone"
  phase   = "http_request_dynamic_redirect"

  rules = [{
    description = "Every path on ${var.backup_domain} to the same path on ${var.primary_domain}"
    expression  = "true"
    action      = "redirect"
    action_parameters = {
      from_value = {
        status_code           = 301
        preserve_query_string = true
        target_url = {
          expression = "concat(\"https://${var.primary_domain}\", http.request.uri.path)"
        }
      }
    }
  }]
}
