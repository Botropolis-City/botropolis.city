import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { opCreateArgs, opItems, storeItems, stored, type Access, type Credential, type Op } from "./soak.ts";

const usage = `Usage: node tools/store-soak-credentials.ts [--help]

Copies the soak bucket's two S3 keys from the Terraform outputs into 1Password:
the box's write-only key and the laptop's read-only key (item 266).
Each item gets the fields "access key id", "secret access key" and "bucket url",
so a secret-run reference is op:<vault>/<item>/<field>.

Each item's template is written to a file only its owner can read, in a private
temporary directory removed as soon as op has read it; no key is ever on a
command line. Every item, made now or already there, is then read back by its
title, and the run fails unless each field is present and not empty. Nothing is
printed but the items' names and what is missing. An item that already exists
is left alone; archive it first to replace it.

Environment:
  TF_DIR          the Terraform directory      (default: infra)
  SOAK_WRITE_ITEM op:<vault>/<item> for the write-only key
  SOAK_READ_ITEM  op:<vault>/<item> for the read-only key

Neither has a default: set them in the git-ignored .env, so no public file
names a vault or an item.
`;

if (process.argv.includes("-h") || process.argv.includes("--help")) {
  process.stdout.write(usage);
  process.exit(0);
}

const env = (name: string) => {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`${name} is not set\n\n${usage}`);
    process.exit(2);
  }
  return value;
};

const refs = { write: env("SOAK_WRITE_ITEM"), read: env("SOAK_READ_ITEM") };
const tfDir = process.env.TF_DIR ?? "infra";

const output = (name: string) =>
  JSON.parse(execFileSync("terraform", [`-chdir=${tfDir}`, "output", "-json", name], { encoding: "utf8" }));

const op: Op = {
  exists: (vault, title) => spawnSync("op", ["item", "get", "--vault", vault, title], { stdio: "ignore" }).status === 0,

  create: (item) => {
    const dir = mkdtempSync(join(tmpdir(), "soak-credentials-"));
    try {
      const path = join(dir, "item.json");
      writeFileSync(path, JSON.stringify(item.template), { mode: 0o600 });
      return spawnSync("op", opCreateArgs(item, path), { stdio: ["ignore", "ignore", "inherit"] }).status === 0;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },

  fields: (vault, title) => {
    const got = spawnSync("op", ["item", "get", "--vault", vault, title, "--format", "json", "--reveal"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (got.status !== 0) return null;
    const fields: { label?: string; value?: string }[] = JSON.parse(got.stdout).fields ?? [];
    return fields.map((f) => ({ label: f.label ?? "", value: f.value ?? "" }));
  },
};

const credentials: Record<Access, Credential> = output("soak_credentials");
const bucketUrl: string = output("soak_bucket_url");

const results = storeItems(opItems(credentials, refs, bucketUrl), op);
for (const r of results) {
  const line = `  ${r.outcome} ${r.name} (${r.access})${r.missing ? `: missing ${r.missing.join(", ")}` : ""}\n`;
  (r.outcome === "have" || r.outcome === "made" ? process.stdout : process.stderr).write(line);
}
process.exit(stored(results) ? 0 : 1);
