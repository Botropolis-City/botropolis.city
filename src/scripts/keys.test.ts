import { describe, expect, it } from "vitest";
import { loadEnabled, saveEnabled, shouldHandle } from "./keys.ts";

const press = (over: Partial<KeyboardEvent> & { target?: EventTarget | null } = {}) =>
  ({ key: "v", ctrlKey: false, metaKey: false, altKey: false, target: document.body, ...over }) as KeyboardEvent;

describe("shouldHandle", () => {
  describe("when shortcuts are on", () => {
    describe("and a bare key is pressed on the page", () => {
      it("should handle it", () => {
        expect(shouldHandle(press(), true)).toBe(true);
      });
    });

    for (const mod of ["ctrlKey", "metaKey", "altKey"] as const) {
      describe(`and ${mod} is held`, () => {
        it("should leave it to the browser", () => {
          expect(shouldHandle(press({ [mod]: true }), true)).toBe(false);
        });
      });
    }

    for (const tag of ["input", "textarea", "select"]) {
      describe(`and focus is in a ${tag}`, () => {
        it("should leave it to the field", () => {
          expect(shouldHandle(press({ target: document.createElement(tag) }), true)).toBe(false);
        });
      });
    }

    describe("and focus is in editable content", () => {
      it("should leave it to the editor", () => {
        const el = document.createElement("div");
        el.contentEditable = "true";
        expect(shouldHandle(press({ target: el }), true)).toBe(false);
      });
    });
  });

  describe("when shortcuts are off", () => {
    it("should handle nothing", () => {
      expect(shouldHandle(press(), false)).toBe(false);
    });
  });
});

describe("the remembered setting", () => {
  describe("when nothing has been saved", () => {
    it("should default to on", () => {
      expect(loadEnabled(new Map() as unknown as Storage)).toBe(true);
    });
  });

  describe("when shortcuts were switched off", () => {
    it("should come back off", () => {
      const store = new Map<string, string>();
      const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage;
      saveEnabled(storage, false);
      expect(loadEnabled(storage)).toBe(false);
    });
  });

  describe("when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    it("should read as on", () => {
      expect(loadEnabled(broken)).toBe(true);
    });

    it("should not throw on save", () => {
      expect(() => saveEnabled(broken, false)).not.toThrow();
    });
  });
});
