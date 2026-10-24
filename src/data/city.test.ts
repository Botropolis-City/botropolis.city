import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cardActions, stateNames } from "./city.ts";
import { actions } from "./drive.ts";
import { states } from "./glance.ts";

const stateSource = `package state

type State string

const (
	NeedsYou State = "needs-you"
	Working  State = "working"
	Resting  State = "resting"
)
`;

const sceneSource = `package city

const (
	ActionNone     ActionKind = ""
	ActionAttach   ActionKind = "attach"
	ActionStop     ActionKind = "stop"
	ActionPack     ActionKind = "pack"
	ActionRestore  ActionKind = "restore"
	ActionStar     ActionKind = "star"
)

func (s *Scene) Actions() []ActionKind {
	kinds = append(kinds, ActionAttach, ActionStop)
	kinds = append(kinds, s.summaryActions()...)
	kinds = append(kinds, ActionPack, ActionStar)
	return kinds
}

func (s *Scene) Other() []ActionKind {
	return []ActionKind{ActionRestore}
}
`;

const recapSource = `package city

func (s *Scene) summaryActions() []ActionKind {
	kinds := []ActionKind{ActionRead}
	return kinds
}
`;

const sceneWithRead = sceneSource.replace(`ActionStar     ActionKind = "star"`, `ActionStar     ActionKind = "star"\n\tActionRead     ActionKind = "read"`);

describe("when the city's states are read", () => {
  it("it should find each state's name", () => {
    expect(stateNames(stateSource)).toEqual(["needs-you", "working", "resting"]);
  });
});

describe("when the actions a session card offers are read", () => {
  it("it should find them in Actions and summaryActions, by label", () => {
    expect(cardActions(sceneWithRead, recapSource)).toEqual(["attach", "stop", "read", "pack", "star"]);
  });

  it("it should leave out actions only other cards offer", () => {
    expect(cardActions(sceneWithRead, recapSource)).not.toContain("restore");
  });
});

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "pkg/city/scene.go"));
const liveIt = live ? it : it.skip;
const liveName = (name: string) => (live ? name : `${name} (skipped: no botropolis checkout at ${botropolis})`);
const read = (path: string) => readFileSync(join(botropolis, path), "utf8");

describe("when the page's beacons are read", () => {
  liveIt(liveName("it should name only states the city has"), () => {
    const city = stateNames(read("pkg/state/state.go"));
    expect(states.map((s) => s.name).filter((n) => !city.includes(n))).toEqual([]);
  });
});

describe("when the page's card actions are read", () => {
  liveIt(liveName("it should list only actions a session card offers"), () => {
    const city = cardActions(read("pkg/city/scene.go"), read("pkg/city/recap.go"));
    expect(actions.filter((a) => !city.includes(a))).toEqual([]);
  });
});
