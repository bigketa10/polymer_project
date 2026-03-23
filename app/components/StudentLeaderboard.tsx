import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Trophy, Medal, Crown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * StudentLeaderboard — modal overlay showing the global XP leaderboard.
 *
 * Fetches data via `getTopStudentsWithCurrentUser`, which returns the top-10
 * students plus the current user's rank and XP in a single query. If the
 * current user is already in the top 10 their row is highlighted with an
 * indigo ring; if they fall outside the top 10 a separator ("…") and a
 * dedicated "you" row are appended below the list showing their actual rank.
 * Renders nothing while the query is loading.
 *
 * @param onClose - callback invoked when the user dismisses the modal
 */
export const StudentLeaderboard = ({ onClose }: { onClose: () => void }) => {
  const result = useQuery(api.userProgress.getTopStudentsWithCurrentUser);

  if (!result) return null;

  const { topStudents, currentUser } = result;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-white shadow-2xl border-2 border-indigo-100 relative overflow-hidden">
        {/* Decorative Background Blob */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-white -z-10"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <CardHeader className="text-center pt-8 pb-2">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <Trophy className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-black text-indigo-900 uppercase tracking-wide">
            Top Learners
          </CardTitle>
          <p className="text-slate-500 text-sm font-medium">
            Global XP Rankings
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 space-y-3">
            {topStudents.map((student, index) => {
              let rankNum: React.ReactNode = (
                <span className="font-bold text-slate-400 w-6 text-center">
                  {index + 1}
                </span>
              );

              let rankIcon: React.ReactNode = null;
              let rowStyle = "bg-white border-slate-100";
              let textStyle = "text-slate-600";

              if (index === 0) {
                rankIcon = <Crown className="w-5 h-5 text-yellow-600" />;
                rowStyle = "bg-yellow-50 border-yellow-200 shadow-sm";
                textStyle = "text-yellow-900 font-bold";
                rankNum = null;
              } else if (index === 1) {
                rankIcon = <Medal className="w-5 h-5 text-slate-400" />;
                rowStyle = "bg-slate-50 border-slate-200";
                textStyle = "text-slate-700 font-semibold";
                rankNum = null;
              } else if (index === 2) {
                rankIcon = <Medal className="w-5 h-5 text-orange-400" />;
                rowStyle = "bg-orange-50 border-orange-100";
                textStyle = "text-orange-800 font-semibold";
                rankNum = null;
              }

              const currentUserRing = student.isCurrentUser
                ? "ring-2 ring-indigo-400"
                : "";

              return (
                <div
                  key={student.id}
                  className={`flex items-center p-4 rounded-xl border ${rowStyle} ${currentUserRing} transition-transform hover:scale-[1.02]`}
                >
                  {/* Rank Column */}
                  <div className="mr-4 flex-shrink-0 flex items-center justify-center w-8">
                    {rankIcon || rankNum}
                  </div>

                  {/* Name Column */}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm ${textStyle}`}>
                      {student.name}
                    </p>
                  </div>

                  {/* XP Column */}
                  <div className="font-mono font-bold text-indigo-600 bg-white/50 px-2 py-1 rounded text-sm">
                    {student.xp} XP
                  </div>
                </div>
              );
            })}

            {/* Current user row when outside top 10 */}
            {currentUser !== null && currentUser.inTopTen === false && (
              <>
                <div className="text-center text-slate-400 text-sm py-1 select-none">
                  …
                </div>
                <div className="flex items-center p-4 rounded-xl border bg-indigo-50 border-indigo-200 ring-2 ring-indigo-400 transition-transform hover:scale-[1.02]">
                  {/* Rank Column */}
                  <div className="mr-4 flex-shrink-0 flex items-center justify-center w-8">
                    <span className="font-bold text-indigo-500 w-6 text-center text-xs">
                      #{currentUser.rank}
                    </span>
                  </div>

                  {/* Name Column */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-indigo-800 font-semibold">
                      {currentUser.name}
                    </p>
                  </div>

                  {/* XP Column */}
                  <div className="font-mono font-bold text-indigo-600 bg-white/50 px-2 py-1 rounded text-sm">
                    {currentUser.xp} XP
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
