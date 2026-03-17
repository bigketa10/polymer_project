import type { UserIdentity } from "convex/server";

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<UserIdentity | null>;
  };
};

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

function roleFromIdentity(identity: UserIdentity | null): string | undefined {
  if (!identity) return undefined;

  const candidate = identity as Record<string, unknown>;
  const rootRole = candidate.role;
  if (typeof rootRole === "string") return normalizeRole(rootRole);

  const metadata = candidate.metadata as Record<string, unknown> | undefined;
  if (typeof metadata?.role === "string") return normalizeRole(metadata.role);

  const publicMetadata = candidate.publicMetadata as
    | Record<string, unknown>
    | undefined;
  if (typeof publicMetadata?.role === "string") {
    return normalizeRole(publicMetadata.role);
  }

  const publicMetadataSnake = candidate.public_metadata as
    | Record<string, unknown>
    | undefined;
  if (typeof publicMetadataSnake?.role === "string") {
    return normalizeRole(publicMetadataSnake.role);
  }

  const claims = candidate.claims as Record<string, unknown> | undefined;
  if (!claims) return undefined;

  if (typeof claims.role === "string") return normalizeRole(claims.role);

  const claimsMetadata = claims.metadata as Record<string, unknown> | undefined;
  if (typeof claimsMetadata?.role === "string") {
    return normalizeRole(claimsMetadata.role);
  }

  const claimsPublicMetadata = claims.publicMetadata as
    | Record<string, unknown>
    | undefined;
  if (typeof claimsPublicMetadata?.role === "string") {
    return normalizeRole(claimsPublicMetadata.role);
  }

  const claimsPublicMetadataSnake = claims.public_metadata as
    | Record<string, unknown>
    | undefined;
  if (typeof claimsPublicMetadataSnake?.role === "string") {
    return normalizeRole(claimsPublicMetadataSnake.role);
  }

  const deepRole = findRoleDeep(candidate);
  if (deepRole) return deepRole;

  return undefined;
}

function adminSubjectsFromEnv(): Set<string> {
  const raw =
    process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isAdminIdentity(identity: UserIdentity | null): boolean {
  if (!identity) return false;

  if (isAdminRole(roleFromIdentity(identity))) {
    return true;
  }

  if (hasAdminRoleDeep(identity)) {
    return true;
  }

  return adminSubjectsFromEnv().has(identity.subject);
}

export async function requireAuthenticated(
  ctx: AuthCtx,
): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

export async function requireAdmin(ctx: AuthCtx): Promise<UserIdentity> {
  const identity = await requireAuthenticated(ctx);
  if (!isAdminIdentity(identity)) {
    throw new Error("Admin access required");
  }
  return identity;
}
