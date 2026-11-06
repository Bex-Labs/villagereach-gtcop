// Who took part in VillageReach's round 1 assessment (from the gap analysis).
// Change these lists when a new round starts.

export const COVERAGE_ROUND = "Round 1";

// Countries whose policy documents were scored
export const ROUND1_ASSESSED = [
  "BJ", "BF", "CV", "CI", "GM", "GH", "GN", "ML", "NG", "SN", "TG",
  "ET", "KE", "MG", "RW", "TZ", "BW", "MW", "NA", "ZA", "ZM", "CM", "CD",
];

// Countries that shared material, but none of it could be scored
export const ROUND1_SHARED = ["UG", "CG"];

export function coverageOf(iso) {
  if (ROUND1_ASSESSED.includes(iso)) return "assessed";
  if (ROUND1_SHARED.includes(iso)) return "shared";
  return "none";
}

export const COVERAGE_TEXT = {
  assessed: {
    label: "Assessed",
    status: "Assessed in round 1",
    detail: "Results are provisional and being reviewed with the government through WHO.",
  },
  shared: {
    label: "Shared material, not scored",
    status: "Shared material, not scored",
    detail: "Its material informs the analysis, but no document was eligible for scoring.",
  },
  none: {
    label: "Not covered yet",
    status: "Not covered in round 1",
    detail: "Could be included in a future round.",
  },
};