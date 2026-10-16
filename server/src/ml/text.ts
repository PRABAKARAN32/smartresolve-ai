// Generic words carry no department signal ("not working" can mean anything)
const STOPWORDS = new Set(
  (
    "a an the and or but if of to in on at for from with by as is are was were be been am do does did " +
    "i me my we our you your it its this that these those there here not no can could would will should " +
    "has have had since after before still very just also get got some any all every one two three new again now today " +
    "please need needs needed request issue problem working work works nothing everything anything keep keeps"
  ).split(" "),
);

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss"))
    return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/wi-?\s?fi/g, "wifi")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !/^\d+$/.test(t) && !STOPWORDS.has(t))
    .map(stem);
}
