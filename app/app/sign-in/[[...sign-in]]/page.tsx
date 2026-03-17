import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50">
      <SignIn forceRedirectUrl="/" signUpUrl="/sign-up" />
    </main>
  );
}
