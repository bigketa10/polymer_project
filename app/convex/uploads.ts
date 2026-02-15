import { mutation } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  // This gives the frontend a temporary "key" to upload directly to Convex
  return await ctx.storage.generateUploadUrl();
});
