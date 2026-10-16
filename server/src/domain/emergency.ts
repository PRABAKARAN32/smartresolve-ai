const DANGER =
  /\b(fire|smoke|burning|sparks?|sparking|live wire|exposed wire|electric(al)? shock|electrocut\w*|gas leak|injur(y|ed)|bleeding|collapsed?|unconscious)\b/i;

export const EMERGENCY_GUIDANCE =
  "If anyone is in danger, contact campus emergency personnel immediately. " +
  "SmartResolve is a tracking tool, not an emergency service.";

export function detectEmergency(
  text: string,
  hazardFlag: boolean,
): string | null {
  return hazardFlag || DANGER.test(text) ? EMERGENCY_GUIDANCE : null;
}
