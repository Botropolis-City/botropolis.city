import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import type { Manifest, ManifestEntry } from "./media.ts";
import { lenses, viewFrames, viewStills, type Scenario } from "./views.ts";

const lensSource = `package city

type Lens int

const (
	LensAttention Lens = iota
	LensWork
	LensCost
)

// Lenses is every lens in the order its key numbers them.
var Lenses = []Lens{LensAttention, LensWork, LensCost}

func (l Lens) Name() string {
	switch l {
	case LensWork:
		return "Work"
	case LensCost:
		return "Cost"
	}
	return "Attention"
}

// About is what the lens shows, in one sentence.
func (l Lens) About() string {
	switch l {
	case LensWork:
		return "Each piece of work and whose move it is."
	case LensCost:
		return "What each session has spent, and on which models."
	}
	return "Which sessions are waiting for you, and which are working."
}

// Views is the views a lens holds; its key opens the first.
func (l Lens) Views() []View {
	switch l {
	case LensWork:
		return []View{ViewGroups}
	case LensCost:
		return []View{ViewSpend, ViewModels}
	}
	return []View{ViewAttention}
}
`;

const viewSource = `package city

// Name is the view's own name, for the strip and the legend.
func (v View) Name() string {
	switch v {
	case ViewSpend:
		return "spend"
	case ViewModels:
		return "models"
	case ViewGroups:
		return "groups"
	default:
		return "attention"
	}
}
`;

const scenarioSource = `name: layers
shots:
  - name: views
    title: Three ways to read the city
    description: The lens key, then each lens in turn, then night and day.
    record: {seconds: 12, fps: 30}
    script:
      - {at: 0.5, key: V}
      - {at: 2.0, key: Digit2}
      - {at: 4.0, key: Digit3}
      - {at: 6.0, key: Digit1}
      - {at: 8.0, key: N}
      - {at: 10.0, key: N}
  - name: night
    title: The same city at night
    description: Lit windows mark the sessions that are awake.
`;

const scenario = (text: string) => parse(text) as Scenario;
const withScript = (script: string) => scenarioSource.replace(/    script:\n(?:      - .*\n)+/, `    script:\n${script}`);

describe("lenses", () => {
  describe("when given the city's lens source", () => {
    const result = lenses(lensSource);

    it("should list the lenses in the order their keys number them", () => {
      expect(result.map((l) => l.name)).toEqual(["Attention", "Work", "Cost"]);
    });

    it("should describe each lens in the city's own sentence", () => {
      expect(result.map((l) => l.about)).toEqual([
        "Which sessions are waiting for you, and which are working.",
        "Each piece of work and whose move it is.",
        "What each session has spent, and on which models.",
      ]);
    });
  });

  describe("when the source has no Lenses list", () => {
    it("should refuse it", () => {
      expect(() => lenses(lensSource.replace(/var Lenses.*\n/, ""))).toThrow(/Lenses/);
    });
  });

  describe("when a lens in the list has no name", () => {
    it("should refuse it, naming the lens", () => {
      expect(() => lenses(lensSource.replace("LensWork, LensCost}", "LensWork, LensCost, LensHealth}"))).toThrow(/LensHealth/);
    });
  });
});

describe("viewFrames", () => {
  const city = lenses(lensSource);

  describe("when given the views script: the lens key, 2, 3, 1, then N twice", () => {
    const result = viewFrames(scenario(scenarioSource), city, 12);
    const at = (name: string) => result.frames.find((f) => f.name === name)?.at;

    it("should take the section's title from the shot", () => {
      expect(result.title).toBe("Three ways to read the city");
    });

    it("should show the lenses in key order, then night", () => {
      expect(result.frames.map((f) => f.name)).toEqual(["Attention", "Work", "Cost", "Night"]);
    });

    it("should label each lens with its key, and night with n", () => {
      expect(result.frames.map((f) => f.key)).toEqual(["1", "2", "3", "n"]);
    });

    it("should take each frame half a second before the next key", () => {
      expect([at("Work"), at("Cost"), at("Attention"), at("Night")]).toEqual([3.5, 5.5, 7.5, 9.5]);
    });

    it("should ask each lens's question in the city's words", () => {
      expect(result.frames.find((f) => f.name === "Cost")?.question).toBe("What each session has spent, and on which models.");
    });

    it("should ask night's question from the night shot", () => {
      expect(result.frames.find((f) => f.name === "Night")?.question).toBe("Lit windows mark the sessions that are awake.");
    });

    it("should name each frame's image after it", () => {
      expect(result.frames.map((f) => f.image)).toEqual(["views-attention", "views-work", "views-cost", "views-night"]);
    });
  });

  describe("when the last key is a lens", () => {
    const script = ["{at: 2.0, key: Digit3}", "{at: 4.0, key: Digit1}", "{at: 6.0, key: N}", "{at: 8.0, key: N}", "{at: 10.0, key: Digit2}"];

    it("should take its frame half a second before the clip ends", () => {
      const result = viewFrames(scenario(withScript(script.map((s) => `      - ${s}\n`).join(""))), city, 12);
      expect(result.frames.find((f) => f.name === "Work")?.at).toBe(11.5);
    });
  });

  describe("when a frame falls past the clip's end", () => {
    it("should refuse, naming the frame", () => {
      expect(() => viewFrames(scenario(scenarioSource), city, 7)).toThrow(/Attention.*7/);
    });
  });

  describe("when a key names a lens the city does not have", () => {
    it("should refuse, naming the key", () => {
      expect(() => viewFrames(scenario(scenarioSource.replace("Digit3", "Digit7")), city, 12)).toThrow(/Digit7/);
    });
  });

  describe("when a lens the city has is never shown", () => {
    it("should refuse, naming the lens", () => {
      expect(() => viewFrames(scenario(scenarioSource.replace("Digit3", "Digit2")), city, 12)).toThrow(/Cost/);
    });
  });

  describe("when the scenario has no views shot", () => {
    it("should refuse it", () => {
      expect(() => viewFrames(scenario(scenarioSource.replace("name: views", "name: other")), city, 12)).toThrow(/views/);
    });
  });
});

// Item 76: the film makes a still of every view, so the section shows
// each lens's own still instead of a frame cut from layers/views.
describe("lenses, with the city's view source", () => {
  it("should give each lens its first view's name", () => {
    expect(lenses(lensSource, viewSource).map((l) => l.view)).toEqual(["attention", "groups", "spend"]);
  });
});

describe("viewStills", () => {
  const still = (shot: string, extra: Partial<ManifestEntry> = {}): ManifestEntry => ({
    file: `layers/${shot}.png`, kind: "image", format: "png", scenario: "layers", shot, title: shot, description: `about ${shot}`, width: 1920, height: 1080, ...extra,
  });
  const manifestOf = (...media: ManifestEntry[]): Manifest => ({ generated: "2026-10-25T00:00:00Z", version: "0.4.0", media });
  const city = lenses(lensSource, viewSource);
  const filmed = manifestOf(
    still("attention", { view: "attention" }),
    still("groups", { view: "groups" }),
    still("spend", { view: "spend" }),
    still("models", { view: "models" }),
    still("night", { description: "Lit windows mark the sessions that are awake." }),
  );

  describe("when the manifest has a still for each lens's first view, and a night", () => {
    const result = viewStills(filmed, scenario(scenarioSource), city);

    it("should take the section's title from the views shot", () => {
      expect(result?.title).toBe("Three ways to read the city");
    });

    it("should show the lenses in key order, then night", () => {
      expect(result?.frames.map((f) => f.name)).toEqual(["Attention", "Work", "Cost", "Night"]);
    });

    it("should label each lens with its key, and night with n", () => {
      expect(result?.frames.map((f) => f.key)).toEqual(["1", "2", "3", "n"]);
    });

    it("should use each lens's still, by its image name", () => {
      expect(result?.frames.map((f) => f.image)).toEqual(["layers-attention", "layers-groups", "layers-spend", "layers-night"]);
    });

    it("should ask each lens's question in the city's words, and night's from its still", () => {
      expect(result?.frames.map((f) => f.question)).toEqual([...city.map((l) => l.about), "Lit windows mark the sessions that are awake."]);
    });
  });

  describe("when a lens's first view has no still", () => {
    const short = manifestOf(...filmed.media.filter((m) => m.view !== "groups"));

    it("should refuse, naming the lens and the view", () => {
      expect(() => viewStills(short, scenario(scenarioSource), city)).toThrow(/Work.*groups/);
    });
  });

  describe("when the manifest has no view stills at all", () => {
    it("should say there are none, so the import falls back to frames of the views clip", () => {
      expect(viewStills(manifestOf(still("night")), scenario(scenarioSource), city)).toBeUndefined();
    });
  });
});

const botropolis = resolve(process.env.BOTROPOLIS_DIR ?? "../botropolis");
const live = existsSync(join(botropolis, "pkg/city/lens.go"));

describe.skipIf(!live)(`when the city's own sources are checked out at ${botropolis}${live ? "" : " (they are not, so this is skipped)"}`, () => {
  const read = (path: string) => readFileSync(join(botropolis, path), "utf8");

  it("should read a frame for every lens the city has, inside the clip", () => {
    const s = scenario(read("demo/scenarios/layers.yaml"));
    const seconds = s.shots.find((shot) => shot.name === "views")?.record?.seconds ?? 0;
    expect(() => viewFrames(s, lenses(read("pkg/city/lens.go")), seconds)).not.toThrow();
  });

  it("should film a still of every lens's first view", () => {
    const city = lenses(read("pkg/city/lens.go"), read("pkg/city/view.go"));
    const filmed = (parse(read("demo/scenarios/layers.yaml")) as { shots: { view?: string }[] }).shots.map((s) => s.view);
    expect(city.map((l) => l.view).filter((v) => !filmed.includes(v))).toEqual([]);
  });
});
