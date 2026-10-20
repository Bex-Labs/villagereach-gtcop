import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Layout for public pages: header + page + footer
export default function PublicLayout({ children }) {
  return (
    <>
      <Header />
      <div className="site-main">{children}</div>
      <Footer />
    </>
  );
}