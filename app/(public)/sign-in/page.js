import SignInForm from "./SignInForm";

export const metadata = { title: "Sign in | GTCOP Assessment" };

export default async function SignInPage({ searchParams }) {
  const { expired } = await searchParams; // "?expired=1" after the 60-minute sign-out
  return <SignInForm expired={expired === "1"} />;
}