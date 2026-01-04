"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  parseISO,
  differenceInDays,
  startOfDay,
  isSameDay,
  subDays,
} from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Calendar,
  User,
  Target,
  Plus,
  Sparkles,
  Zap,
  Flame,
  Trophy,
  Activity,
  ChevronRight,
  ArrowRight,
  Loader2,
  RotateCw,
  BarChart3,
  Pencil,
  Trash2,
  Check,
  ShieldCheck,
  Clock,
  Quote,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// ==================== HELPERS ====================
const safeToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

const safeToFixed = (value: any, decimals: number = 1): string => {
  const num = safeToNumber(value);
  return num.toFixed(decimals);
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api/${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "API request failed");
  }

  return response.json();
};

// ==================== TYPES ====================
type WeightEntry = {
  id: number;
  user_id: number;
  date: string;
  weight: number;
  note?: string | null;
  created_at: string;
};

type UserProfile = {
  id: number;
  name: string;
  start_weight: number;
  goal_weight: number | null;
  start_date: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

// ==================== MOTIVATION ====================
type MotivationMood = "good" | "warning" | "neutral" | "celebrate";

type Motivation = {
  title: string;
  message: string;
  mood: MotivationMood;
  icon: any;
};

const pickRandom = <T,>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

const buildMotivation = ({
  user,
  stats,
  entryToday,
}: {
  user: UserProfile;
  stats: any;
  entryToday: WeightEntry | null;
}): Motivation => {
  const hasGoal = !!user.goal_weight;
  const goal = user.goal_weight || 0;
  const current = stats?.currentWeight ?? user.start_weight;
  const streak = stats?.streak ?? 1;
  const weekly = stats?.weeklyAvg ?? 0;
  const progress = stats?.goalProgress ?? 0;

  const remaining = hasGoal ? Math.abs(current - goal) : null;

  const celebrate: Motivation[] = [
    {
      title: "You’re unstoppable 🔥",
      message: `Your streak is ${streak} days. That’s real discipline.`,
      mood: "celebrate",
      icon: Flame,
    },
    {
      title: "Goal progress unlocked 🏆",
      message: `You’ve completed ${safeToFixed(progress, 0)}% of your goal. Keep attacking!`,
      mood: "celebrate",
      icon: Trophy,
    },
    {
      title: "Momentum is on your side ⚡",
      message: `Your trend is ${safeToFixed(weekly, 2)}kg/week. That’s elite progress.`,
      mood: "celebrate",
      icon: Zap,
    },
    {
      title: "Consistency beats talent 💎",
      message: `Every day you log is a step closer to who you want to be.`,
      mood: "celebrate",
      icon: Sparkles,
    },
  ];

  const good: Motivation[] = [
    {
      title: "Small steps = big results 🌱",
      message: hasGoal
        ? `Only ${safeToFixed(remaining, 1)}kg left until your goal. You're closer than you think.`
        : "Consistency beats motivation. Just show up today.",
      mood: "good",
      icon: Target,
    },
    {
      title: "You’re building the habit ✅",
      message: `Your streak is growing. Keep the rhythm alive.`,
      mood: "good",
      icon: Activity,
    },
    {
      title: "Progress is invisible until it’s not ✨",
      message: "Keep going. Your future self will thank you.",
      mood: "good",
      icon: Sparkles,
    },
  ];

  const warning: Motivation[] = [
    {
      title: "Fluctuations are normal 🚧",
      message:
        "Daily weight goes up and down. Focus on the trend — not one day.",
      mood: "warning",
      icon: TrendingUp,
    },
    {
      title: "Don’t quit. Adjust 🧠",
      message:
        "Weight increases are feedback, not failure. Hydrate, sleep, move.",
      mood: "warning",
      icon: RotateCw,
    },
  ];

  const neutral: Motivation[] = [
    {
      title: "Today is a checkpoint 📍",
      message: "Log your weight today. Data creates clarity.",
      mood: "neutral",
      icon: Calendar,
    },
    {
      title: "Future you is watching 👀",
      message: "One entry today makes tomorrow easier. Keep the rhythm.",
      mood: "neutral",
      icon: Clock,
    },
  ];

  if (!entryToday) return pickRandom(neutral);

  if (hasGoal && current <= goal) {
    return {
      title: "Goal achieved 🏆",
      message:
        "You did it! Now focus on maintaining and improving your lifestyle.",
      mood: "celebrate",
      icon: Trophy,
    };
  }

  if (weekly < 0) return pickRandom([...celebrate, ...good]);
  if (weekly > 0 && hasGoal) return pickRandom(warning);

  return pickRandom([...good, ...neutral]);
};

// ==================== PREMIUM TOOLTIP ====================
function ModernTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const value = payload[0].value;

  return (
    <div className="rounded-2xl border border-white/10 bg-gray-950/80 px-4 py-3 backdrop-blur-xl shadow-2xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">
        {safeToFixed(value, 1)}{" "}
        <span className="text-sm text-gray-400">kg</span>
      </p>
    </div>
  );
}

export default function WeightWiseTracker() {
  const [isLoading, setIsLoading] = useState(true);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);

  // Setup
  const [setupName, setSetupName] = useState("");
  const [setupCurrentWeight, setSetupCurrentWeight] = useState("");
  const [setupGoalWeight, setSetupGoalWeight] = useState("");
  const [setupTargetWeeks, setSetupTargetWeeks] = useState(12);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logging today
  const [todaysWeight, setTodaysWeight] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // localStorage persistence
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Filter range
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  // Editing modal
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);

  const [editWeight, setEditWeight] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState(""); // YYYY-MM-DD

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Motivation
  const [motivation, setMotivation] = useState<Motivation | null>(null);

  // ==================== INIT LOCAL STORAGE ====================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("weightApp_userId");
      if (savedId) setCurrentUserId(parseInt(savedId));
      setHasLoadedFromStorage(true);
    }
  }, []);

  // Focus input when dashboard loads
  useEffect(() => {
    if (userProfile && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [userProfile]);

  // ==================== LOAD USER + ENTRIES ====================
  useEffect(() => {
    const load = async () => {
      if (!hasLoadedFromStorage) return;

      try {
        if (!currentUserId) {
          setIsLoading(false);
          return;
        }

        const user = await apiCall(`user?id=${currentUserId}`);
        const processedUser = {
          ...user,
          start_weight: safeToNumber(user.start_weight),
          goal_weight: user.goal_weight ? safeToNumber(user.goal_weight) : null,
        };
        setUserProfile(processedUser);

        const entries = await apiCall(`entries?userId=${currentUserId}`);
        const processedEntries = entries.map((e: any) => ({
          ...e,
          weight: safeToNumber(e.weight),
        }));
        setWeightEntries(processedEntries);
      } catch (err) {
        console.error(err);
        localStorage.removeItem("weightApp_userId");
        setCurrentUserId(null);
        toast.error("Failed to load saved data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (hasLoadedFromStorage) setTimeout(load, 500);
  }, [currentUserId, hasLoadedFromStorage]);

  // ==================== DERIVED VALUES ====================
  const filteredEntries = useMemo(() => {
    if (range === "all") return weightEntries;

    const cutoff =
      range === "7d" ? subDays(new Date(), 7) : subDays(new Date(), 30);
    return weightEntries.filter((e) => new Date(e.date) >= cutoff);
  }, [weightEntries, range]);

  const chartData = useMemo(() => {
    return [...filteredEntries].reverse().map((entry) => ({
      ...entry,
      displayDate: format(parseISO(entry.date), "MMM dd"),
    }));
  }, [filteredEntries]);

  const stats = useMemo(() => {
    if (!userProfile || weightEntries.length === 0) return null;

    const latest = weightEntries[0];
    const first = weightEntries[weightEntries.length - 1];

    const totalChange = latest.weight - first.weight;

    const daysTracked =
      differenceInDays(new Date(latest.date), new Date(first.date)) || 1;
    const weeklyAvg = (totalChange / daysTracked) * 7;

    let goalProgress = 0;
    if (userProfile.goal_weight && totalChange < 0) {
      const totalToLose = userProfile.start_weight - userProfile.goal_weight;
      goalProgress = Math.min(100, (Math.abs(totalChange) / totalToLose) * 100);
    }

    const streak = (() => {
      if (weightEntries.length < 2) return 1;
      let s = 1;
      for (let i = 0; i < weightEntries.length - 1; i++) {
        const cur = startOfDay(new Date(weightEntries[i].date));
        const nxt = startOfDay(new Date(weightEntries[i + 1].date));
        if (differenceInDays(cur, nxt) === 1) s++;
        else break;
      }
      return s;
    })();

    return {
      currentWeight: latest.weight,
      totalChange,
      weeklyAvg,
      goalProgress,
      streak,
    };
  }, [userProfile, weightEntries]);

  const entryToday = useMemo(() => {
    if (!weightEntries.length) return null;
    const today = new Date();
    return (
      weightEntries.find((e) => isSameDay(new Date(e.date), today)) || null
    );
  }, [weightEntries]);

  // ✅ Auto update motivation
  useEffect(() => {
    if (!userProfile || !stats) return;
    setMotivation(buildMotivation({ user: userProfile, stats, entryToday }));
  }, [userProfile, stats, entryToday]);

  const refreshMotivation = () => {
    if (!userProfile || !stats) return;
    setMotivation(buildMotivation({ user: userProfile, stats, entryToday }));
  };

  // ==================== SETUP SUBMIT ====================
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!setupName.trim() || !setupCurrentWeight) {
      toast.error("Please enter your name and current weight.");
      setIsSubmitting(false);
      return;
    }

    try {
      const currentWeightNum = parseFloat(setupCurrentWeight);
      const goalWeightNum = setupGoalWeight
        ? parseFloat(setupGoalWeight)
        : null;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + setupTargetWeeks * 7);

      const newUser = await apiCall("user", {
        method: "POST",
        body: JSON.stringify({
          name: setupName.trim(),
          startWeight: currentWeightNum,
          goalWeight: goalWeightNum,
          targetDate: targetDate.toISOString(),
        }),
      });

      const processedUser = {
        ...newUser,
        start_weight: safeToNumber(newUser.start_weight),
        goal_weight: newUser.goal_weight
          ? safeToNumber(newUser.goal_weight)
          : null,
      };

      localStorage.setItem("weightApp_userId", newUser.id.toString());
      setCurrentUserId(newUser.id);
      setHasLoadedFromStorage(true);

      const initialEntry = await apiCall("entries", {
        method: "POST",
        body: JSON.stringify({
          userId: newUser.id,
          weight: currentWeightNum,
          note: "Starting point",
        }),
      });

      const processedEntry = {
        ...initialEntry,
        weight: safeToNumber(initialEntry.weight),
      };

      setUserProfile(processedUser);
      setWeightEntries([processedEntry]);

      toast.success(`Welcome ${setupName.trim()} ✨`, {
        description: "Your dashboard is now ready.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Setup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== CREATE OR UPDATE TODAY ====================
  const handleSaveToday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todaysWeight || !userProfile) return;

    const todaysWeightNum = parseFloat(todaysWeight);
    if (isNaN(todaysWeightNum)) return toast.error("Invalid weight value.");

    try {
      // If entry exists today => open edit modal
      if (entryToday) {
        setSelectedEntry(entryToday);
        setEditWeight(String(entryToday.weight));
        setEditNote(entryToday.note || "");
        setEditDate(format(new Date(entryToday.date), "yyyy-MM-dd"));
        setEditOpen(true);
        return;
      }

      const newEntry = await apiCall("entries", {
        method: "POST",
        body: JSON.stringify({
          userId: userProfile.id,
          weight: todaysWeightNum,
          note: "Daily entry",
        }),
      });

      const processed = { ...newEntry, weight: safeToNumber(newEntry.weight) };

      setWeightEntries([processed, ...weightEntries]);
      setTodaysWeight("");

      toast.success("Today’s weight logged ✅");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save today’s weight.");
    }
  };

  // ==================== OPEN EDIT MODAL ====================
  const openEditModal = (entry: WeightEntry) => {
    setSelectedEntry(entry);
    setEditWeight(String(entry.weight));
    setEditNote(entry.note || "");
    setEditDate(format(new Date(entry.date), "yyyy-MM-dd"));
    setEditOpen(true);
  };

  // ==================== SAVE EDIT ====================
  const handleSaveEdit = async () => {
    if (!selectedEntry) return;
    const newWeightNum = parseFloat(editWeight);
    if (isNaN(newWeightNum)) return toast.error("Invalid weight.");

    setIsSavingEdit(true);

    try {
      // Prevent two entries on same date
      const newDate = new Date(editDate);
      const collision = weightEntries.find(
        (e) => e.id !== selectedEntry.id && isSameDay(new Date(e.date), newDate)
      );

      if (collision) {
        toast.error("You already have an entry on this date!");
        setIsSavingEdit(false);
        return;
      }

      // PATCH weight + note
      const updated = await apiCall("entries", {
        method: "PATCH",
        body: JSON.stringify({
          entryId: selectedEntry.id,
          weight: newWeightNum,
          note: editNote || null,
          date: new Date(editDate).toISOString(), // ✅ SEND DATE TO DATABASE
        }),
      });

      // If date changed => update locally by overwriting date
      const updatedEntry: WeightEntry = {
        ...selectedEntry,
        ...updated,
        weight: safeToNumber(updated.weight),
        note: editNote || null,
        date: updated.date, // ✅ use DB response (source of truth)

      };

      const newEntries = weightEntries
        .map((e) => (e.id === selectedEntry.id ? updatedEntry : e))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setWeightEntries(newEntries);

      toast.success("Entry updated ✨");
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update entry.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ==================== DELETE ENTRY ====================
  const handleDeleteEntry = async () => {
    if (!selectedEntry) return;
    setIsDeleting(true);

    try {
      await apiCall(`entries?id=${selectedEntry.id}`, {
        method: "DELETE",
      });

      setWeightEntries(weightEntries.filter((e) => e.id !== selectedEntry.id));
      toast.success("Entry deleted 🗑️");

      setDeleteConfirmOpen(false);
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Delete failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ==================== RESET ====================
  const handleResetAll = async () => {
    if (!userProfile) return;

    toast("Reset everything?", {
      description: "Deletes all your data from the cloud.",
      action: {
        label: "Reset",
        onClick: async () => {
          try {
            await apiCall(`user?id=${userProfile.id}`, { method: "DELETE" });
            localStorage.removeItem("weightApp_userId");
            setUserProfile(null);
            setWeightEntries([]);
            setCurrentUserId(null);
            setHasLoadedFromStorage(true);
            toast.success("Account reset successfully.");
          } catch {
            toast.error("Reset failed.");
          }
        },
      },
    });
  };

  // ==================== LOADING ====================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur shadow-xl mx-auto">
              <Image
                src="/logo.png"
                alt="logo"
                width={96}
                height={96}
                priority
              />
            </div>
          </motion.div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
            WeightWise Pro
          </h1>
          <p className="text-gray-400 mt-2">Launching your dashboard…</p>
          <div className="mt-7 h-1 w-52 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  // ==================== SETUP SCREEN ====================
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10">
        <Card className="w-full max-w-4xl border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 160 }}
              className="inline-flex justify-center"
            >
              <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-white/10 shadow-xl">
                <ShieldCheck className="w-12 h-12 text-purple-300" />
              </div>
            </motion.div>

            <CardTitle className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
              Start your journey
            </CardTitle>

            <CardDescription className="text-gray-300 text-lg">
              Your progress is safely stored and synced in the cloud.
            </CardDescription>

            <div className="flex justify-center gap-2">
              <Badge className="bg-white/5 border-white/10 text-gray-200">
                <Sparkles className="w-4 h-4 mr-2" />
                Premium UI
              </Badge>
              <Badge className="bg-white/5 border-white/10 text-gray-200">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Cloud Backup
              </Badge>
              <Badge className="bg-white/5 border-white/10 text-gray-200">
                <Clock className="w-4 h-4 mr-2" />
                Daily Habit
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSetupSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <Label className="text-gray-200 flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-300" />
                      Name
                    </Label>
                    <Input
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      placeholder="e.g. Houssem"
                      className="h-14 text-lg bg-white/5 border-white/10"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-200 flex items-center gap-2 mb-2">
                      <Scale className="w-4 h-4 text-gray-300" />
                      Current Weight
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={setupCurrentWeight}
                      onChange={(e) => setSetupCurrentWeight(e.target.value)}
                      placeholder="e.g. 75.5"
                      className="h-14 text-lg bg-white/5 border-white/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="text-gray-200 flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-300" />
                      Goal Weight (optional)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={setupGoalWeight}
                      onChange={(e) => setSetupGoalWeight(e.target.value)}
                      placeholder="e.g. 70.0"
                      className="h-14 text-lg bg-white/5 border-white/10"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-200 mb-2 block">
                      Timeline{" "}
                      <span className="text-purple-300 font-semibold">
                        ({setupTargetWeeks} weeks)
                      </span>
                    </Label>
                    <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-5">
                      <Slider
                        value={[setupTargetWeeks]}
                        onValueChange={(v) => setSetupTargetWeeks(v[0])}
                        min={4}
                        max={52}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-3">
                        <span>4 weeks</span>
                        <span>52 weeks</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating profile…
                    </>
                  ) : (
                    <>
                      Launch Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== DASHBOARD ====================
  return (
    <>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <Image src="/logo.png" alt="logo" width={40} height={40} />
              </div>
              <div>
                <p className="font-semibold text-white">WeightWise Pro</p>
                <p className="text-xs text-gray-400">Modern Weight Tracker</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleResetAll}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                    {userProfile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-white">
                    {userProfile.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {stats?.currentWeight
                      ? safeToFixed(stats.currentWeight, 1)
                      : "0.0"}{" "}
                    kg
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-4 py-10">
          {/* Welcome */}
          <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Welcome back,{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400">
                  {userProfile.name}
                </span>
              </h1>
              <p className="text-gray-400 mt-2">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/5 border-white/10 text-gray-200">
                <Flame className="w-4 h-4 mr-2 text-orange-400" />
                {stats?.streak || 1} day streak
              </Badge>

              {stats?.totalChange !== undefined && (
                <Badge className="bg-white/5 border-white/10 text-gray-200">
                  {stats.totalChange < 0 ? (
                    <TrendingDown className="w-4 h-4 mr-2 text-green-400" />
                  ) : (
                    <TrendingUp className="w-4 h-4 mr-2 text-red-400" />
                  )}
                  {stats.totalChange < 0 ? "Down" : "Up"}{" "}
                  {safeToFixed(Math.abs(stats.totalChange), 1)}kg
                </Badge>
              )}
            </div>
          </div>

          {/* ✅ Motivation Card */}
          {motivation && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Card className="border-white/10 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-pink-500/10 backdrop-blur-xl shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
                </div>

                <CardContent className="relative z-10 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-3xl bg-white/5 border border-white/10 shadow-lg">
                      <motivation.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-white flex items-center gap-2">
                        <Quote className="w-4 h-4 text-gray-300" />
                        {motivation.title}
                      </p>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                        {motivation.message}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={refreshMotivation}
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl"
                  >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Range buttons */}
          <div className="flex items-center gap-2 mb-6">
            {(["7d", "30d", "all"] as const).map((r) => (
              <Button
                key={r}
                variant="outline"
                onClick={() => setRange(r)}
                className={`border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 rounded-xl ${
                  range === r ? "ring-2 ring-purple-500/40" : ""
                }`}
              >
                {r === "7d"
                  ? "Last 7 days"
                  : r === "30d"
                    ? "Last 30 days"
                    : "All"}
              </Button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: "Current",
                    value: `${stats?.currentWeight ? safeToFixed(stats.currentWeight, 1) : "0.0"} kg`,
                    icon: <Scale className="h-5 w-5" />,
                  },
                  {
                    label: "Total Change",
                    value: `${stats?.totalChange !== undefined ? safeToFixed(stats.totalChange, 1) : "0.0"} kg`,
                    icon: <Activity className="h-5 w-5" />,
                  },
                  {
                    label: "Weekly Avg",
                    value: `${stats?.weeklyAvg !== undefined ? safeToFixed(stats.weeklyAvg, 2) : "0.00"} kg`,
                    icon: <TrendingUp className="h-5 w-5" />,
                  },
                  {
                    label: "Goal",
                    value: `${stats?.goalProgress !== undefined ? safeToFixed(stats.goalProgress, 0) : "0"}%`,
                    icon: <Trophy className="h-5 w-5" />,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                  >
                    <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="text-white/80">{item.icon}</div>
                          <Badge className="bg-white/5 border-white/10 text-gray-200 text-xs">
                            {item.label}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-white mt-4">
                          {item.value}
                        </p>
                        {item.label === "Goal" && (
                          <div className="mt-3">
                            <Progress
                              value={stats?.goalProgress || 0}
                              className="h-2"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Quick log */}
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <Plus className="h-5 w-5 text-purple-300" />
                    </div>
                    Quick Log Today
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    If today already exists, clicking Save will open edit mode.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSaveToday} className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Input
                          ref={inputRef}
                          type="number"
                          step="0.1"
                          value={todaysWeight}
                          onChange={(e) => setTodaysWeight(e.target.value)}
                          placeholder={
                            entryToday
                              ? `Today logged: ${safeToFixed(entryToday.weight, 1)}kg (edit)`
                              : "Enter today’s weight"
                          }
                          className="h-16 text-2xl text-center bg-white/5 border-white/10 backdrop-blur-xl"
                          required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          kg
                        </span>
                      </div>

                      <Button
                        type="submit"
                        className="h-16 px-8 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 shadow-xl"
                      >
                        <Zap className="mr-2 h-5 w-5" />
                        Save
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Graph */}
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <BarChart3 className="h-5 w-5 text-blue-300" />
                    </div>
                    Weight Trend
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Smooth trend curve with goal reference line.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {chartData.length > 1 ? (
                    <div className="h-[420px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ left: 0, right: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="weightFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.45}
                              />
                              <stop
                                offset="90%"
                                stopColor="#8b5cf6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff12"
                          />
                          <XAxis
                            dataKey="displayDate"
                            stroke="#9ca3af"
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip content={<ModernTooltip />} />

                          {userProfile.goal_weight && (
                            <ReferenceLine
                              y={userProfile.goal_weight}
                              stroke="#22c55e"
                              strokeDasharray="6 6"
                              strokeWidth={2}
                              label={{
                                value: `Goal ${safeToFixed(userProfile.goal_weight, 1)}kg`,
                                fill: "#22c55e",
                                position: "insideTopLeft",
                              }}
                            />
                          )}

                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fill="url(#weightFill)"
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[420px] flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                        <BarChart3 className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-lg text-gray-300">
                        Add one more entry to see the trend.
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        You need at least 2 data points.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT */}
            <div className="space-y-6">
              {/* Profile */}
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <User className="h-5 w-5 text-cyan-300" />
                    </div>
                    Profile
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Personal stats and plan.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-lg">
                        {userProfile.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {userProfile.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        Since{" "}
                        {format(
                          parseISO(userProfile.start_date),
                          "MMM d, yyyy"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-sm text-gray-400">Start</span>
                      <span className="font-semibold text-white">
                        {safeToFixed(userProfile.start_weight, 1)} kg
                      </span>
                    </div>

                    {userProfile.goal_weight && (
                      <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-sm text-gray-400">Goal</span>
                        <span className="font-semibold text-green-400">
                          {safeToFixed(userProfile.goal_weight, 1)} kg
                        </span>
                      </div>
                    )}

                    {userProfile.target_date && (
                      <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                        <span className="text-sm text-gray-400">
                          Target Date
                        </span>
                        <span className="font-semibold text-white">
                          {format(
                            parseISO(userProfile.target_date),
                            "MMM d, yyyy"
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center px-4 py-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-sm text-gray-400">Entries</span>
                      <span className="font-semibold text-white">
                        {weightEntries.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entries List */}
              <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <Calendar className="h-5 w-5 text-orange-300" />
                    </div>
                    Entries
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Click any entry to edit.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {weightEntries.length > 0 ? (
                        weightEntries.slice(0, 8).map((entry, index) => (
                          <motion.button
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => openEditModal(entry)}
                            className="w-full text-left flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                          >
                            <div>
                              <p className="text-white font-semibold">
                                {safeToFixed(entry.weight, 1)} kg
                              </p>
                              <p className="text-xs text-gray-400">
                                {format(parseISO(entry.date), "MMM d, yyyy")}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400">
                              <Pencil className="w-4 h-4" />
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </motion.button>
                        ))
                      ) : (
                        <div className="text-center py-10 text-gray-400">
                          No entries yet — start tracking today!
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>

              {/* Footer card */}
              <Card className="border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <Zap className="h-6 w-6 text-green-300" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">
                        Cloud Sync Active
                      </h4>
                      <p className="text-sm text-gray-300 mt-1">
                        Your entries are safe inside Neon PostgreSQL.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* ==================== EDIT MODAL ==================== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-gray-950/95 border-white/10 backdrop-blur-xl rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-purple-300" />
              Edit Entry
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Change weight, note or date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div>
              <Label className="text-gray-300 mb-2 block">Weight (kg)</Label>
              <Input
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                type="number"
                step="0.1"
                className="h-12 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Date</Label>
              <Input
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                type="date"
                className="h-12 bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Note</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note…"
                className="bg-white/5 border-white/10 text-white min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between sm:justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(true)}
              className="border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
              >
                Cancel
              </Button>

              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRM ==================== */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-gray-950/95 border-white/10 backdrop-blur-xl rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Entry?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEntry}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white shadow-xl"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
