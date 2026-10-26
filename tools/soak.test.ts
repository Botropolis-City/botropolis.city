import { describe, expect, it } from "vitest";
import { opCreateArgs, opItems, parseItemRef, storeItems, stored, type OpItem } from "./soak.ts";

describe("parseItemRef", () => {
  describe("when given a reference to a vault and an item", () => {
    const ref = parseItemRef("op:Vault/Some Item");

    it("should give the vault", () => {
      expect(ref.vault).toBe("Vault");
    });

    it("should give the item's title", () => {
      expect(ref.title).toBe("Some Item");
    });
  });

  describe("when given a reference that names a field", () => {
    it("should refuse it", () => {
      expect(() => parseItemRef("op:Vault/Item/field")).toThrow(/vault and an item/);
    });
  });

  describe("when given a reference in another scheme", () => {
    it("should refuse it", () => {
      expect(() => parseItemRef("pass:Vault/Item")).toThrow(/op:/);
    });
  });
});

describe("opItems", () => {
  const credentials = {
    write: { access_key_id: "write-id", secret_access_key: "write-secret" },
    read: { access_key_id: "read-id", secret_access_key: "read-secret" },
  };
  const refs = { write: "op:Vault/Box Key", read: "op:Vault/Laptop Key" };
  const bucketUrl = "https://acct.r2.cloudflarestorage.com/soak";

  describe("when given both credentials", () => {
    const items = opItems(credentials, refs, bucketUrl);
    const field = (access: "write" | "read", label: string) =>
      items.find((i) => i.access === access)?.template.fields.find((f) => f.label === label);

    it("should make one item for each", () => {
      expect(items.map((i) => i.access)).toEqual(["write", "read"]);
    });

    it("should put each item in its reference's vault", () => {
      expect(items.map((i) => i.vault)).toEqual(["Vault", "Vault"]);
    });

    it("should title each item from its reference", () => {
      expect(items.map((i) => i.template.title)).toEqual(["Box Key", "Laptop Key"]);
    });

    it("should hold the access key id", () => {
      expect(field("write", "access key id")?.value).toBe("write-id");
    });

    it("should hold the secret access key", () => {
      expect(field("read", "secret access key")?.value).toBe("read-secret");
    });

    it("should conceal the secret access key", () => {
      expect(field("write", "secret access key")?.type).toBe("CONCEALED");
    });

    it("should hold the bucket's URL", () => {
      expect(field("read", "bucket url")?.value).toBe(bucketUrl);
    });
  });

  describe("when a credential is missing", () => {
    it("should refuse", () => {
      expect(() => opItems({ write: credentials.write } as typeof credentials, refs, bucketUrl)).toThrow(/read/);
    });
  });
});

describe("opCreateArgs", () => {
  describe("when given an item", () => {
    const [item] = opItems(
      {
        write: { access_key_id: "write-id", secret_access_key: "write-secret" },
        read: { access_key_id: "read-id", secret_access_key: "read-secret" },
      },
      { write: "op:Vault/Box Key", read: "op:Vault/Laptop Key" },
      "https://acct.r2.cloudflarestorage.com/soak",
    );
    const args = opCreateArgs(item, "/private/dir/item.json");
    const flag = (name: string) => args[args.indexOf(name) + 1];

    it("should create an item", () => {
      expect(args.slice(0, 2)).toEqual(["item", "create"]);
    });

    it("should name the item's vault", () => {
      expect(flag("--vault")).toBe("Vault");
    });

    it("should leave the category to the template", () => {
      expect(args).not.toContain("--category");
    });

    it("should read the template from the file it is given", () => {
      expect(flag("--template")).toBe("/private/dir/item.json");
    });

    it("should not also ask for standard input", () => {
      expect(args).not.toContain("-");
    });

    it("should carry no secret", () => {
      expect(args.join(" ")).not.toMatch(/write-id|write-secret|https:/);
    });
  });
});

describe("storeItems", () => {
  const items = opItems(
    {
      write: { access_key_id: "write-id", secret_access_key: "write-secret" },
      read: { access_key_id: "read-id", secret_access_key: "read-secret" },
    },
    { write: "op:Vault/Box Key", read: "op:Vault/Laptop Key" },
    "https://acct.r2.cloudflarestorage.com/soak",
  );

  type Stored = { title: string; fields: { label: string; value: string }[] };

  const fakeOp = (opts: { readsTemplate: boolean; existing?: Stored[]; createFails?: boolean }) => {
    const vault: Stored[] = [...(opts.existing ?? [])];
    return {
      vault,
      op: {
        exists: (_v: string, title: string) => vault.some((s) => s.title === title),
        create: (item: OpItem) => {
          if (opts.createFails) return false;
          vault.push(
            opts.readsTemplate
              ? { title: item.template.title, fields: item.template.fields.map(({ label, value }) => ({ label, value })) }
              : { title: "Untitled APICredential", fields: [{ label: "username", value: "" }] },
          );
          return true;
        },
        fields: (_v: string, title: string) => vault.find((s) => s.title === title)?.fields ?? null,
      },
    };
  };

  describe("when op reads the template", () => {
    const results = storeItems(items, fakeOp({ readsTemplate: true }).op);

    it("should report both items made", () => {
      expect(results.map((r) => r.outcome)).toEqual(["made", "made"]);
    });

    it("should report success", () => {
      expect(stored(results)).toBe(true);
    });
  });

  describe("when op ignores the template", () => {
    const results = storeItems(items, fakeOp({ readsTemplate: false }).op);

    it("should report each item as not found", () => {
      expect(results.map((r) => r.outcome)).toEqual(["missing", "missing"]);
    });

    it("should report failure", () => {
      expect(stored(results)).toBe(false);
    });
  });

  describe("when op makes an item with a field left empty", () => {
    const fake = fakeOp({ readsTemplate: true });
    const create = fake.op.create;
    fake.op.create = (item: OpItem) => {
      const ok = create(item);
      fake.vault.at(-1)!.fields.find((f) => f.label === "secret access key")!.value = "";
      return ok;
    };
    const results = storeItems(items, fake.op);

    it("should name the empty field", () => {
      expect(results[0].missing).toEqual(["secret access key"]);
    });

    it("should report failure", () => {
      expect(stored(results)).toBe(false);
    });
  });

  describe("when op fails to create", () => {
    const results = storeItems(items, fakeOp({ readsTemplate: true, createFails: true }).op);

    it("should report failure", () => {
      expect(stored(results)).toBe(false);
    });
  });

  describe("when an item already exists", () => {
    describe("and it is complete", () => {
      const complete = { title: "Box Key", fields: items[0].template.fields.map(({ label, value }) => ({ label, value })) };
      const fake = fakeOp({ readsTemplate: true, existing: [complete] });
      const results = storeItems(items, fake.op);

      it("should leave it alone", () => {
        expect(fake.vault.filter((s) => s.title === "Box Key")).toHaveLength(1);
      });

      it("should report it as had", () => {
        expect(results[0].outcome).toBe("have");
      });
    });

    describe("and it is incomplete", () => {
      const results = storeItems(items, fakeOp({ readsTemplate: true, existing: [{ title: "Box Key", fields: [] }] }).op);

      it("should report failure", () => {
        expect(stored(results)).toBe(false);
      });
    });
  });

  describe("when any result is reported", () => {
    const results = storeItems(items, fakeOp({ readsTemplate: true }).op);

    it("should carry no secret", () => {
      expect(JSON.stringify(results)).not.toMatch(/write-id|write-secret|read-id|read-secret/);
    });
  });
});
