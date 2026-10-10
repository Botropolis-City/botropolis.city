resource "cloudflare_email_routing_settings" "primary" {
  zone_id            = local.zones.primary
  support_subaddress = false
}

resource "cloudflare_email_routing_address" "forward_to" {
  account_id = local.account_id
  email      = var.forward_to
}

resource "cloudflare_email_routing_rule" "public" {
  for_each = var.public_addresses

  zone_id = local.zones.primary
  name    = "${each.value}@${var.primary_domain}"
  enabled = true

  matchers = [{
    type  = "literal"
    field = "to"
    value = "${each.value}@${var.primary_domain}"
  }]

  actions = [{
    type  = "forward"
    value = [cloudflare_email_routing_address.forward_to.email]
  }]
}

resource "cloudflare_dns_record" "backup_null_mx" {
  zone_id  = local.zones.backup
  name     = var.backup_domain
  type     = "MX"
  content  = "."
  priority = 0
  ttl      = 1
  comment  = "RFC 7505: this domain accepts no mail"
}

resource "cloudflare_dns_record" "backup_spf" {
  zone_id = local.zones.backup
  name    = var.backup_domain
  type    = "TXT"
  content = "\"v=spf1 -all\""
  ttl     = 1
  comment = "This domain sends no mail"
}

resource "cloudflare_dns_record" "dmarc" {
  for_each = {
    primary = { domain = var.primary_domain, policy = "quarantine" }
    backup  = { domain = var.backup_domain, policy = "reject" }
  }

  zone_id = local.zones[each.key]
  name    = "_dmarc.${each.value.domain}"
  type    = "TXT"
  content = "\"v=DMARC1; p=${each.value.policy}; sp=${each.value.policy}; adkim=s; aspf=s\""
  ttl     = 1
}
