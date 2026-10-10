import { describe, expect, it } from "vitest";
import { step } from "./cycle.ts";

describe("step", () => {
  const cases: [string, number, number, number][] = [
    ["moving forward from the first", 0, 1, 1],
    ["moving forward from the last", 2, 1, 0],
    ["moving back from the first", 0, -1, 2],
    ["moving back from the middle", 1, -1, 0],
  ];
  for (const [when, from, by, expected] of cases) {
    describe(`when ${when} of three`, () => {
      it(`should land on ${expected}`, () => {
        expect(step(from, by, 3)).toBe(expected);
      });
    });
  }
});
