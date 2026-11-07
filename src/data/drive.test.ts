import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { keys, menus } from "./drive.ts";

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "pkg/config/bindings.go"));
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);
const read = (file: string) => (live ? readFileSync(join(botropolis, file), "utf8") : "");

// Item 360: 0.4.1 folded the card's row of buttons into one direct verb
// and three menus, so the section names the menus as the app binds them.
describe("when the card's menus are read", () => {
  const bindings = read("pkg/config/bindings.go");
  const scene = read("pkg/city/scene.go");

  it("it should have Session, Project and Group, in that order", () => {
    expect(menus.map((m) => m.name)).toEqual(["Session", "Project", "Group"]);
  });

  for (const menu of menus) {
    describe(`and it is the ${menu.name} menu`, () => {
      liveIt(liveName("its column letter should be the one the app binds"), () => {
        expect(bindings).toContain(`{"menu_${menu.name.toLowerCase()}", ScopeMenu, "${menu.key}"`);
      });

      for (const row of menu.rows) {
        describe(`and it is ${row.label}`, () => {
          liveIt(liveName("its label should be the app's"), () => {
            expect(scene).toContain(`ActionKind = "${row.label}"`);
          });

          liveIt(liveName("its key should be the one the app binds"), () => {
            expect(bindings).toContain(`{"${row.binding}", ScopeMenu${menu.name}, "${row.key}"`);
          });
        });
      }
    });
  }
});

describe("when the keys are read", () => {
  const changelog = read("CHANGELOG.md");

  for (const k of keys) {
    describe(`and it is ${k.caps.join(" ")}`, () => {
      if (k.proof) {
        const { file, text } = k.proof;
        liveIt(liveName("its key should be the one the app binds"), () => {
          expect(read(file)).toContain(text);
        });
      }

      it("its line should contain its quote", () => {
        expect(k.line).toContain(k.quote);
      });

      liveIt(liveName("its quote should be in the app's CHANGELOG.md"), () => {
        expect(changelog).toContain(k.quote);
      });
    });
  }
});
