import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({ children }) {
  // Check whether someone is signed in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <Header signedIn={!!user} />
      <div className="site-main">{children}</div>
      <Footer />
    </>
  );
}