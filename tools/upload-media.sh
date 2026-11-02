#!/usr/bin/env bash
set -euo pipefail

BUCKET="${MEDIA_BUCKET:-botropolis-media}"
HOST="${MEDIA_HOST:-https://media.botropolis.city}"
DIR="${MEDIA_DIR:-.media}"
ZONE="${MEDIA_ZONE:-botropolis.city}"
API="https://api.cloudflare.com/client/v4"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--help]

Uploads every clip in ${DIR}/ to the R2 bucket ${BUCKET}, cached as immutable,
then purges exactly the uploaded URLs from ${HOST}'s cache.
Names are content hashes, so a clip already in the bucket is skipped and nothing
is ever overwritten. What exists is read from the bucket through Cloudflare's API,
never from ${HOST}, whose edge would cache a "not found" for a clip about to exist.

Needs CLOUDFLARE_API_TOKEN with Workers R2 Storage Edit and Zone Cache Purge;
make media-upload supplies it through secret-run.

Environment:
  MEDIA_BUCKET           bucket        (default: botropolis-media)
  MEDIA_HOST             public host   (default: https://media.botropolis.city)
  MEDIA_DIR              clips         (default: .media)
  MEDIA_ZONE             zone to purge (default: botropolis.city)
  CLOUDFLARE_ACCOUNT_ID  account       (default: the token's first account)
  MEDIA_ZONE_ID          zone id       (default: looked up from MEDIA_ZONE)
USAGE
}

case "${1:-}" in
  -h | --help) usage; exit 0 ;;
  "") ;;
  *) usage >&2; exit 2 ;;
esac

: "${CLOUDFLARE_API_TOKEN:?needs CLOUDFLARE_API_TOKEN; run make media-upload}"

api() {
  curl -sS -K - "$@" <<<"header = \"Authorization: Bearer ${CLOUDFLARE_API_TOKEN}\""
}

ok() {
  local what=$1 body=$2
  if [[ $(jq -r '.success // false' <<<"$body" 2>/dev/null) != true ]]; then
    echo "$what failed: $(jq -r '[.errors[]?.message] | join("; ")' <<<"$body" 2>/dev/null || echo "$body")" >&2
    return 1
  fi
}

shopt -s nullglob
files=("$DIR"/*)
((${#files[@]})) || { echo "nothing in $DIR/; run make media-import" >&2; exit 1; }

account="${CLOUDFLARE_ACCOUNT_ID:-}"
if [[ -z $account ]]; then
  body=$(api "$API/accounts")
  ok "looking up the account" "$body" || exit 1
  account=$(jq -r '.result[0].id' <<<"$body")
fi

declare -A have=()
cursor=""
while :; do
  url="$API/accounts/$account/r2/buckets/$BUCKET/objects?per_page=1000"
  [[ -n $cursor ]] && url+="&cursor=$cursor"
  body=$(api "$url")
  ok "listing bucket $BUCKET" "$body" || exit 1
  while IFS= read -r key; do
    [[ -n $key ]] && have[$key]=1
  done < <(jq -r '.result[]?.key' <<<"$body")
  [[ $(jq -r '.result_info.is_truncated // false' <<<"$body") == true ]] || break
  cursor=$(jq -r '.result_info.cursor // empty' <<<"$body")
  [[ -n $cursor ]] || break
done

uploaded=()
for f in "${files[@]}"; do
  name=$(basename "$f")
  if [[ -n ${have[$name]:-} ]]; then
    echo "  have $name"
    continue
  fi
  case "$name" in
    *.mp4) type=video/mp4 ;;
    *.webm) type=video/webm ;;
    *) echo "  skip $name: not a clip" >&2; continue ;;
  esac
  npx wrangler r2 object put "$BUCKET/$name" --remote --file "$f" \
    --content-type "$type" --cache-control "public, max-age=31536000, immutable"
  uploaded+=("$HOST/$name")
done

((${#uploaded[@]})) || { echo "nothing new to upload"; exit 0; }

zone="${MEDIA_ZONE_ID:-}"
if [[ -z $zone ]]; then
  body=$(api "$API/zones?name=$ZONE")
  ok "looking up zone $ZONE" "$body" || exit 1
  zone=$(jq -r '.result[0].id' <<<"$body")
fi

for ((i = 0; i < ${#uploaded[@]}; i += 30)); do
  batch=("${uploaded[@]:i:30}")
  data=$(jq -cn '{files: $ARGS.positional}' --args "${batch[@]}")
  body=$(api -X POST -H "Content-Type: application/json" --data "$data" "$API/zones/$zone/purge_cache")
  ok "purging ${#batch[@]} URLs from $HOST's cache" "$body" || exit 1
  printf '  purged %s\n' "${batch[@]}"
done
