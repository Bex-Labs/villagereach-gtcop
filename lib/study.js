// The three study material sections (from the proposal).
// Descriptions can be updated once VillageReach confirms the wording.
export const SECTIONS = [
  {
    key: "matrix",
    label: "Assessment matrix",
    description: "The framework used to assess each country's telehealth regulation.",
  },
  {
    key: "metrics",
    label: "Metrics tool",
    description: "The metrics used to score and rank countries across the five thematic areas.",
  },
  {
    key: "recommendations",
    label: "Policy recommendations",
    description: "Recommendations developed from the assessment findings.",
  },
];

export const sectionLabel = (key) => SECTIONS.find((s) => s.key === key)?.label ?? key;