// Editable text on the public site (G-03).
// "default" is shown until an admin saves their own wording.
export const CONTENT_FIELDS = [
  {
    key: "home_eyebrow",
    label: "Home page: small label above the title",
    type: "input",
    default: "GTCOP regulatory assessment",
  },
  {
    key: "home_title",
    label: "Home page: main title",
    type: "input",
    default: "Telehealth regulation across Africa, in one place",
  },
  {
    key: "home_intro",
    label: "Home page: introduction",
    type: "textarea",
    default:
      "Explore the policies, guidelines and laws each country has in place, and see how countries compare on telehealth maturity.",
  },
  {
    key: "about_title",
    label: "About page: title",
    type: "input",
    default: "About this platform",
  },
  {
    key: "about_body",
    label: "About page: text",
    type: "textarea",
    default: `This platform is VillageReach's online home for the GTCOP telehealth regulatory assessment.

It brings together three things in one place:
- A repository of telehealth documents (reports, guidelines, plans and related materials), organised by country.
- The assessment findings: each country's telehealth maturity ranking across five thematic areas.
- The study materials: the assessment matrix and metrics used to rank countries, and the policy recommendations developed from the findings.

Anyone can view country profiles, rankings, documents and study materials. VillageReach manages the content, and country representatives will be able to add new documents over time.`,
  },
];

// Returns { key: text } for every field, using the saved text or the default
export async function getContent(supabase) {
  const { data } = await supabase.from("site_content").select("key, value, updated_at");
  const saved = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  const content = Object.fromEntries(CONTENT_FIELDS.map((f) => [f.key, saved[f.key] || f.default]));
  const lastSaved = (data ?? []).map((r) => r.updated_at).sort().pop() ?? "never";
  return { content, lastSaved };
}