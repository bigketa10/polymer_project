import React from "react";
import { useQuery, useMutation } from "convex/react"; // Added useMutation
import { api } from "../convex/_generated/api";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  LayoutDashboard,
  Flame,
  Trash2, // Added Trash Icon
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const TeacherDashboard = ({ onClose }: { onClose: () => void }) => {
  const stats = useQuery(api.teachers.getClassStats);
  const removeStudent = useMutation(api.teachers.removeStudent); // Hook up the mutation

  // DELETE HANDLER
  const handleDelete = async (studentId: any, userId: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove Student ${userId}? \n\nThis will permanently delete their progress and XP.`,
    );

    if (confirmDelete) {
      await removeStudent({ id: studentId });
    }
  };

  if (!stats) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading Class Analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 p-6 font-sans">
      {/* HEADER */}
      <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            Professor's Dashboard
          </h1>
          <p className="text-slate-500">
            Overview of QXU5031 & QXU6033 Student Performance
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          className="bg-white hover:bg-slate-100"
        >
          Exit Teacher View
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-indigo-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Total Active Students
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.totalStudents}
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Class Average XP
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.avgXP}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Needs Attention
                  </p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.strugglingStudents}
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* STUDENT TABLE */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Student Performance</CardTitle>
                <CardDescription>
                  Real-time tracking of completion rates
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Search student..."
                  className="pl-9 h-9 w-full rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">Student ID</th>
                  <th className="px-6 py-3 font-medium">XP Earned</th>
                  <th className="px-6 py-3 font-medium">Streak</th>
                  <th className="px-6 py-3 font-medium">Progress</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.leaderboard.map((student: any) => (
                  <tr
                    key={student.id}
                    className="bg-white border-b hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      User_{student.userId.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">
                      {student.xp} XP
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {student.streak}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-[140px]">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${student.progressPercent}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500 mt-1 inline-block">
                        {student.completedCount} / {stats.totalLessonsCount}{" "}
                        Lessons
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.progressPercent > 70 ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">
                          On Track
                        </span>
                      ) : student.progressPercent < 20 ? (
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold">
                          At Risk
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    {/* NEW DELETE BUTTON COLUMN */}
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(student.id, student.userId)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};
