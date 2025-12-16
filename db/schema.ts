import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  isPremium: boolean("isPremium").default(false),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  // Chat preferences
  chatStyle: text("chatStyle"),
  gender: text("gender"),
  isSearching: boolean("isSearching").default(false),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const chatSession = pgTable("chatSession", {
  id: text("id").primaryKey(),
  user1Id: text("user1Id")
    .notNull()
    .references(() => user.id),
  user2Id: text("user2Id")
    .notNull()
    .references(() => user.id),
  status: text("status").notNull().default("active"), // active, ended
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  endedAt: timestamp("endedAt"),
});

export const message = pgTable("message", {
  id: text("id").primaryKey(),
  sessionId: text("sessionId")
    .notNull()
    .references(() => chatSession.id),
  senderId: text("senderId")
    .notNull()
    .references(() => user.id),
  content: text("content").notNull(),
  type: text("type").notNull().default("text"), // text, icebreaker, system, voice
  audioUrl: text("audioUrl"), // Cloudinary URL for voice messages
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});
