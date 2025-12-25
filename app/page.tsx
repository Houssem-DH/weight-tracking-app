// app/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format, parseISO, differenceInDays, startOfDay } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Scale,
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

// ==================== HELPER FUNCTIONS ====================
// PostgreSQL DECIMAL/NUMERIC types come as strings, so we need to convert them
const safeToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

const safeToFixed = (value: any, decimals: number = 1): string => {
  const num = safeToNumber(value);
  return num.toFixed(decimals);
};
// ==========================================================

// Updated types to match database schema
type WeightEntry = {
  id: number;
  user_id: number;
  date: string;
  weight: number;
  note?: string;
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

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api/${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
};

export default function WeightWiseTracker() {
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [setupName, setSetupName] = useState("");
  const [setupCurrentWeight, setSetupCurrentWeight] = useState("");
  const [setupGoalWeight, setSetupGoalWeight] = useState("");
  const [setupTargetWeeks, setSetupTargetWeeks] = useState(12);
  const [todaysWeight, setTodaysWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load userId from localStorage ONLY on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('weightApp_userId');
      if (savedId) {
        setCurrentUserId(parseInt(savedId));
      }
      setHasLoadedFromStorage(true);
    }
  }, []);

  // Focus on weight input when dashboard loads
  useEffect(() => {
    if (userProfile && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [userProfile]);

  // Load data from database
  useEffect(() => {
    const loadSavedData = async () => {
      // Only run if we've checked localStorage and have a userId
      if (!hasLoadedFromStorage) return;
      
      try {
        if (currentUserId) {
          // Load user profile
          const user = await apiCall(`user?id=${currentUserId}`);
          // Convert string numbers to actual numbers
          const processedUser = {
            ...user,
            start_weight: safeToNumber(user.start_weight),
            goal_weight: user.goal_weight ? safeToNumber(user.goal_weight) : null
          };
          setUserProfile(processedUser);
          
          // Load weight entries
          const entries = await apiCall(`entries?userId=${currentUserId}`);
          // Convert all weight strings to numbers
          const processedEntries = entries.map((entry: any) => ({
            ...entry,
            weight: safeToNumber(entry.weight)
          }));
          setWeightEntries(processedEntries);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
        // If user doesn't exist or error, clear localStorage
        if (error instanceof Error && error.message.includes('not found')) {
          localStorage.removeItem('weightApp_userId');
          setCurrentUserId(null);
        }
        toast.error("Could not load your saved data.");
      } finally {
        setIsLoading(false);
      }
    };

    // Wait for localStorage check before loading
    if (hasLoadedFromStorage) {
      // Simulate loading for better UX
      setTimeout(loadSavedData, 800);
    }
  }, [currentUserId, hasLoadedFromStorage]);

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
      const goalWeightNum = setupGoalWeight ? parseFloat(setupGoalWeight) : null;

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + setupTargetWeeks * 7);

      // Create user in database
      const newUser = await apiCall('user', {
        method: 'POST',
        body: JSON.stringify({
          name: setupName.trim(),
          startWeight: currentWeightNum,
          goalWeight: goalWeightNum,
          targetDate: targetDate.toISOString(),
        }),
      });

      // Process the returned user to ensure numbers
      const processedUser = {
        ...newUser,
        start_weight: safeToNumber(newUser.start_weight),
        goal_weight: newUser.goal_weight ? safeToNumber(newUser.goal_weight) : null
      };

      // Save user ID to localStorage for persistence
      localStorage.setItem('weightApp_userId', newUser.id.toString());
      setCurrentUserId(newUser.id);
      setHasLoadedFromStorage(true);

      // Create initial weight entry
      const initialEntry = await apiCall('entries', {
        method: 'POST',
        body: JSON.stringify({
          userId: newUser.id,
          weight: currentWeightNum,
          note: "Starting point",
        }),
      });

      // Process the returned entry to ensure numbers
      const processedEntry = {
        ...initialEntry,
        weight: safeToNumber(initialEntry.weight)
      };

      setUserProfile(processedUser);
      setWeightEntries([processedEntry]);

      toast.success(`Welcome to your journey, ${setupName.trim()}! 🚀`, {
        description: "Your data is now securely stored in the cloud.",
      });
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTodaysWeight = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!todaysWeight || !userProfile) {
      toast.error("Please enter today's weight.");
      return;
    }

    const todaysWeightNum = parseFloat(todaysWeight);
    
    try {
      // Check if entry already exists for today
      const today = startOfDay(new Date()).toISOString();
      const hasEntryToday = weightEntries.some(entry => 
        startOfDay(new Date(entry.date)).toISOString() === today
      );

      if (hasEntryToday) {
        toast.info("You've already logged your weight today!", {
          description: "You can update it tomorrow.",
        });
        return;
      }

      // Create new entry in database
      const newEntry = await apiCall('entries', {
        method: 'POST',
        body: JSON.stringify({
          userId: userProfile.id,
          weight: todaysWeightNum,
          note: "Daily entry",
        }),
      });

      // Process the returned entry to ensure numbers
      const processedEntry = {
        ...newEntry,
        weight: safeToNumber(newEntry.weight)
      };

      const updatedEntries = [processedEntry, ...weightEntries];
      setWeightEntries(updatedEntries);
      setTodaysWeight("");

      // Show appropriate toast message
      if (weightEntries.length > 0) {
        const lastWeight = weightEntries[0].weight;
        const difference = todaysWeightNum - lastWeight;

        if (difference < 0) {
          toast.success(`Amazing progress! 🔥`, {
            description: `Down ${Math.abs(difference).toFixed(1)}kg from last time!`,
          });
        } else if (difference > 0) {
          toast.info("Weight recorded 📝", {
            description: `Stay consistent, you've got this!`,
          });
        } else {
          toast.success("Weight maintained! ⚖️");
        }
      } else {
        toast.success("First entry recorded! 🎯");
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save your weight entry.");
    }
  };

  const handleResetData = async () => {
    if (!userProfile) return;

    toast("Starting fresh?", {
      description: "This will delete all your data from the cloud.",
      action: {
        label: "Reset",
        onClick: async () => {
          try {
            // Delete user (which cascades to entries)
            await apiCall(`user?id=${userProfile.id}`, {
              method: 'DELETE',
            });

            // Clear local state
            localStorage.removeItem('weightApp_userId');
            setUserProfile(null);
            setWeightEntries([]);
            setTodaysWeight("");
            setCurrentUserId(null);
            setHasLoadedFromStorage(true);

            toast.success("All data deleted successfully! ✨");
          } catch (error) {
            console.error('Reset failed:', error);
            toast.error("Failed to reset data. Please try again.");
          }
        },
      },
    });
  };

  const calculateStats = useCallback(() => {
    if (weightEntries.length === 0 || !userProfile) return null;

    const latest = weightEntries[0];
    const first = weightEntries[weightEntries.length - 1];
    const totalChange = latest.weight - first.weight;
    const daysTracked =
      differenceInDays(new Date(latest.date), new Date(first.date)) || 1;
    const changePerDay = totalChange / daysTracked;
    const changePerWeek = changePerDay * 7;

    // Calculate progress towards goal
    let goalProgress = 0;
    if (userProfile.goal_weight && totalChange < 0) {
      const totalToLose = userProfile.start_weight - userProfile.goal_weight;
      const lostSoFar = Math.abs(totalChange);
      goalProgress = Math.min(100, (lostSoFar / totalToLose) * 100);
    }

    return {
      currentWeight: latest.weight,
      totalChange,
      changePerWeek,
      daysTracked,
      goalProgress,
      streak: calculateStreak(),
    };
  }, [weightEntries, userProfile]);

  const calculateStreak = useCallback(() => {
    if (weightEntries.length < 2) return 1;

    let streak = 1;
    for (let i = 0; i < weightEntries.length - 1; i++) {
      const currentDate = startOfDay(new Date(weightEntries[i].date));
      const nextDate = startOfDay(new Date(weightEntries[i + 1].date));
      const diffDays = Math.abs(differenceInDays(currentDate, nextDate));

      if (diffDays === 1) streak++;
      else break;
    }

    return streak;
  }, [weightEntries]);

  const stats = calculateStats();
  const chartData = [...weightEntries].reverse().map((entry) => ({
    ...entry,
    displayDate: format(parseISO(entry.date), "MMM dd"),
  }));

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-purple-950 flex items-center justify-center">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="relative z-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500/20">
                <Image
                  src="/logo.png"
                  alt="WeightWise Logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-yellow-400 animate-spin-slow" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-4"
          >
            WeightWise Pro
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-400 mb-8"
          >
            Preparing your futuristic dashboard
          </motion.p>

          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "200px" }}
            transition={{ delay: 0.4, duration: 1.5 }}
            className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto"
          />
        </div>
      </div>
    );
  }

  // Setup screen
  if (!userProfile) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-purple-950 flex items-center justify-center p-4">
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/10 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.5, 0.1],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <Card className="relative z-10 w-full max-w-2xl border-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="inline-block p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20"
            >
              <Zap className="w-12 h-12 text-purple-400" />
            </motion.div>
            <CardTitle className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              Begin Your Journey
            </CardTitle>
            <CardDescription className="text-lg text-gray-300">
              Your data will be securely stored in the cloud
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSetupSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Your Name
                    </Label>
                    <Input
                      value={setupName}
                      onChange={(e) => setSetupName(e.target.value)}
                      placeholder="Enter your name"
                      className="h-14 bg-gray-800/50 border-gray-700 text-lg backdrop-blur-sm"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      Current Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={setupCurrentWeight}
                      onChange={(e) => setSetupCurrentWeight(e.target.value)}
                      placeholder="e.g., 75.5"
                      className="h-14 bg-gray-800/50 border-gray-700 text-lg backdrop-blur-sm"
                      required
                      min="30"
                      max="300"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Goal Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={setupGoalWeight}
                      onChange={(e) => setSetupGoalWeight(e.target.value)}
                      placeholder="e.g., 70.0"
                      className="h-14 bg-gray-800/50 border-gray-700 text-lg backdrop-blur-sm"
                      min="30"
                      max="300"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-gray-300">
                      Target Timeline:{" "}
                      <span className="text-purple-400">
                        {setupTargetWeeks} weeks
                      </span>
                    </Label>
                    <div className="pt-2">
                      <Slider
                        value={[setupTargetWeeks]}
                        onValueChange={(value) => setSetupTargetWeeks(value[0])}
                        min={4}
                        max={52}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-gray-400 mt-2">
                        <span>4 weeks</span>
                        <span>1 year</span>
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
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Your Profile...
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

  // Main Dashboard
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-black to-purple-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-screen blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-screen blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full mix-blend-screen blur-3xl animate-pulse delay-500" />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-purple-500/30">
                  <Image
                    src="/logo.png"
                    alt="App Logo"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                  WeightWise Pro
                </h1>
                <p className="text-xs text-gray-400">Cloud Sync Enabled</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge className="bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-300 border-green-500/30">
                <Sparkles className="mr-2 h-3 w-3" />
                Cloud Storage
              </Badge>
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gray-800/50 backdrop-blur-sm border border-white/10">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500">
                    {userProfile.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{userProfile.name}</p>
                  <p className="text-xs text-gray-400">
                    {/* FIXED: Using safeToFixed instead of .toFixed() */}
                    {stats?.currentWeight !== undefined ? safeToFixed(stats.currentWeight, 1) : "0.0"} kg
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Card className="border-0 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">
                        Welcome back,{" "}
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                          {userProfile.name}
                        </span>
                        !
                      </h2>
                      <p className="text-gray-400">
                        {format(new Date(), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border-purple-500/30">
                        <Flame className="mr-2 h-3 w-3" />
                        {stats?.streak || 1} Day Streak
                      </Badge>
                      <Button
                        variant="outline"
                        onClick={handleResetData}
                        className="border-gray-700 text-gray-400 hover:text-white"
                      >
                        <RotateCw className="mr-2 h-4 w-4" />
                        Reset All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Scale className="h-8 w-8 text-purple-400" />
                      <Badge
                        variant="secondary"
                        className="bg-purple-500/20 text-purple-300"
                      >
                        Current
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">
                      {/* FIXED: Using safeToFixed instead of .toFixed() */}
                      {stats?.currentWeight !== undefined ? safeToFixed(stats.currentWeight, 1) : "0.0"} kg
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Today's weight</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <TrendingUp className="h-8 w-8 text-blue-400" />
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/20 text-blue-300"
                      >
                        Change
                      </Badge>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        stats?.totalChange && stats.totalChange < 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stats?.totalChange && stats.totalChange > 0 ? "+" : ""}
                      {/* FIXED: Using safeToFixed for totalChange */}
                      {stats?.totalChange !== undefined ? safeToFixed(stats.totalChange, 1) : "0.0"} kg
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Total progress</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Activity className="h-8 w-8 text-green-400" />
                      <Badge
                        variant="secondary"
                        className="bg-green-500/20 text-green-300"
                      >
                        Weekly
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">
                      {/* FIXED: Using safeToFixed for changePerWeek */}
                      {stats?.changePerWeek !== undefined ? safeToFixed(stats.changePerWeek, 2) : "0.00"} kg
                    </p>
                    <p className="text-sm text-gray-400 mt-2">Per week</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-0 bg-gradient-to-br from-pink-500/10 to-pink-600/10 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Trophy className="h-8 w-8 text-pink-400" />
                      <Badge
                        variant="secondary"
                        className="bg-pink-500/20 text-pink-300"
                      >
                        Goal
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold">
                      {/* FIXED: Using safeToFixed for goalProgress */}
                      {stats?.goalProgress !== undefined ? safeToFixed(stats.goalProgress, 0) : "0"}%
                    </p>
                    <div className="mt-2">
                      <Progress value={stats?.goalProgress || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20">
                      <Plus className="h-5 w-5 text-purple-400" />
                    </div>
                    <span>Log Today's Weight</span>
                  </CardTitle>
                  <CardDescription>
                    Your data syncs automatically to the cloud
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddTodaysWeight} className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.1"
                            value={todaysWeight}
                            onChange={(e) => setTodaysWeight(e.target.value)}
                            placeholder="Enter today's weight in kg"
                            className="h-16 text-2xl text-center bg-gray-800/50 border-gray-700 backdrop-blur-sm"
                            required
                            min="30"
                            max="300"
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                            kg
                          </div>
                        </div>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          type="submit"
                          className="h-16 px-8 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
                        >
                          <Zap className="mr-2 h-5 w-5" />
                          Save to Cloud
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20">
                      <BarChart3 className="h-5 w-5 text-green-400" />
                    </div>
                    <span>Progress Visualization</span>
                  </CardTitle>
                  <CardDescription>
                    Your weight journey over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {weightEntries.length > 1 ? (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colorWeight"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#8b5cf6"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#8b5cf6"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis
                            dataKey="displayDate"
                            stroke="#9ca3af"
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="#9ca3af"
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1f2937",
                              border: "1px solid #374151",
                              borderRadius: "8px",
                              backdropFilter: "blur(10px)",
                            }}
                            formatter={(value) => [`${value} kg`, "Weight"]}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fill="url(#colorWeight)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex items-center justify-center mb-6">
                        <BarChart3 className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-lg text-gray-400">
                        Add more entries to visualize your progress
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        You need at least 2 data points
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-0 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
                      <User className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span>Your Profile</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="text-xl bg-gradient-to-r from-purple-500 to-blue-500">
                        {userProfile.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {userProfile.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Since{" "}
                        {format(parseISO(userProfile.start_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30">
                      <span className="text-gray-400">Start Weight</span>
                      <span className="font-semibold">
                        {/* FIXED: Using safeToFixed instead of .toFixed() */}
                        {safeToFixed(userProfile.start_weight, 1)} kg
                      </span>
                    </div>

                    {userProfile.goal_weight && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30">
                        <span className="text-gray-400">Goal Weight</span>
                        <span className="font-semibold text-green-400">
                          {/* FIXED: Using safeToFixed instead of .toFixed() */}
                          {safeToFixed(userProfile.goal_weight, 1)} kg
                        </span>
                      </div>
                    )}

                    {userProfile.target_date && (
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30">
                        <span className="text-gray-400">Target Date</span>
                        <span className="font-semibold">
                          {format(parseISO(userProfile.target_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/30">
                      <span className="text-gray-400">Total Entries</span>
                      <span className="font-semibold">
                        {weightEntries.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-0 bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20">
                      <Calendar className="h-5 w-5 text-orange-400" />
                    </div>
                    <span>Recent Entries</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {weightEntries.length > 0 ? (
                        weightEntries.slice(0, 5).map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors group"
                          >
                            <div>
                              <p className="font-semibold text-lg">
                                {/* FIXED: Using safeToFixed instead of .toFixed() */}
                                {safeToFixed(entry.weight, 1)} kg
                              </p>
                              <p className="text-sm text-gray-400">
                                {format(
                                  parseISO(entry.date),
                                  "MMM d, h:mm a"
                                )}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-400">No entries yet</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Start tracking above!
                          </p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {weightEntries.length > 5 && (
                    <div className="mt-6 pt-4 border-t border-gray-800">
                      <Button
                        variant="ghost"
                        className="w-full text-gray-400 hover:text-white"
                        onClick={() => {
                          toast.info("All entries view coming soon!");
                        }}
                      >
                        View All {weightEntries.length} Entries
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-0 bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-xl">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-green-500/20">
                      <Zap className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Cloud Storage Active</h4>
                      <p className="text-sm text-gray-300">
                        Your data is securely backed up in Neon PostgreSQL. You can access it from any device!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}