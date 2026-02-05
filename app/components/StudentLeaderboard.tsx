import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Trophy, Medal, Crown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StudentLeaderboard = ({ onClose }: { onClose: () => void }) => {
  const topStudents = useQuery(api.userProgress.getTopStudents);

  if (!topStudents) return null;

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
              // --- FIX IS HERE ---
              // We explicitly tell TypeScript this can be an Element OR null
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
                rankNum = null; // Now valid because we typed it as ReactNode
              } else if (index === 1) {
                rankIcon = <Medal className="w-5 h-5 text-slate-400" />;
                rowStyle = "bg-slate-50 border-slate-200";
                textStyle = "text-slate-700 font-semibold";
                rankNum = null;
              } else if (index === 2) {
                rankIcon = <Medal className="w-5 h-5 text-orange-400" />; // Bronze
                rowStyle = "bg-orange-50 border-orange-100";
                textStyle = "text-orange-800 font-semibold";
                rankNum = null;
              }

              return (
                <div
                  key={student.id}
                  className={`flex items-center p-4 rounded-xl border ${rowStyle} transition-transform hover:scale-[1.02]`}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
