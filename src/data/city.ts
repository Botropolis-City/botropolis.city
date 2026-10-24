export function stateNames(source: string): string[] {
  return [...source.matchAll(/^\s*\w+\s+State\s*=\s*"([^"]+)"/gm)].map((m) => m[1]);
}

function body(source: string, func: string): string {
  const start = source.indexOf(`func (s *Scene) ${func}()`);
  if (start < 0) return "";
  const end = source.indexOf("\n}\n", start);
  return source.slice(start, end < 0 ? undefined : end);
}

function used(source: string): string[] {
  return [...source.matchAll(/\bAction[A-Z]\w*/g)].map((m) => m[0]).filter((id) => id !== "ActionKind");
}

export function cardActions(scene: string, recap: string): string[] {
  const labels = new Map([...scene.matchAll(/^\s*(Action\w+)\s+ActionKind\s*=\s*"([^"]*)"/gm)].map((m) => [m[1], m[2]]));
  const actions = body(scene, "Actions");
  const at = actions.indexOf("s.summaryActions()");
  const ids = at < 0 ? used(actions) : [...used(actions.slice(0, at)), ...used(body(recap, "summaryActions")), ...used(actions.slice(at))];
  return [...new Set(ids.map((id) => labels.get(id)).filter((l): l is string => !!l))];
}
