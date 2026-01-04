import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// ✅ Load env
const sql = neon(process.env.NEON_DATABASE_URL!);

// =========================
// GET /api/entries?userId=...
// =========================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const entries = await sql`
      SELECT * FROM weight_entries
      WHERE user_id = ${userId}
      ORDER BY date DESC
    `;

    return NextResponse.json(entries);
  } catch (err) {
    console.error("GET entries error:", err);
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
  }
}

// =========================
// POST /api/entries
// =========================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, weight, note } = body;

    if (!userId || !weight) {
      return NextResponse.json(
        { error: "Missing userId or weight" },
        { status: 400 }
      );
    }

    const inserted = await sql`
      INSERT INTO weight_entries (user_id, weight, note, date)
      VALUES (${userId}, ${weight}, ${note || null}, NOW())
      RETURNING *
    `;

    return NextResponse.json(inserted[0]);
  } catch (err) {
    console.error("POST entry error:", err);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}

// =========================
// PATCH /api/entries
// ✅ update weight + note + date
// =========================
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { entryId, weight, note, date } = body;

    if (!entryId || weight === undefined) {
      return NextResponse.json(
        { error: "Missing entryId or weight" },
        { status: 400 }
      );
    }

    // ✅ Default date = current DB date if not provided
    const updated = await sql`
      UPDATE weight_entries
      SET weight = ${weight},
          note = ${note},
          date = COALESCE(${date}, date)
      WHERE id = ${entryId}
      RETURNING *
    `;

    if (!updated.length) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error("PATCH entry error:", err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

// =========================
// DELETE /api/entries?id=...
// =========================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing entry id" }, { status: 400 });
    }

    await sql`
      DELETE FROM weight_entries
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE entry error:", err);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
