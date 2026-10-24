import { describe, expect, it } from "vitest";
import { start } from "./install.ts";

describe("when the start commands are read", () => {
  const lines = start.split("\n");

  it("it should begin with botropolis setup", () => {
    expect(lines[0]).toBe("botropolis setup");
  });

  it("it should not start the daemon by hand", () => {
    expect(lines.filter((l) => l.includes("systemctl"))).toEqual([]);
  });

  for (const old of ["tui", "resume", "prune", "install-hooks", "version"]) {
    describe(`and it is the deprecated ${old}`, () => {
      it("it should not use it", () => {
        expect(lines.filter((l) => l.split(/\s+/)[1] === old)).toEqual([]);
      });
    });
  }
});
