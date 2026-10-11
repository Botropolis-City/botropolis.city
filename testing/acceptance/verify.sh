#!/usr/bin/env bash
set -uo pipefail

PRIMARY="${PRIMARY:-botropolis.city}"
MEDIA="${MEDIA:-media.${PRIMARY}}"
PKG="${PKG:-pkg.${PRIMARY}}"
BACKUP="${BACKUP:-botropolis.dev}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--help]

Asserts the live end state of ${PRIMARY} and ${BACKUP}:
DNS delegated to Cloudflare, the site served, the backup domain redirecting,
email routing on the primary, a non-sending lockdown on the backup,
video served from the media host with byte ranges, and the package
repositories on the pkg host signed by the key they publish.

Each check is one assertion. Exits non-zero if any check fails.

Environment:
  PRIMARY   primary domain (default: botropolis.city)
  BACKUP    backup domain  (default: botropolis.dev)
  MEDIA     media host     (default: media.\$PRIMARY)
  PKG       package host   (default: pkg.\$PRIMARY)
EOF
}

case "${1:-}" in
  -h | --help) usage; exit 0 ;;
  "") ;;
  *) usage >&2; exit 2 ;;
esac

failures=0

check() {
  local name=$1
  shift
  if "$@" >/dev/null 2>&1; then
    printf '  \033[0;32m✓\033[0m %s\n' "$name"
  else
    printf '  \033[0;31m✗\033[0m %s\n' "$name"
    failures=$((failures + 1))
  fi
}

status() { curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1"; }
location() { curl -s -o /dev/null -w '%{redirect_url}' --max-time 10 "$1"; }
txt() { dig +short TXT "$1"; }
body() { curl -s --max-time 10 "$1"; }
headers() { curl -sI --max-time 10 "$1"; }

nameservers_are_cloudflare() {
  local ns
  ns=$(dig +short NS "$1")
  [[ -n $ns ]] && ! grep -qv '\.ns\.cloudflare\.com\.$' <<<"$ns"
}

serves_site() {
  [[ $(status "https://$1/") == 200 ]] && [[ $(body "https://$1/") == *Botropolis* ]]
}

served_or_redirects_to() {
  local code
  code=$(status "https://$1/")
  [[ $code == 200 ]] || { [[ $code == 30[18] ]] && [[ $(location "https://$1/") == "https://$2/" ]]; }
}

redirects_to() {
  [[ $(status "$1") == 30[18] ]] && [[ $(location "$1") == "$2" ]]
}

upgrades_to_https() {
  [[ $(location "http://$1/") == https://* ]]
}

mx_is_cloudflare_routing() {
  local mx
  mx=$(dig +short MX "$1")
  [[ -n $mx ]] && ! grep -qv 'route[0-9]*\.mx\.cloudflare\.net\.$' <<<"$mx"
}

first_video_url() {
  local page
  page=$(body "https://$PRIMARY/")
  grep -o -m1 "https://${MEDIA//./\\.}/[^\"' ]*\.mp4" <<<"$page" | head -n1
}

csp_allows_media() {
  local h
  h=$(headers "https://$1/")
  grep -i '^content-security-policy:' <<<"$h" | grep -q "media-src[^;]*https://$2"
}

site_references_video() { [[ -n $(first_video_url) ]]; }

video_serves_ranges() {
  local url
  url=$(first_video_url)
  [[ -n $url ]] && [[ $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -r 0-1 "$url") == 206 ]]
}

signed_by_published_key() {
  local tmp ok=1
  tmp=$(mktemp -d)
  if curl -fsS --max-time 10 "https://$PKG/botropolis.asc" | gpg --dearmor > "$tmp/key.gpg" 2>/dev/null \
    && curl -fsS --max-time 10 -o "$tmp/signed" "https://$PKG/$1" \
    && { [[ -z ${2:-} ]] || curl -fsS --max-time 10 -o "$tmp/data" "https://$PKG/$2"; }; then
    if [[ -n ${2:-} ]]; then
      gpgv --keyring "$tmp/key.gpg" "$tmp/signed" "$tmp/data" && ok=0
    else
      gpgv --keyring "$tmp/key.gpg" "$tmp/signed" && ok=0
    fi
  fi
  rm -rf "$tmp"
  return $ok
}

mx_is_null() { [[ $(dig +short MX "$1") == "0 ." ]]; }
has_cloudflare_spf() { txt "$1" | grep -q 'include:_spf.mx.cloudflare.net'; }
spf_rejects_all() { txt "$1" | grep -qx '"v=spf1 -all"'; }
has_dmarc() { txt "_dmarc.$1" | grep -q '"v=DMARC1; p=\(quarantine\|reject\)'; }
dmarc_rejects() { txt "_dmarc.$1" | grep -q '"v=DMARC1; p=reject'; }

echo "dns"
check "${PRIMARY} is delegated to Cloudflare" nameservers_are_cloudflare "$PRIMARY"
check "${BACKUP} is delegated to Cloudflare" nameservers_are_cloudflare "$BACKUP"

echo "site"
check "https://${PRIMARY} serves the site" serves_site "$PRIMARY"
check "https://www.${PRIMARY} is served or redirects to the apex" served_or_redirects_to "www.$PRIMARY" "$PRIMARY"
check "http://${PRIMARY} upgrades to https" upgrades_to_https "$PRIMARY"

echo "redirects"
check "https://${BACKUP} redirects to https://${PRIMARY}/" redirects_to "https://$BACKUP/" "https://$PRIMARY/"
check "https://www.${BACKUP}/x redirects with its path" redirects_to "https://www.$BACKUP/x" "https://$PRIMARY/x"
check "http://${BACKUP} upgrades to https" upgrades_to_https "$BACKUP"

echo "email"
check "${PRIMARY} MX is Cloudflare Email Routing" mx_is_cloudflare_routing "$PRIMARY"
check "${PRIMARY} publishes Cloudflare Email Routing SPF" has_cloudflare_spf "$PRIMARY"
check "${PRIMARY} publishes DMARC" has_dmarc "$PRIMARY"
check "${BACKUP} has a null MX" mx_is_null "$BACKUP"
check "${BACKUP} SPF rejects all senders" spf_rejects_all "$BACKUP"
check "${BACKUP} DMARC rejects" dmarc_rejects "$BACKUP"

echo "media"
check "https://${PRIMARY} allows video from ${MEDIA}" csp_allows_media "$PRIMARY" "$MEDIA"
check "https://${PRIMARY} references a video on ${MEDIA}" site_references_video
check "that video answers a byte range with 206" video_serves_ranges

echo "packages"
check "https://${PKG}/deb InRelease is signed by the published key" signed_by_published_key deb/dists/stable/InRelease
check "https://${PKG}/rpm repomd.xml is signed by the published key" signed_by_published_key rpm/repodata/repomd.xml.asc rpm/repodata/repomd.xml

echo
if ((failures)); then
  printf '\033[0;31m%d check(s) failed\033[0m\n' "$failures"
  exit 1
fi
printf '\033[0;32mall checks passed\033[0m\n'
