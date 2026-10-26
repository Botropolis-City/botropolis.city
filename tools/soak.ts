export type Access = "write" | "read";

export type Credential = { access_key_id: string; secret_access_key: string };

export type Field = { id: string; label: string; type: "STRING" | "CONCEALED" | "URL"; value: string };

export type OpItem = {
  access: Access;
  vault: string;
  template: { title: string; category: "API_CREDENTIAL"; fields: Field[] };
};

const accesses: Access[] = ["write", "read"];

export function opCreateArgs(item: OpItem, templatePath: string): string[] {
  return ["item", "create", "--vault", item.vault, "--template", templatePath];
}

export type Op = {
  exists(vault: string, title: string): boolean;
  create(item: OpItem): boolean;
  fields(vault: string, title: string): { label: string; value: string }[] | null;
};

export type Outcome = "have" | "made" | "failed" | "missing" | "incomplete";

export type Result = { access: Access; name: string; outcome: Outcome; missing?: string[] };

function check(item: OpItem, op: Op): { outcome: "missing" | "incomplete"; missing: string[] } | null {
  const found = op.fields(item.vault, item.template.title);
  if (!found) return { outcome: "missing", missing: item.template.fields.map((f) => f.label) };
  const missing = item.template.fields
    .map((f) => f.label)
    .filter((label) => !found.some((f) => f.label === label && f.value !== ""));
  return missing.length ? { outcome: "incomplete", missing } : null;
}

export function storeItems(items: OpItem[], op: Op): Result[] {
  return items.map((item) => {
    const base = { access: item.access, name: `${item.vault}/${item.template.title}` };
    const had = op.exists(item.vault, item.template.title);
    if (!had && !op.create(item)) return { ...base, outcome: "failed" };
    const fault = check(item, op);
    return fault ? { ...base, ...fault } : { ...base, outcome: had ? "have" : "made" };
  });
}

export function stored(results: Result[]): boolean {
  return results.every((r) => r.outcome === "have" || r.outcome === "made");
}

export function parseItemRef(ref: string): { vault: string; title: string } {
  if (!ref.startsWith("op:")) throw new Error(`${ref}: want an op: reference`);
  const parts = ref.slice(3).split("/");
  if (parts.length !== 2 || parts.some((p) => p === "")) {
    throw new Error(`${ref}: want op:<vault>/<item>, a vault and an item and no field`);
  }
  return { vault: parts[0], title: parts[1] };
}

export function opItems(
  credentials: Record<Access, Credential>,
  refs: Record<Access, string>,
  bucketUrl: string,
): OpItem[] {
  return accesses.map((access) => {
    const credential = credentials[access];
    if (!credential) throw new Error(`no ${access} credential in the Terraform output`);
    const { vault, title } = parseItemRef(refs[access]);
    return {
      access,
      vault,
      template: {
        title,
        category: "API_CREDENTIAL",
        fields: [
          { id: "access_key_id", label: "access key id", type: "STRING", value: credential.access_key_id },
          { id: "secret_access_key", label: "secret access key", type: "CONCEALED", value: credential.secret_access_key },
          { id: "bucket_url", label: "bucket url", type: "URL", value: bucketUrl },
        ],
      },
    };
  });
}
