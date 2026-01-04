// lib/db.ts
import { neon } from "@neondatabase/serverless";

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL is not defined in environment variables");
}

const sql = neon(process.env.NEON_DATABASE_URL);

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
  async createUser(name: string, startWeight: number, goalWeight: number | null, targetDate?: string) {
    const result = await sql`
      INSERT INTO user_profiles (name, start_weight, goal_weight, target_date)
      VALUES (${name}, ${startWeight}, ${goalWeight}, ${targetDate})
      RETURNING *
    `;
    return result[0] as DBUserProfile;
  },

  async getUser(userId: number) {
    const result = await sql`
      SELECT * FROM user_profiles WHERE id = ${userId}
    `;
    return result[0] as DBUserProfile | undefined;
  },

  async deleteUser(userId: number) {
    await sql`DELETE FROM user_profiles WHERE id = ${userId}`;
    return true;
  },

  async createWeightEntry(userId: number, weight: number, note?: string) {
    const result = await sql`
      INSERT INTO weight_entries (user_id, weight, note)
      VALUES (${userId}, ${weight}, ${note})
      RETURNING *
    `;
    return result[0] as DBWeightEntry;
  },

  async getWeightEntries(userId: number) {
    const result = await sql`
      SELECT * FROM weight_entries
      WHERE user_id = ${userId}
      ORDER BY date DESC
    `;
    return result as DBWeightEntry[];
  },

  async deleteWeightEntries(userId: number) {
    await sql`DELETE FROM weight_entries WHERE user_id = ${userId}`;
    return true;
  },

  // ✅ NEW: Update entry
  async updateWeightEntry(entryId: number, weight: number, note?: string) {
    const result = await sql`
      UPDATE weight_entries
      SET weight = ${weight}, note = ${note}, date = NOW()
      WHERE id = ${entryId}
      RETURNING *
    `;
    return result[0] as DBWeightEntry;
  },

  // ✅ NEW: Delete one entry
  async deleteWeightEntry(entryId: number) {
    await sql`DELETE FROM weight_entries WHERE id = ${entryId}`;
    return true;
  },
};
