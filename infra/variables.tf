variable "primary_domain" {
  type    = string
  default = "botropolis.city"
}

variable "backup_domain" {
  type    = string
  default = "botropolis.dev"
}

variable "worker_name" {
  type        = string
  description = "Must match `name` in ../wrangler.jsonc."
  default     = "botropolis-city"
}

variable "forward_to" {
  type        = string
  description = "Where mail to the primary domain's public addresses is delivered."
  default     = "dev@ariavesta.com"
}

variable "public_addresses" {
  type    = set(string)
  default = ["hello", "security"]
}

variable "github_org" {
  type    = string
  default = "Botropolis-City"
}

variable "github_verification_code" {
  type        = string
  description = "From the org's Settings > Verified domains. Public once published, so set it here rather than in the workspace."
  default     = "ff828a50b7"
}
