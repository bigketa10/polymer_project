import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isTeacherRoute = createRouteMatcher(["/teacher(.*)"]);

function normalizeRole(value: string): string {
  return value.trim().toLowerCase();
}

function isAdminRole(role: string | undefined): boolean {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return (
    normalized === "admin" ||
    normalized === "org:admin" ||
    normalized === "owner" ||
    normalized === "org:owner"
  );
}

function roleValueIsAdmin(value: unknown): boolean {
  if (typeof value === "string") {
    return isAdminRole(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && isAdminRole(item));
  }

  return false;
}

function hasAdminRoleDeep(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== "object" || depth > 4) return false;

  if (Array.isArray(value)) {
    return value.some((item) => hasAdminRoleDeep(item, depth + 1));
  }

  const record = value as Record<string, unknown>;

  for (const [key, nested] of Object.entries(record)) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey === "isadmin" &&
      typeof nested === "boolean" &&
      nested
    ) {
      return true;
    }

    if (
      normalizedKey === "role" ||
      normalizedKey === "roles" ||
      normalizedKey === "org_role" ||
      normalizedKey === "orgrole"
    ) {
      if (roleValueIsAdmin(nested)) {
        return true;
      }
    }

    if (hasAdminRoleDeep(nested, depth + 1)) {
      return true;
    }
  }

  return false;
}

function parseAdminIdsFromEnv() {
  const raw =
    process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || "";

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function findRoleDeep(value: unknown, depth = 0): string | undefined {
  if (!value || typeof value !== "object" || depth > 3) return undefined;

  const record = value as Record<string, unknown>;
  const directRole = record.role;
  if (typeof directRole === "string") {
    return normalizeRole(directRole);
  }

  for (const nestedValue of Object.values(record)) {
    const nestedRole = findRoleDeep(nestedValue, depth + 1);
    if (nestedRole) return nestedRole;
  }

  return undefined;
}

function roleFromClaims(sessionClaims: unknown): string | undefined {
  const claims = (sessionClaims || {}) as Record<string, unknown>;

  const metadata = claims.metadata as Record<string, unknown> | undefined;
  const publicMetadata = claims.publicMetadata as
    | Record<string, unknown>
    | undefined;
  const publicMetadataSnake = claims.public_metadata as
    | Record<string, unknown>
    | undefined;

  const directRole = claims.role;
  if (typeof directRole === "string") return normalizeRole(directRole);

  const metadataRole = metadata?.role;
  if (typeof metadataRole === "string") return normalizeRole(metadataRole);

  const publicRole = publicMetadata?.role;
  if (typeof publicRole === "string") return normalizeRole(publicRole);

  const publicSnakeRole = publicMetadataSnake?.role;
  if (typeof publicSnakeRole === "string") {
    return normalizeRole(publicSnakeRole);
  }

  const deepRole = findRoleDeep(claims);
  if (deepRole) return deepRole;

  return undefined;
}

export default clerkMiddleware(async (auth, req) => {
  if (isTeacherRoute(req)) {
    const { sessionClaims, userId } = await auth();
    const userRole = roleFromClaims(sessionClaims);
    const isEnvAdmin = !!userId && parseAdminIdsFromEnv().has(userId);

    if (!isAdminRole(userRole) && !hasAdminRoleDeep(sessionClaims) && !isEnvAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
