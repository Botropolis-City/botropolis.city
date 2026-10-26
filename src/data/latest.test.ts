import { describe, expect, it, vi } from "vitest";
import fixture from "../../testing/fixtures/release.json" with { type: "json" };
import { highlights, loadRelease, parseRelease } from "./latest.ts";

describe("when a release is parsed", () => {
  describe("and it is a published release", () => {
    const parsed = parseRelease(fixture);

    it("it should take the version from its tag without the v", () => {
      expect(parsed.version).toBe("0.9.0");
    });

    it("it should take its date", () => {
      expect(parsed.date).toBe("2027-01-02");
    });

    it("it should take its link", () => {
      expect(parsed.url).toBe(fixture.html_url);
    });

    it("it should take its notes", () => {
      expect(parsed.notes).toBe(fixture.body);
    });
  });

  describe("and it has no tag_name", () => {
    it("it should throw", () => {
      expect(() => parseRelease({ ...fixture, tag_name: undefined })).toThrow(/tag/);
    });
  });

  describe("and its tag is not a version", () => {
    it("it should throw", () => {
      expect(() => parseRelease({ ...fixture, tag_name: "nightly" })).toThrow(/nightly/);
    });
  });

  describe("and it has no notes", () => {
    it("it should throw", () => {
      expect(() => parseRelease({ ...fixture, body: "" })).toThrow(/notes/);
    });
  });

  describe("and it is not an object", () => {
    it("it should throw", () => {
      expect(() => parseRelease(null)).toThrow();
    });
  });
});

describe("when the highlights of the notes are read", () => {
  const read = highlights(fixture.body);
  const leads = (heading: string) => read.find((s) => s.heading === heading)?.items.map((i) => i.map((s) => s.text).join(""));

  describe("and a section has bullets", () => {
    it("it should group them under their sections' headings, in order", () => {
      expect(read.map((s) => s.heading)).toEqual(["Added", "Changed", "Fixed"]);
    });

    it("it should take each bullet's bold lead, in order", () => {
      expect(leads("Added")).toEqual(["The fixture's first addition.", "fixture names its command in code."]);
    });
  });

  describe("and a lead holds code", () => {
    it("it should keep it as a code segment", () => {
      expect(read[0]?.items[1]?.[0]).toEqual({ text: "fixture", code: true });
    });
  });

  describe("and a bullet has no bold lead", () => {
    it("it should take its first sentence", () => {
      expect(leads("Changed")?.[1]).toBe("A change with no bold lead.");
    });
  });

  describe("and a lead holds a link", () => {
    it("it should keep only the link's text", () => {
      expect(highlights("### Added\n\n- **[docs/x.md](docs/x.md) says so.**\n")[0]?.items[0]).toEqual([{ text: "docs/x.md says so." }]);
    });
  });

  describe("and bullets come before any section heading", () => {
    it("it should leave them out", () => {
      expect(highlights("**Before you upgrade:**\n- **Restart.**\n\n### Fixed\n\n- **A fix.**\n").map((s) => s.heading)).toEqual(["Fixed"]);
    });
  });

  describe("and the notes have no bullets", () => {
    it("it should give none", () => {
      expect(highlights("Just a paragraph.\n")).toEqual([]);
    });
  });
});

describe("when the latest release is loaded", () => {
  const answer = (status: number, body: unknown) => vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

  describe("and BOTROPOLIS_RELEASE names a fixture", () => {
    it("it should read the fixture", async () => {
      expect((await loadRelease({ BOTROPOLIS_RELEASE: "testing/fixtures/release.json" }, answer(500, {}))).version).toBe("0.9.0");
    });
  });

  describe("and GitHub answers with the release", () => {
    it("it should ask for the latest release of botropolis", async () => {
      const fetcher = answer(200, fixture);
      await loadRelease({}, fetcher);
      expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.github.com/repos/Botropolis-City/botropolis/releases/latest");
    });
  });

  describe("and GitHub answers with an error", () => {
    it("it should throw rather than give a guess", async () => {
      await expect(loadRelease({}, answer(503, {}))).rejects.toThrow(/503/);
    });
  });

  describe("and GITHUB_TOKEN is set", () => {
    it("it should send it as a bearer token", async () => {
      const fetcher = answer(200, fixture);
      await loadRelease({ GITHUB_TOKEN: "t" }, fetcher);
      expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer t" });
    });
  });

  describe("and GITHUB_TOKEN is not set", () => {
    it("it should send no authorization", async () => {
      const fetcher = answer(200, fixture);
      await loadRelease({}, fetcher);
      expect(fetcher.mock.calls[0]?.[1]?.headers).not.toHaveProperty("Authorization");
    });
  });
});
