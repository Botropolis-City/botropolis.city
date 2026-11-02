import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const script = resolve(__dirname, "upload-media.sh");
const token = "test-token-value-307";
const host = "https://media.example.test";

const fakeCurl = `#!/usr/bin/env bash
set -u
printf 'curl %s\\n' "$*" >> "$FAKE_DIR/calls"
cat >> "$FAKE_DIR/curl-stdin" 2>/dev/null || true
url="" data=""
while (($#)); do
  case "$1" in
    -d | --data | --data-raw) data=$2; shift ;;
    http*) url=$1 ;;
  esac
  shift
done
printf '%s\\n' "$url" >> "$FAKE_DIR/urls"
case "$url" in
  "$MEDIA_HOST"*) echo "host request" >&2; exit 0 ;;
  */accounts) echo '{"success":true,"result":[{"id":"acct-1"}]}' ;;
  */zones\\?name=*) echo '{"success":true,"result":[{"id":"zone-1"}]}' ;;
  */accounts/acct-1/r2/buckets/test-bucket/objects*)
    if [[ $FAKE_MODE == list-fails ]]; then
      echo '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}],"result":null}'
    elif [[ $url == *cursor=page2* ]]; then
      echo '{"success":true,"result":[{"key":"bbb.webm"}],"result_info":{"is_truncated":false}}'
    elif [[ $FAKE_MODE == all-present ]]; then
      echo '{"success":true,"result":[{"key":"aaa.mp4"},{"key":"ccc.mp4"},{"key":"ddd.webm"}],"result_info":{"is_truncated":true,"cursor":"page2"}}'
    else
      echo '{"success":true,"result":[{"key":"aaa.mp4"}],"result_info":{"is_truncated":true,"cursor":"page2"}}'
    fi ;;
  */zones/zone-1/purge_cache)
    printf '%s\\n' "$data" > "$FAKE_DIR/purge"
    if [[ $FAKE_MODE == purge-fails ]]; then
      echo '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}],"result":null}'
    else
      echo '{"success":true,"errors":[],"result":{"id":"zone-1"}}'
    fi ;;
  *) echo "unexpected url $url" >&2; exit 1 ;;
esac
`;

const fakeNpx = `#!/usr/bin/env bash
set -u
printf 'npx %s\\n' "$*" >> "$FAKE_DIR/calls"
if [[ $FAKE_MODE == upload-fails && "$*" == *ccc.mp4* ]]; then
  echo "upload failed" >&2
  exit 1
fi
`;

type Mode = "normal" | "all-present" | "purge-fails" | "list-fails" | "upload-fails";

const dirs: string[] = [];

const run = (mode: Mode) => {
  const dir = mkdtempSync(join(tmpdir(), "upload-media-test-"));
  dirs.push(dir);
  const bin = join(dir, "bin");
  const media = join(dir, "media");
  mkdirSync(bin);
  mkdirSync(media);
  for (const clip of ["aaa.mp4", "bbb.webm", "ccc.mp4", "ddd.webm"]) writeFileSync(join(media, clip), clip);
  writeFileSync(join(dir, "calls"), "");
  writeFileSync(join(bin, "curl"), fakeCurl, { mode: 0o755 });
  writeFileSync(join(bin, "npx"), fakeNpx, { mode: 0o755 });
  const result = spawnSync(script, [], {
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      HOME: dir,
      FAKE_DIR: dir,
      FAKE_MODE: mode,
      CLOUDFLARE_API_TOKEN: token,
      MEDIA_BUCKET: "test-bucket",
      MEDIA_HOST: host,
      MEDIA_DIR: media,
    },
  });
  const read = (name: string) => {
    try {
      return readFileSync(join(dir, name), "utf8");
    } catch {
      return "";
    }
  };
  const calls = read("calls").split("\n").filter(Boolean);
  const purge = read("purge").trim();
  const uploads = calls.filter((c) => c.startsWith("npx ") && c.includes("object put"));
  const purged = purge ? (JSON.parse(purge).files as string[]).slice().sort() : [];
  const urls = read("urls").split("\n").filter(Boolean);
  return { result, calls, urls, uploads, purged, purge };
};

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("upload-media.sh", () => {
  describe("when clips are in the media directory and some are already in the bucket", () => {
    const { result, calls, urls, uploads, purged } = run("normal");

    it("should succeed", () => {
      expect(result.status).toBe(0);
    });

    it("should never request the public media host", () => {
      expect(urls.filter((u) => u.startsWith(host))).toEqual([]);
    });

    it("should list the bucket through the R2 API", () => {
      expect(calls.some((c) => c.includes("/accounts/acct-1/r2/buckets/test-bucket/objects"))).toBe(true);
    });

    it("should upload only the clips missing from the bucket", () => {
      expect(uploads.map((c) => c.match(/test-bucket\/(\S+)/)?.[1]).sort()).toEqual(["ccc.mp4", "ddd.webm"]);
    });

    it("should purge exactly the uploaded clips' URLs", () => {
      expect(purged).toEqual([`${host}/ccc.mp4`, `${host}/ddd.webm`]);
    });

    it("should purge after the last upload", () => {
      const lastUpload = calls.lastIndexOf(uploads[uploads.length - 1]);
      const purgeCall = calls.findIndex((c) => c.includes("/purge_cache"));
      expect(purgeCall).toBeGreaterThan(lastUpload);
    });

    it("should never pass the token on a command line", () => {
      expect(calls.filter((c) => c.includes(token))).toEqual([]);
    });

    describe("and the bucket listing is paged", () => {
      it("should treat a clip on the second page as present", () => {
        expect(uploads.filter((c) => c.includes("bbb.webm"))).toEqual([]);
      });
    });
  });

  describe("when every clip is already in the bucket", () => {
    const { result, uploads, calls } = run("all-present");

    it("should succeed", () => {
      expect(result.status).toBe(0);
    });

    it("should upload nothing", () => {
      expect(uploads).toEqual([]);
    });

    it("should not purge", () => {
      expect(calls.filter((c) => c.includes("/purge_cache"))).toEqual([]);
    });
  });

  describe("when the purge fails", () => {
    const { result } = run("purge-fails");

    it("should exit non-zero", () => {
      expect(result.status).not.toBe(0);
    });

    it("should say the purge failed and why", () => {
      expect(result.stderr).toMatch(/purg.*Authentication error/i);
    });
  });

  describe("when the bucket listing fails", () => {
    const { result, uploads } = run("list-fails");

    it("should exit non-zero", () => {
      expect(result.status).not.toBe(0);
    });

    it("should upload nothing", () => {
      expect(uploads).toEqual([]);
    });
  });

  describe("when an upload fails", () => {
    const { result, calls } = run("upload-fails");

    it("should exit non-zero", () => {
      expect(result.status).not.toBe(0);
    });

    it("should not purge", () => {
      expect(calls.filter((c) => c.includes("/purge_cache"))).toEqual([]);
    });
  });
});
