"use client";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import PolymerChemistryApp from "../components/PolymerChemistryApp";
import Homepage from "../components/Homepage";

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
        <Homepage />
      </Unauthenticated>
    </>
  );
}
