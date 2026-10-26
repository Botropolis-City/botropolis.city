import { describe, expect, it } from "vitest";
import { opCreateArgs, opItems, parseItemRef } from "./soak.ts";

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
    const args = opCreateArgs(item);
    const flag = (name: string) => args[args.indexOf(name) + 1];

    it("should create an item", () => {
      expect(args.slice(0, 2)).toEqual(["item", "create"]);
    });

    it("should name the item's vault", () => {
      expect(flag("--vault")).toBe("Vault");
    });

    it("should name the template's category", () => {
      expect(flag("--category")).toBe("API Credential");
    });

    it("should read the template from standard input", () => {
      expect(args.at(-1)).toBe("-");
    });

    it("should carry no secret", () => {
      expect(args.join(" ")).not.toMatch(/write-id|write-secret|https:/);
    });
  });
});
