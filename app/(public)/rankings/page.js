import { redirect } from "next/navigation";

// The Rankings page is now "Maturity" (the framework says results are not a ranking).
// Old links and bookmarks still work: they're sent to the new address.
export default async function RankingsRedirect({ searchParams }) {
  const { c } = await searchParams;
  redirect(c ? `/maturity?c=${encodeURIComponent(c)}#compare` : "/maturity");
}