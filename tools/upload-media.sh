#!/usr/bin/env bash
set -euo pipefail

BUCKET="${MEDIA_BUCKET:-botropolis-media}"
HOST="${MEDIA_HOST:-https://media.botropolis.city}"
DIR="${MEDIA_DIR:-.media}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--help]

Uploads every clip in ${DIR}/ to the R2 bucket ${BUCKET}, cached as immutable.
Names are content hashes, so a clip already served from ${HOST} is skipped
and nothing is ever overwritten.

Needs CLOUDFLARE_API_TOKEN with Workers R2 Storage Edit; make media-upload
supplies it through secret-run.

Environment:
  MEDIA_BUCKET  bucket       (default: botropolis-media)
  MEDIA_HOST    public host  (default: https://media.botropolis.city)
  MEDIA_DIR     clips        (default: .media)
USAGE
}

case "${1:-}" in
  -h | --help) usage; exit 0 ;;
  "") ;;
  *) usage >&2; exit 2 ;;
esac

shopt -s nullglob
files=("$DIR"/*)
((${#files[@]})) || { echo "nothing in $DIR/; run make media-import" >&2; exit 1; }

for f in "${files[@]}"; do
  name=$(basename "$f")
  if [[ $(curl -s -o /dev/null -w '%{http_code}' -I "$HOST/$name") == 200 ]]; then
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
done
