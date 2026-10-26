export type Access = "write" | "read";

export type Credential = { access_key_id: string; secret_access_key: string };

export type Field = { id: string; label: string; type: "STRING" | "CONCEALED" | "URL"; value: string };

export type OpItem = {
  access: Access;
  vault: string;
  template: { title: string; category: "API_CREDENTIAL"; fields: Field[] };
};

const accesses: Access[] = ["write", "read"];

const categoryNames: Record<OpItem["template"]["category"], string> = {
  API_CREDENTIAL: "API Credential",
};

export function opCreateArgs(item: OpItem): string[] {
  return ["item", "create", "--vault", item.vault, "--category", categoryNames[item.template.category], "-"];
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
