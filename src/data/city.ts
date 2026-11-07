export function stateNames(source: string): string[] {
  return [...source.matchAll(/^\s*\w+\s+State\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
}

function body(source: string, func: string, receiver = "s *Scene"): string {
  const start = source.indexOf(`func (${receiver}) ${func}()`);
  if (start < 0) return "";
  const end = source.indexOf("\n}\n", start);
  return source.slice(start, end < 0 ? undefined : end);
}

function used(source: string): string[] {
  return [...source.matchAll(/\bAction[A-Z]\w*/g)].map((m) => m[0]).filter((id) => id !== "ActionKind");
}

// lensFirsts are the verbs each lens puts at the front of a card, with a
// constant that stands for an action read as that action.
function lensFirsts(lens: string): string[] {
  const aliases = new Map([...lens.matchAll(/^const\s+(\w+)\s*=\s*(Action\w+)/gm)].map((m) => [m[1], m[2]]));
  return [...body(lens, "first", "l Lens").matchAll(/return\s+(\w+)/g)].map((m) => aliases.get(m[1]) ?? m[1]);
}

export function cardActions(scene: string, recap: string, lens = ""): string[] {
  const labels = new Map([...scene.matchAll(/^\s*(Action\w+)\s+ActionKind\s*=\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
  const actions = body(scene, "Actions");
  const at = actions.indexOf("s.summaryActions()");
  const ids = at < 0 ? used(actions) : [...used(actions.slice(0, at)), ...used(body(recap, "summaryActions")), ...used(actions.slice(at))];
  ids.push(...lensFirsts(lens));
  return [...new Set(ids.map((id) => labels.get(id)).filter((l): l is string => !!l))];
}
