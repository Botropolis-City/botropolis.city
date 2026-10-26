import { execFileSync, spawnSync } from "node:child_process";
import { opItems, type Access, type Credential } from "./soak.ts";

const usage = `Usage: node tools/store-soak-credentials.ts [--help]

Copies the soak bucket's two S3 keys from the Terraform outputs into 1Password:
the box's write-only key and the laptop's read-only key (item 266).
Each item gets the fields "access key id", "secret access key" and "bucket url",
so a secret-run reference is op:<vault>/<item>/<field>.

The keys go from terraform to op on standard input, never on a command line,
and nothing is printed but the items' names. An item that already exists is
left alone; delete it first to replace it.

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

const credentials: Record<Access, Credential> = output("soak_credentials");
const bucketUrl: string = output("soak_bucket_url");

let failed = false;
for (const item of opItems(credentials, refs, bucketUrl)) {
  const name = `${item.vault}/${item.template.title}`;
  const exists = spawnSync("op", ["item", "get", "--vault", item.vault, item.template.title], { stdio: "ignore" });
  if (exists.status === 0) {
    process.stdout.write(`  have ${name}\n`);
    continue;
  }
  const created = spawnSync("op", ["item", "create", "--vault", item.vault, "-"], {
    input: JSON.stringify(item.template),
    stdio: ["pipe", "ignore", "inherit"],
  });
  if (created.status === 0) {
    process.stdout.write(`  made ${name} (${item.access})\n`);
  } else {
    process.stderr.write(`  could not make ${name}\n`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
