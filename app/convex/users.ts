import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const repairUserData = mutation({
  args: { dryRun: v.boolean() },
  handler: async (ctx, { dryRun }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "You must be logged in to the app to run this! Open your site, log in, then run this from the Convex Dashboard.",
      );
    }

    // Get the 'Correct' prefix (e.g., https://clerk.your-app.dev)
    const correctPrefix = identity.tokenIdentifier.split("|")[0];

    // Pull the role from Clerk safely
    const currentClerkRole = (identity as any).role || "student";

    // We use 'as any' here because your schema might not have the users table defined yet
    const allUsers = await ctx.db.query("users" as any).collect();
    let changeLog = [];

    for (const row of allUsers) {
      const user = row as any; // Tell TypeScript to relax
      const parts = user.tokenIdentifier?.split("|") || [];
      const currentPrefix = parts[0];
      const clerkId = parts[1];

      if (!clerkId) continue; // Skip malformed data

      let needsUpdate = false;
      let updateData: any = {};

      // Fix 1: Token Identifier Prefix (The Vercel vs Localhost mismatch)
      if (currentPrefix !== correctPrefix) {
        updateData.tokenIdentifier = `${correctPrefix}|${clerkId}`;
        needsUpdate = true;
      }

      // Fix 2: Sync Role (If this is the current user, sync their Clerk role)
      if (
        user.tokenIdentifier.includes(identity.subject) &&
        user.role !== currentClerkRole
      ) {
        updateData.role = currentClerkRole;
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (!dryRun) {
          await ctx.db.patch(user._id, updateData);
        }
        changeLog.push(
          `Updated ${user.email || user.name || "Unknown User"}: ${JSON.stringify(updateData)}`,
        );
      }
    }

    return {
      status: dryRun
        ? "DRY RUN COMPLETE (No changes made)"
        : "SUCCESS (Database Updated)",
      matchesFound: changeLog.length,
      details: changeLog,
    };
  },
});
