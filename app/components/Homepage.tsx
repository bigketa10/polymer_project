"use client";

import React, { useRef } from "react";
import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Atom,
  BrainCircuit,
  Trophy,
  ArrowRight,
  FlaskConical,
  BookOpen,
  Beaker,
} from "lucide-react";
import { sortModulesByOrder } from "@/lib/studentUtils";

/**
 * Homepage — public landing page rendered at `/` for unauthenticated visitors.
 *
 * Fetches the public curriculum via `api.modules.getPublicCurriculum` (no auth
 * required) and displays a sortable grid of module cards with lesson counts.
 * The "View Curriculum" button and the navbar "Curriculum" link both scroll
 * smoothly to the curriculum section via `curriculumRef`. Shows skeleton
 * placeholders while loading and a "coming soon" message when no modules exist.
 */
export default function Homepage() {
  const curriculumRef = useRef<HTMLDivElement>(null);
  const rawModules = useQuery(api.modules.getPublicCurriculum);

  // getPublicCurriculum already returns lessonCount — use it directly
  const modules = rawModules !== undefined ? sortModulesByOrder(rawModules as any[]) : undefined;

  const scrollToCurriculum = () => {
    curriculumRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-screen w-full overflow-y-auto scroll-smooth bg-white font-sans text-slate-900 overflow-x-hidden">
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
          <button
            onClick={scrollToCurriculum}
            className="text-slate-600 hover:text-indigo-600 font-medium transition-colors"
          >
            Curriculum
          </button>
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
      <main className="flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-white to-indigo-50 w-full">
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
              onClick={scrollToCurriculum}
              className="text-slate-600 hover:text-indigo-600 font-bold gap-2"
            >
              View Curriculum <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* HERO VISUAL */}
        <div className="mt-16 relative w-full max-w-4xl mx-auto">
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

      {/* CURRICULUM PREVIEW */}
      <section
        id="curriculum"
        ref={curriculumRef}
        className="py-20 bg-gradient-to-b from-indigo-50 to-white"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              What you'll learn
            </h2>
            <p className="text-slate-500 mt-2">
              Explore the full curriculum — no sign-up required.
            </p>
          </div>

          {/* Loading skeleton */}
          {modules === undefined && (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-100 bg-white p-8 animate-pulse"
                >
                  <div className="h-12 w-12 rounded-full bg-slate-100 mb-4" />
                  <div className="h-5 w-24 bg-slate-100 rounded mb-2" />
                  <div className="h-4 w-48 bg-slate-100 rounded mb-3" />
                  <div className="h-3 w-full bg-slate-100 rounded mb-2" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {modules !== undefined && modules.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Curriculum content coming soon.</p>
            </div>
          )}

          {/* Module cards */}
          {modules !== undefined && modules.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {(modules as any[]).map((m: any) => (
                <ModuleCard key={m._id} module={m} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-base rounded-xl font-bold shadow-lg shadow-indigo-200"
              >
                Start Learning for Free
              </Button>
            </SignInButton>
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

function iconForModule(iconKey?: string) {
  if (iconKey === "beaker") return Beaker;
  if (iconKey === "bookOpen") return BookOpen;
  return Atom;
}

function ModuleCard({ module: m }: { module: any }) {
  const Icon = iconForModule(m.iconKey);
  const color = m.color || "indigo";
  return (
    <div className={`rounded-2xl border-2 border-${color}-100 bg-white p-8 hover:border-${color}-300 hover:shadow-lg transition-all`}>
      <div className={`h-14 w-14 bg-${color}-100 rounded-full flex items-center justify-center mb-4`}>
        <Icon className={`w-7 h-7 text-${color}-600`} />
      </div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            {m.code}
          </p>
          <h3 className="text-xl font-bold text-slate-800">{m.title}</h3>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-${color}-100 text-${color}-700`}>
          {m.lessonCount} {m.lessonCount === 1 ? "lesson" : "lessons"}
        </span>
      </div>
      <p className="text-slate-500 text-sm leading-relaxed">{m.description}</p>
    </div>
  );
}

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
