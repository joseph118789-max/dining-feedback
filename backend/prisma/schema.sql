-- Dining Feedback System - Prisma Schema
-- PostgreSQL with Google OAuth2 SSO integration

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// Table: feedbacks
// Main feedback collection table
// ============================================
model Feedback {
  id            String   @id @default(uuid()) @db.Uuid
  customerEmail String   @map("customer_email") @db.VarChar(255)
  phoneNumber   String?  @map("phone_number") @db.VarChar(20)
  rating        Int
  comments      String?  @db.Text
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([customerEmail])
  @@index([rating])
  @@index([createdAt(sort: Desc)])
}

// ============================================
// Table: OAuthSession
// SSO session tracking for Google OAuth2
// ============================================
model OAuthSession {
  id           String    @id @default(uuid()) @db.Uuid
  provider     String    @default("google") @db.VarChar(50)
  providerId   String    @map("provider_id") @db.VarChar(255)
  email        String    @db.VarChar(255)
  accessToken  String?   @map("access_token") @db.Text
  refreshToken String?   @map("refresh_token") @db.Text
  expiresAt    DateTime? @map("expires_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@unique([provider, providerId])
  @@index([email])
}

// ============================================
// Table: Admin
// Admin portal users
// ============================================
model Admin {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique @db.VarChar(255)
  name      String?  @db.VarChar(255)
  role      String   @default("reviewer") @db.VarChar(50)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}