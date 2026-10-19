import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Load the Source Sans 3 font (the font VillageReach's website uses)
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

// Text shown in the browser tab and in search results / shared links
export const metadata = {
  title: "GTCOP Telehealth Regulatory Assessment | VillageReach",
  description:
    "Telehealth policy documents and maturity rankings for African countries, from the GTCOP regulatory assessment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sourceSans.className}>{children}</body>
    </html>
  );
}