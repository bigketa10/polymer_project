import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-slate-50">
      <SignUp forceRedirectUrl="/" signInUrl="/sign-in" />
    </main>
  );
}
