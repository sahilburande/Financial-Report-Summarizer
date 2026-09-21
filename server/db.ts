import { and, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  alerts,
  collectionReports,
  collections,
  deliveries,
  InsertReport,
  InsertUser,
  Report,
  reports,
  User,
  users,
  Collection,
  Alert,
  Delivery,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

const useDatabase = process.env.USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL);

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!useDatabase) return null;
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect; using memory storage:", error);
      _db = null;
    }
  }
  return _db;
}

// The free Render deployment works without a separate database.
// Memory storage keeps the demo functional; data is reset when the service restarts.
let nextUserId = 1;
let nextReportId = 1;
let nextCollectionId = 1;
let nextCollectionReportId = 1;
let nextAlertId = 1;
let nextDeliveryId = 1;

const memoryUsers: User[] = [];
const memoryReports: Report[] = [];
const memoryCollections: Collection[] = [];
const memoryCollectionReports: Array<{
  id: number; collectionId: number; reportId: number; createdAt: Date;
}> = [];
const memoryAlerts: Alert[] = [];
const memoryDeliveries: Delivery[] = [];

const now = () => new Date();

function memoryUser(user: InsertUser): User {
  const existing = memoryUsers.find(u => u.openId === user.openId);
  if (existing) {
    if (user.name !== undefined) existing.name = user.name ?? null;
    if (user.email !== undefined) existing.email = user.email ?? null;
    if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
    if (user.role !== undefined) existing.role = user.role;
    existing.lastSignedIn = user.lastSignedIn ?? now();
    existing.updatedAt = now();
    return existing;
  }
  const created: User = {
    id: nextUserId++,
    openId: user.openId!,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? "guest",
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    createdAt: now(),
    updatedAt: now(),
    lastSignedIn: user.lastSignedIn ?? now(),
  };
  memoryUsers.push(created);
  return created;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    memoryUser(user);
    return;
  }
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
  if (!db) return memoryUsers.find(u => u.openId === openId);
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createReport(input: InsertReport) {
  const db = await getDb();
  if (!db) {
    const report: Report = {
      id: nextReportId++,
      userId: input.userId,
      fileKey: input.fileKey ?? null,
      fileUrl: input.fileUrl ?? null,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      status: input.status ?? "processing",
      company: input.company ?? null,
      period: input.period ?? null,
      headline: input.headline ?? null,
      summary: input.summary ?? null,
      highlights: input.highlights ?? null,
      metrics: input.metrics ?? null,
      risks: input.risks ?? null,
      actions: input.actions ?? null,
      sentiment: input.sentiment ?? null,
      confidence: input.confidence ?? null,
      createdAt: now(),
      updatedAt: now(),
    };
    memoryReports.unshift(report);
    return report;
  }
  const result = await db.insert(reports).values(input);
  const created = await db.select().from(reports).where(eq(reports.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Report creation failed");
  return created[0];
}

export async function updateReport(id: number, input: Partial<InsertReport>) {
  const db = await getDb();
  if (!db) {
    const report = memoryReports.find(r => r.id === id);
    if (!report) throw new Error("Report not found");
    Object.assign(report, input, { updatedAt: now() });
    return report;
  }
  await db.update(reports).set(input).where(eq(reports.id, id));
  const updated = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!updated[0]) throw new Error("Report not found");
  return updated[0];
}

export async function getReportsForUser(userId: number) {
  const db = await getDb();
  if (!db) return memoryReports.filter(r => r.userId === userId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function searchReportsForUser(userId: number, query: string) {
  const db = await getDb();
  if (!db) {
    const trimmed = query.trim().toLowerCase();
    const reportsForUser = memoryReports.filter(r => r.userId === userId);
    if (!trimmed) return reportsForUser;
    return reportsForUser.filter(r =>
      [r.company, r.fileName, r.headline, r.summary].some(v => (v || "").toLowerCase().includes(trimmed))
    );
  }
  const trimmed = query.trim();
  if (!trimmed) return getReportsForUser(userId);
  const pattern = `%${trimmed}%`;
  return db.select().from(reports).where(and(eq(reports.userId, userId), or(like(reports.company, pattern), like(reports.fileName, pattern), like(reports.headline, pattern), like(reports.summary, pattern)))).orderBy(desc(reports.createdAt));
}

export async function getReportForUser(id: number, userId: number) {
  const db = await getDb();
  if (!db) return memoryReports.find(r => r.id === id && r.userId === userId);
  const result = await db.select().from(reports).where(and(eq(reports.id, id), eq(reports.userId, userId))).limit(1);
  return result[0];
}

export async function listCollections(userId: number) {
  const db = await getDb();
  if (!db) return memoryCollections.filter(c => c.userId === userId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(collections).where(eq(collections.userId, userId)).orderBy(desc(collections.createdAt));
}

export async function createCollection(input: { userId: number; name: string; description?: string; color?: string }) {
  const db = await getDb();
  if (!db) {
    const item: Collection = {
      id: nextCollectionId++,
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "sage",
      createdAt: now(),
    };
    memoryCollections.unshift(item);
    return item;
  }
  const result = await db.insert(collections).values(input);
  const created = await db.select().from(collections).where(eq(collections.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Collection creation failed");
  return created[0];
}

export async function listCollectionReports(collectionId: number) {
  const db = await getDb();
  if (!db) {
    const links = memoryCollectionReports.filter(l => l.collectionId === collectionId);
    return links.map(l => memoryReports.find(r => r.id === l.reportId)).filter(Boolean) as Report[];
  }
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
  if (!db) {
    if (!memoryCollectionReports.some(l => l.collectionId === collectionId && l.reportId === reportId)) {
      memoryCollectionReports.push({ id: nextCollectionReportId++, collectionId, reportId, createdAt: now() });
    }
    return { success: true } as const;
  }
  const existing = await db.select().from(collectionReports).where(and(eq(collectionReports.collectionId, collectionId), eq(collectionReports.reportId, reportId))).limit(1);
  if (!existing[0]) await db.insert(collectionReports).values({ collectionId, reportId });
  return { success: true } as const;
}

export async function listAlerts(userId: number) {
  const db = await getDb();
  if (!db) return memoryAlerts.filter(a => a.userId === userId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
}

export async function createAlert(input: { userId: number; name: string; query: string; channel: "in_app" | "email" | "slack"; destination?: string; frequency: "instant" | "daily" | "weekly" }) {
  const db = await getDb();
  if (!db) {
    const item: Alert = {
      id: nextAlertId++,
      userId: input.userId,
      name: input.name,
      query: input.query,
      channel: input.channel,
      destination: input.destination ?? null,
      frequency: input.frequency,
      enabled: 1,
      lastTriggeredAt: null,
      createdAt: now(),
    };
    memoryAlerts.unshift(item);
    return item;
  }
  const result = await db.insert(alerts).values(input);
  const created = await db.select().from(alerts).where(eq(alerts.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Alert creation failed");
  return created[0];
}

export async function toggleAlert(id: number, userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) {
    const item = memoryAlerts.find(a => a.id === id && a.userId === userId);
    if (item) item.enabled = enabled ? 1 : 0;
    return { success: true } as const;
  }
  await db.update(alerts).set({ enabled: enabled ? 1 : 0 }).where(and(eq(alerts.id, id), eq(alerts.userId, userId)));
  return { success: true } as const;
}

export async function createDelivery(input: { userId: number; reportId: number; channel: "email" | "slack"; destination: string; status: "simulated" | "sent" | "failed"; message: string }) {
  const db = await getDb();
  if (!db) {
    memoryDeliveries.unshift({
      id: nextDeliveryId++,
      userId: input.userId,
      reportId: input.reportId,
      channel: input.channel,
      destination: input.destination,
      status: input.status,
      message: input.message,
      createdAt: now(),
    });
    return { success: true } as const;
  }
  await db.insert(deliveries).values(input);
  return { success: true } as const;
}

export async function listDeliveries(userId: number) {
  const db = await getDb();
  if (!db) return memoryDeliveries.filter(d => d.userId === userId).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
  return db.select().from(deliveries).where(eq(deliveries.userId, userId)).orderBy(desc(deliveries.createdAt));
}
