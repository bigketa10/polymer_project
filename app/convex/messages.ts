import { query } from "./_generated/server";

export const getForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("messages")
      // FIX 1: Use 'userId' (from your schema), not 'author'
      // FIX 2: Use identity.subject to match how you store IDs in other tables
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
  },
});
