resource "cloudflare_bot_management" "primary" {
  zone_id    = local.zones.primary
  fight_mode = false
}
