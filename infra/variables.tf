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

variable "media_bucket" {
  type        = string
  description = "R2 bucket for video; must match MEDIA_BUCKET in ../Makefile."
  default     = "botropolis-media"
}

variable "packages_bucket" {
  type        = string
  description = "R2 bucket for the APT and RPM repositories; must match PACKAGES_BUCKET in ../.github/workflows/packages.yml."
  default     = "botropolis-packages"
}

variable "soak_bucket" {
  type        = string
  description = "Private R2 bucket where a soak box leaves its report (item 266)."
  default     = "botropolis-soak"
}

variable "soak_token_expires_on" {
  type        = string
  description = "When the soak bucket's write credential stops working; move it forward and apply to renew."
  default     = "2027-10-26T00:00:00Z"
}

variable "soak_permission_groups" {
  type        = object({ write = string, read = string })
  description = "IDs of the R2 bucket item write and read permission groups; looked up from the account when null."
  default     = null
}
