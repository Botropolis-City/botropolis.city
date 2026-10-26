import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const script = resolve(__dirname, "store-soak-credentials.ts");

const fakeTerraform = `#!/usr/bin/env bash
case "$*" in
  *soak_credentials*) echo '{"write":{"access_key_id":"write-id","secret_access_key":"write-secret"},"read":{"access_key_id":"read-id","secret_access_key":"read-secret"}}' ;;
  *soak_bucket_url*) echo '"https://acct.r2.cloudflarestorage.com/soak"' ;;
  *) exit 1 ;;
esac
`;

const fakeOp = `#!/usr/bin/env bash
set -u
printf '%s\\n' "$*" >> "$FAKE_OP_DIR/argv"
[[ $1 == item ]] || exit 2
case "$2" in
  get)
    file="$FAKE_OP_DIR/items/$5.json"
    [[ -f $file ]] || exit 1
    [[ "$*" == *"--format json"* ]] && cat "$file"
    exit 0 ;;
  create)
    template="" category=""
    while (($#)); do
      [[ $1 == --template ]] && template=$2
      [[ $1 == --category ]] && category=$2
      shift
    done
    if [[ -n $template && -n $category ]]; then
      echo "[ERROR] cannot provide the item category with both the JSON template and the --category flag" >&2
      exit 1
    fi
    if [[ -z $template && -z $category ]]; then
      echo "[ERROR] provide the item category with '--category' flag" >&2
      exit 1
    fi
    if [[ $FAKE_OP_MODE == reads && -n $template ]]; then
      stat -c %a "$template" > "$FAKE_OP_DIR/mode"
      printf '%s\\n' "$template" > "$FAKE_OP_DIR/template-path"
      cp "$template" "$FAKE_OP_DIR/items/$(jq -r .title "$template").json"
    else
      echo '{"title":"Untitled APICredential","fields":[{"label":"username","value":""}]}' > "$FAKE_OP_DIR/items/Untitled APICredential.json"
    fi ;;
esac
`;

const run = (mode: "reads" | "ignores") => {
  const dir = mkdtempSync(join(tmpdir(), "soak-credentials-test-"));
  const bin = join(dir, "bin");
  spawnSync("mkdir", ["-p", bin, join(dir, "items")]);
  writeFileSync(join(bin, "terraform"), fakeTerraform, { mode: 0o755 });
  writeFileSync(join(bin, "op"), fakeOp, { mode: 0o755 });
  const result = spawnSync(process.execPath, [script], {
    encoding: "utf8",
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_OP_DIR: dir,
      FAKE_OP_MODE: mode,
      SOAK_WRITE_ITEM: "op:Vault/Box Key",
      SOAK_READ_ITEM: "op:Vault/Laptop Key",
    },
  });
  const read = (name: string) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), "utf8") : "");
  return { dir, result, read };
};

describe("store-soak-credentials", () => {
  const dirs: string[] = [];
  afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

  describe("when op reads the template it is given", () => {
    const { dir, result, read } = run("reads");
    dirs.push(dir);

    it("should succeed", () => {
      expect(result.status).toBe(0);
    });

    it("should give op a template only its owner can read", () => {
      expect(read("mode").trim()).toBe("600");
    });

    it("should hand op a template", () => {
      expect(read("template-path").trim()).not.toBe("");
    });

    it("should remove the template once op has read it", () => {
      expect(existsSync(read("template-path").trim())).toBe(false);
    });

    it("should put no key on op's command line", () => {
      expect(read("argv")).not.toMatch(/write-id|write-secret|read-id|read-secret/);
    });

    it("should print no key", () => {
      expect(result.stdout + result.stderr).not.toMatch(/write-id|write-secret|read-id|read-secret/);
    });
  });

  describe("when op ignores the template", () => {
    const { dir, result } = run("ignores");
    dirs.push(dir);

    it("should fail", () => {
      expect(result.status).toBe(1);
    });

    it("should say the items are missing", () => {
      expect(result.stderr).toMatch(/missing Vault\/Box Key/);
    });
  });
});
