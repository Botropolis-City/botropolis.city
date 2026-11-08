export interface Fact {
  id: string;
  title: string;
  line: string;
  quote: string;
  source: string;
}

export interface Form {
  value: string;
  media: string;
}

export interface Card {
  facts: string[];
  media?: string;
  poster?: string;
  forms?: Form[];
}

const changelog = "CHANGELOG.md";
const kinds = "pkg/city/kinds.go";

// facts are what groups are and do, each in the words of the app or of
// the changelog entry that shipped it.
export const facts: Fact[] = [
  {
    id: "what",
    title: "a group",
    line: "A group is the sessions working on one thing, however many projects they cross, drawn as a line between their districts by default.",
    quote: "A group is the sessions working on one thing, however many projects they cross, drawn as a line between their districts by default.",
    source: kinds,
  },
  {
    id: "how",
    title: "how one forms",
    line: "The city finds groups in what sessions share, such as files, a branch or a team. Timing still counts alongside other evidence, but it never links one session to the next down a stream of runs.",
    quote: "but it never links one session to the next down a stream of runs",
    source: changelog,
  },
  {
    id: "neighbourhood",
    title: "a neighbourhood",
    line: "A new session takes the free lot nearest the rest of its group in its district, so a group reads as a neighbourhood.",
    quote: "A new session takes the free lot nearest the rest of its group in its district, so a group reads as a neighbourhood.",
    source: changelog,
  },
  {
    id: "kerb",
    title: "the kerb",
    line: "A low kerb runs round a group's buildings where two or more stand side by side in one district, so a group is found without reading a badge.",
    quote: "A low kerb runs round a group's buildings where two or more stand side by side in one district, so a group is found without reading a badge.",
    source: kinds,
  },
  {
    id: "line",
    title: "the line",
    line: "A link into a site that waits on another is drawn dark, and one into a site joined on a guess is dashed. Pointing at a link shows the group, the site and the route.",
    quote: "A link into a site that waits on another is drawn dark, and one into a site joined on a guess is dashed.",
    source: changelog,
  },
  {
    id: "form",
    title: "group_line_form",
    line: "The setting, in the settings panel beside group lines, draws a group's line between its districts, the default, as outlines round its buildings in each district with links between them, or from building to building.",
    quote: "draws a group's line between its districts, the default, as outlines round its buildings in each district with links between them, or from building to building",
    source: changelog,
  },
  {
    id: "point",
    title: "pointing",
    line: "Pointing at a session in a group lights the whole group. The rest of the city fades, as it does when a group is focused.",
    quote: "Pointing at a session in a group lights the whole group.",
    source: changelog,
  },
  {
    id: "teammate",
    title: "a team",
    line: "A teammate follows its lead: into the lead's group, out of it, or into none, and a team on its own is one group. A team moves as a convoy.",
    quote: "teammate follows its lead: into the lead's group, out of it, or into none, and a team on its own is one group",
    source: changelog,
  },
  {
    id: "one",
    title: "a group of one",
    line: "Every group with a session on the map is on the board, in the picker and on its member's card, with a badge and no line.",
    quote: "group with a session on the map is on the board, in the picker and on its member's card, with a badge and no line",
    source: changelog,
  },
  {
    id: "board",
    title: "the board",
    line: "City hall holds the board of groups: each piece of work, whose move it is, and what is next. g opens it, and a group's row renames it, closes it or takes a member out.",
    quote: "City hall holds the board of groups: each piece of work, whose move it is, and what is next.",
    source: kinds,
  },
  {
    id: "move",
    title: "move to group",
    line: "Move to group on a session's card, then new group…, makes a group. The city keeps the name you give it.",
    quote: "Move to group on a session's card, then new group…, makes a group.",
    source: kinds,
  },
  {
    id: "drop",
    title: "carrying one in",
    line: "Dropping a carried building on a link, or on any building in a group, moves it into that group. The move is drawn: the building fades out where it stood, a truck carries its crate across, and it fades in where it lands.",
    quote: "Dropping a carried building on a link, or on any building in a group, moves it into that group.",
    source: changelog,
  },
  {
    id: "close",
    title: "close group",
    line: "Packs every session in a group into the depot and takes the group off the board. Unpack any of them to bring it back.",
    quote: "into the depot and takes the group off the board. Unpack any of them to bring it back.",
    source: "pkg/city/actiontext.go",
  },
  {
    id: "tidy",
    title: "tidy up",
    line: "When a city opens for the first time, or after more than a week away, and there is something to tidy, a short walk opens, one card at a time: keep each group, rename it, drop it, split it by directory, or take one member out.",
    quote: "a short walk opens, one card at a time",
    source: changelog,
  },
  {
    id: "quiet",
    title: "pack up everything quiet",
    line: "One button on City Hall packs every session in no group that has rested for a week into the depot as a convoy, saying how many before and after.",
    quote: "into the depot as a convoy, saying how many before and after",
    source: changelog,
  },
];

// cards are the section's facts, each with the film's picture of it, when
// it has one; the line card shows group_line_form's three forms instead.
export const cards: Card[] = [
  { facts: ["what"] },
  { facts: ["how"], media: "metropolis/overview" },
  { facts: ["neighbourhood", "kerb"], media: "groups/kerb" },
  {
    facts: ["line", "form"],
    forms: [
      { value: "districts", media: "groups/line-districts" },
      { value: "neighbourhoods", media: "groups/line-neighbourhoods" },
      { value: "sessions", media: "groups/line-sessions" },
    ],
  },
  { facts: ["point"], media: "groups/lit" },
  { facts: ["teammate"], media: "team/team-line" },
  { facts: ["one"] },
  { facts: ["board"], media: "controls/board-rename", poster: "controls/board" },
  { facts: ["move", "drop"] },
  { facts: ["close"], media: "groups/close-group" },
  { facts: ["tidy", "quiet"], media: "tidy/walk" },
];
