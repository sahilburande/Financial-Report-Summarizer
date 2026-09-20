import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  fileSize: int("fileSize").notNull(),
  status: mysqlEnum("status", ["processing", "completed", "failed"]).default("processing").notNull(),
  company: varchar("company", { length: 255 }),
  period: varchar("period", { length: 128 }),
  headline: text("headline"),
  summary: text("summary"),
  highlights: text("highlights"),
  metrics: text("metrics"),
  risks: text("risks"),
  actions: text("actions"),
  sentiment: varchar("sentiment", { length: 32 }),
  confidence: int("confidence"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  description: varchar("description", { length: 255 }),
  color: varchar("color", { length: 32 }).default("sage").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const collectionReports = mysqlTable("collectionReports", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  reportId: int("reportId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  query: varchar("query", { length: 255 }).notNull(),
  channel: mysqlEnum("channel", ["in_app", "email", "slack"]).default("in_app").notNull(),
  destination: varchar("destination", { length: 320 }),
  frequency: mysqlEnum("frequency", ["instant", "daily", "weekly"]).default("instant").notNull(),
  enabled: int("enabled").default(1).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reportId: int("reportId").notNull(),
  channel: mysqlEnum("channel", ["email", "slack"]).notNull(),
  destination: varchar("destination", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["simulated", "sent", "failed"]).default("simulated").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
