import React from "react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Atom,
  BrainCircuit,
  Trophy,
  ArrowRight,
  FlaskConical,
} from "lucide-react";

export default function Homepage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <FlaskConical className="w-8 h-8" />
          <span>PolymerLingo</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#features"
            className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            Features
          </a>
          <a
            href="#about"
            className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            About
          </a>
        </div>
        <SignInButton mode="modal">
          <Button
            variant="outline"
            className="border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-bold"
          >
            Log In
          </Button>
        </SignInButton>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-white to-indigo-50">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-4">
            <Atom className="w-4 h-4" />
            <span>The #1 App for Polymer Chemistry</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Master Polymers <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              One Monomer at a Time
            </span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Gamified lessons, interactive quizzes, and visual challenges
            designed to make learning polymer science addictive and fun.
          </p>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-xl font-bold shadow-xl shadow-indigo-200 hover:shadow-2xl hover:scale-105 transition-all w-full sm:w-auto"
              >
                Start Learning for Free
              </Button>
            </SignInButton>
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-indigo-600 font-bold gap-2"
            >
              View Curriculum <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* HERO IMAGE / VISUAL */}
        <div className="mt-16 relative w-full max-w-4xl mx-auto">
          {/* Abstract molecule background blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

          <img
            src="https://placehold.co/1200x600/png?text=Interactive+Polymer+Cards+Preview"
            alt="App Preview"
            className="relative rounded-xl shadow-2xl border-4 border-white transform hover:-translate-y-2 transition-transform duration-500"
          />
        </div>
      </main>

      {/* FEATURES GRID */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">
              Why learn with PolymerLingo?
            </h2>
            <p className="text-slate-500 mt-2">
              Science doesn't have to be boring.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BrainCircuit className="w-10 h-10 text-indigo-500" />}
              title="Bite-Sized Science"
              desc="Forget 2-hour lectures. Learn complex synthesis concepts in 5-minute interactive chunks."
            />
            <FeatureCard
              icon={<Trophy className="w-10 h-10 text-yellow-500" />}
              title="Gamified Progress"
              desc="Earn XP, maintain streaks, and climb the leaderboard as you master thermoplastics vs thermosets."
            />
            <FeatureCard
              icon={<FlaskConical className="w-10 h-10 text-pink-500" />}
              title="Visual Chemistry"
              desc="Interactive diagrams for monomers, polymer chains, and cross-linking reactions."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <FlaskConical className="w-6 h-6" />
            <span>PolymerLingo</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} PolymerLingo. Built for aspiring
            chemists.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Helper Component for Feature Cards
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
      <div className="mb-4 bg-white w-16 h-16 rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
