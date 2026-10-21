import { createClient } from "@/lib/supabase/server";
import { getContent } from "@/lib/content";
import Link from "next/link";

export const metadata = {
  title: "About | GTCOP Assessment",
  description: "About VillageReach's GTCOP telehealth regulatory assessment platform.",
};

export default async function AboutPage() {
  const supabase = await createClient();
  const { content } = await getContent(supabase);

  return (
    <main className="container page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / About</p>
      <article className="card study-article">
        <p className="eyebrow">About</p>
        <h1>{content.about_title}</h1>
        <div className="study-body">{content.about_body}</div>
      </article>
    </main>
  );
}