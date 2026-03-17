import type { UserIdentity } from "convex/server";

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<UserIdentity | null>;
  };
};

function roleFromIdentity(identity: UserIdentity | null): string | undefined {
  if (!identity) return undefined;

  const candidate = identity as Record<string, unknown>;
  const rootRole = candidate.role;
  if (typeof rootRole === "string") return rootRole;

  const metadata = candidate.metadata as Record<string, unknown> | undefined;
  if (typeof metadata?.role === "string") return metadata.role;

  const publicMetadata = candidate.publicMetadata as
    | Record<string, unknown>
    | undefined;
  if (typeof publicMetadata?.role === "string") return publicMetadata.role;

  const claims = candidate.claims as Record<string, unknown> | undefined;
  if (!claims) return undefined;

  if (typeof claims.role === "string") return claims.role;

  const claimsMetadata = claims.metadata as Record<string, unknown> | undefined;
  if (typeof claimsMetadata?.role === "string") return claimsMetadata.role;

  const claimsPublicMetadata = claims.publicMetadata as
    | Record<string, unknown>
    | undefined;
  if (typeof claimsPublicMetadata?.role === "string") {
    return claimsPublicMetadata.role;
  }

  return undefined;
}

function adminSubjectsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isAdminIdentity(identity: UserIdentity | null): boolean {
  if (!identity) return false;

  if (roleFromIdentity(identity) === "admin") {
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
