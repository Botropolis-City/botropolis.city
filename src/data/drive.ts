export interface Row {
  label: string;
  key: string;
  binding: string;
}

export interface Menu {
  name: "Session" | "Project" | "Group";
  key: string;
  rows: Row[];
}

const row = (label: string, key: string, binding: string): Row => ({ label, key, binding });

// menus are the card's three menus as the app binds them: labels from
// pkg/city/scene.go, keys from pkg/config/bindings.go.
export const menus: Menu[] = [
  {
    name: "Session",
    key: "s",
    rows: [
      row("attach", "a", "menu_attach"),
      row("stop", "s", "menu_stop"),
      row("read", "r", "menu_read"),
      row("generate summary", "g", "menu_generate"),
      row("fork a fresh session", "f", "menu_fork"),
      row("pack", "p", "menu_pack"),
      row("breakdown", "b", "menu_breakdown"),
      row("open pull request", "o", "menu_open_pr"),
      row("demolish", "d", "menu_demolish"),
    ],
  },
  {
    name: "Project",
    key: "p",
    rows: [
      row("new session here", "n", "menu_new_here"),
      row("reveal folder", "f", "menu_reveal"),
      row("copy path", "c", "menu_copy_path"),
      row("star", "s", "menu_star"),
      row("hide project", "h", "menu_hide"),
      row("district type", "d", "menu_district_type"),
      row("show the road", "r", "menu_show_road"),
    ],
  },
  {
    name: "Group",
    key: "g",
    rows: [
      row("move to group", "m", "menu_move"),
      row("join suggested group", "a", "menu_join"),
      row("take out of group", "t", "menu_take_out"),
      row("rename group", "n", "menu_rename_group"),
      row("close group", "c", "menu_close_group"),
      row("copy stand-up", "s", "menu_standup"),
      row("mute a word", "w", "menu_mute"),
      row("focus the line", "f", "menu_focus"),
    ],
  },
];

export interface Key {
  caps: string[];
  line: string;
  quote: string;
  bare?: true;
  proof?: { file: string; text: string };
}

const bindings = "pkg/config/bindings.go";
const chord = "pkg/config/chord.go";

// keys are the map's keys the section names, each in the words of the
// changelog entry it rests on.
export const keys: Key[] = [
  {
    caps: ["space"],
    line: "opens the menu on the Session column: a column's letter, then a row's letter runs a verb, so space s p packs the session up.",
    quote: "then a row's letter runs a verb",
    proof: { file: bindings, text: '{"action_menu", ScopeMap, "space"' },
  },
  {
    caps: ["right-click"],
    line: "Right-click opens the same menu at the pointer: on a building, on a district's ground, or on a row of the groups board.",
    quote: "Right-click opens the same menu at the pointer",
    bare: true,
  },
  {
    caps: ["e"],
    line: "held: every control on screen that a key also does wears that key.",
    quote: "every control on screen that a key also does wears that key",
    proof: { file: chord, text: 'DefaultExplain = "e"' },
  },
  {
    caps: ["tab"],
    line: "walks the sessions that need you, one at a time. The needs-you count in the top bar is a button too: a click attaches that session in one click, whoever has waited longest.",
    quote: "attaches that session in one click",
    proof: { file: bindings, text: '"tab": "the next needs-you"' },
  },
  {
    caps: ["a"],
    line: "opens the clinic's list: the sessions needing you first, longest waiting at the top, then the troubled ones, each with its reason.",
    quote: "the sessions needing you first, longest waiting at the top, then the troubled ones, each with its reason",
    proof: { file: bindings, text: '{"clinic", ScopeMap, "a"' },
  },
  {
    caps: ["shift+n"],
    line: "opens New session, filled from what's under the pointer; nothing starts until you say so.",
    quote: "nothing starts until you say so",
    proof: { file: chord, text: 'DefaultNewSession = "shift+n"' },
  },
  {
    caps: ["d", "d"],
    line: "demolishes a session, in a dialog that says what it will do: the first press asks and the second confirms.",
    quote: "the first press asks and the second confirms",
    proof: { file: bindings, text: '"d": "demolish (d d)"' },
  },
  {
    caps: ["/"],
    line: "filters any list: what you type narrows it to the rows that hold it. Every list answers the same keys, the arrows or j and k to move and 1–9 to choose a row.",
    quote: "what you type narrows it to the rows that hold it",
  },
  {
    caps: ["keys"],
    line: "Every key can be rebound, in the config file's [keys] table or from the settings' keys row, and the city refuses to start if two keys would answer together.",
    quote: "if two keys would answer together",
    bare: true,
  },
];
