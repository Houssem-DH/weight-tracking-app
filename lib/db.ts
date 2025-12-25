// lib/db.ts
import { neon } from "@neondatabase/serverless";

// Check if environment variable exists
if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL is not defined in environment variables");
}

const sql = neon(process.env.NEON_DATABASE_URL);

// Test connection in development
if (process.env.NODE_ENV === "development") {
  console.log("✅ Neon database configured");
}

export type DBUserProfile = {
  id: number;
  name: string;
  start_weight: number;
  goal_weight: number | null;
  start_date: string;
  target_date: string | null;
  created_at: string;
  updated_at: string;
};

export type DBWeightEntry = {
  id: number;
  user_id: number;
  date: string;
  weight: number;
  note: string | null;
  created_at: string;
};

export const db = {
  // User operations
  async createUser(
    name: string,
    startWeight: number,
    goalWeight: number | null,
    targetDate?: string
  ) {
    try {
      const result = await sql`
        INSERT INTO user_profiles (name, start_weight, goal_weight, target_date)
        VALUES (${name}, ${startWeight}, ${goalWeight}, ${targetDate})
        RETURNING *
      `;
      return result[0] as DBUserProfile;
    } catch (error: any) {
      console.error("Database error in createUser:", error);
      throw new Error(`Database error: ${error.message}`);
    }
  },

  async getUser(userId: number) {
    try {
      const result = await sql`
        SELECT * FROM user_profiles WHERE id = ${userId}
      `;
      return result[0] as DBUserProfile | undefined;
    } catch (error: any) {
      console.error("Database error in getUser:", error);
      throw new Error(`Failed to fetch user profile: ${error.message}`);
    }
  },

  async deleteUser(userId: number) {
    try {
      await sql`DELETE FROM user_profiles WHERE id = ${userId}`;
      return true;
    } catch (error: any) {
      console.error("Database error in deleteUser:", error);
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  },

  // Weight entry operations
  async createWeightEntry(userId: number, weight: number, note?: string) {
    try {
      const result = await sql`
        INSERT INTO weight_entries (user_id, weight, note)
        VALUES (${userId}, ${weight}, ${note})
        RETURNING *
      `;
      return result[0] as DBWeightEntry;
    } catch (error: any) {
      console.error("Database error in createWeightEntry:", error);
      throw new Error(`Failed to create weight entry: ${error.message}`);
    }
  },

  async getWeightEntries(userId: number) {
    try {
      const result = await sql`
        SELECT * FROM weight_entries 
        WHERE user_id = ${userId} 
        ORDER BY date DESC
      `;
      return result as DBWeightEntry[];
    } catch (error: any) {
      console.error("Database error in getWeightEntries:", error);
      throw new Error(`Failed to fetch weight entries: ${error.message}`);
    }
  },

  async deleteWeightEntries(userId: number) {
    try {
      await sql`DELETE FROM weight_entries WHERE user_id = ${userId}`;
      return true;
    } catch (error: any) {
      console.error("Database error in deleteWeightEntries:", error);
      throw new Error(`Failed to delete weight entries: ${error.message}`);
    }
  },
};
