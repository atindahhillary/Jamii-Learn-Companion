// Recorded clips are named by their text, so any change to the words simply falls back until re-recorded.
export const REACTIONS = ["Ndiyo kabisa!", "Si hivyo, rafiki.", "Exactly!", "Not quite, friend."];

export function audioKey(text: string) {
  let h = 0x811c9dc5;
  for (const c of text.trim()) { h ^= c.codePointAt(0)!; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0") + text.trim().length.toString(16);
}

export function segments(text: string) {
  const out: string[] = [];
  for (const part of text.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)) {
    const lead = REACTIONS.find((r) => part.startsWith(`${r} `));
    if (lead) out.push(lead, part.slice(lead.length + 1)); else out.push(part);
  }
  return out;
}
