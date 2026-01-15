"use client";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import PolymerChemistryApp from "../components/PolymerChemistryApp";

export default function Home() {
  return (
    <>
      <Authenticated>
        <div className="absolute top-4 right-4 z-50">
          <UserButton />
        </div>
        <PolymerChemistryApp />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Sign In to Start Learning
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>
    </>
  );
}
