import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alerts, collectionReports, collections, deliveries, InsertReport, InsertUser, reports, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createReport(input: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(reports).values(input);
  const created = await db.select().from(reports).where(eq(reports.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Report creation failed");
  return created[0];
}

export async function updateReport(id: number, input: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(reports).set(input).where(eq(reports.id, id));
  const updated = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!updated[0]) throw new Error("Report not found");
  return updated[0];
}

export async function getReportsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function searchReportsForUser(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const trimmed = query.trim();
  if (!trimmed) return getReportsForUser(userId);
  const pattern = `%${trimmed}%`;
  return db.select().from(reports).where(and(eq(reports.userId, userId), or(like(reports.company, pattern), like(reports.fileName, pattern), like(reports.headline, pattern), like(reports.summary, pattern)))).orderBy(desc(reports.createdAt));
}

export async function getReportForUser(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reports).where(and(eq(reports.id, id), eq(reports.userId, userId))).limit(1);
  return result[0];
}

export async function listCollections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collections).where(eq(collections.userId, userId)).orderBy(desc(collections.createdAt));
}

export async function createCollection(input: { userId: number; name: string; description?: string; color?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(collections).values(input);
  const created = await db.select().from(collections).where(eq(collections.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Collection creation failed");
  return created[0];
}

export async function listCollectionReports(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  const links = await db.select().from(collectionReports).where(eq(collectionReports.collectionId, collectionId)).orderBy(desc(collectionReports.createdAt));
  const result = [];
  for (const link of links) {
    const report = await db.select().from(reports).where(eq(reports.id, link.reportId)).limit(1);
    if (report[0]) result.push(report[0]);
  }
  return result;
}

export async function addReportToCollection(collectionId: number, reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(collectionReports).where(and(eq(collectionReports.collectionId, collectionId), eq(collectionReports.reportId, reportId))).limit(1);
  if (!existing[0]) await db.insert(collectionReports).values({ collectionId, reportId });
  return { success: true } as const;
}

export async function listAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
}

export async function createAlert(input: { userId: number; name: string; query: string; channel: "in_app" | "email" | "slack"; destination?: string; frequency: "instant" | "daily" | "weekly" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(alerts).values(input);
  const created = await db.select().from(alerts).where(eq(alerts.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Alert creation failed");
  return created[0];
}

export async function toggleAlert(id: number, userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(alerts).set({ enabled: enabled ? 1 : 0 }).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  return { success: true } as const;
}

export async function createDelivery(input: { userId: number; reportId: number; channel: "email" | "slack"; destination: string; status: "simulated" | "sent" | "failed"; message: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(deliveries).values(input);
  return { success: true } as const;
}

export async function listDeliveries(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deliveries).where(eq(deliveries.userId, userId)).orderBy(desc(deliveries.createdAt));
}
