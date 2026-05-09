function normalizeSkill(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeSkillList(skills) {
  if (!Array.isArray(skills)) return [];
  const seen = new Set();
  const normalized = [];
  for (const raw of skills) {
    const skill = normalizeSkill(raw);
    if (!skill || seen.has(skill)) continue;
    seen.add(skill);
    normalized.push(skill);
  }
  return normalized;
}

function extractSkillKeywords(text) {
  if (!text) return [];
  return normalizeSkillList(
    String(text)
      .split(/[\n,;|/]/g)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

module.exports = {
  normalizeSkill,
  normalizeSkillList,
  extractSkillKeywords,
};
