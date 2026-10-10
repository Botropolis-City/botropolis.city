data "cloudflare_zone" "primary" {
  filter = { name = var.primary_domain }
}

data "cloudflare_zone" "backup" {
  filter = { name = var.backup_domain }
}

locals {
  account_id = data.cloudflare_zone.primary.account.id

  zones = {
    primary = data.cloudflare_zone.primary.zone_id
    backup  = data.cloudflare_zone.backup.zone_id
  }

  zone_settings = {
    ssl              = "strict"
    always_use_https = "on"
    min_tls_version  = "1.2"
  }
}

resource "cloudflare_zone_setting" "this" {
  for_each = {
    for pair in setproduct(keys(local.zones), keys(local.zone_settings)) :
    "${pair[0]}.${pair[1]}" => { zone = pair[0], setting = pair[1] }
  }

  zone_id    = local.zones[each.value.zone]
  setting_id = each.value.setting
  value      = local.zone_settings[each.value.setting]
}
