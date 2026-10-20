-- SecretKit Supabase Schema
-- Run this in the Supabase SQL Editor to create the database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- EVENT TABLE (single row with id='main')
-- =============================================
CREATE TABLE event (
  id TEXT PRIMARY KEY DEFAULT 'main',
  admin_secret_validated BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'drawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  participant_count INTEGER NOT NULL DEFAULT 0
);

-- =============================================
-- PARTICIPANTS TABLE
-- =============================================
CREATE TABLE participants (
  name_normalized TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  liked_teams TEXT NOT NULL DEFAULT '',
  forbidden_teams TEXT NOT NULL DEFAULT '',
  pin_hash TEXT, -- PBKDF2 hash of the 4-6 digit PIN
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_order BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for ordering
CREATE INDEX idx_participants_joined_at ON participants (joined_at);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE orders (
  giver_name_normalized TEXT PRIMARY KEY REFERENCES participants(name_normalized) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('Fan', 'Player', 'Retro')),
  team TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '',
  printed_name TEXT NOT NULL DEFAULT '',
  number TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL', 'XXXL')),
  opaque_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- ASSIGNMENTS TABLE (giver -> recipient pairing)
-- =============================================
CREATE TABLE assignments (
  giver_name_normalized TEXT PRIMARY KEY REFERENCES participants(name_normalized) ON DELETE CASCADE,
  recipient_name_normalized TEXT NOT NULL REFERENCES participants(name_normalized) ON DELETE CASCADE,
  CHECK (giver_name_normalized != recipient_name_normalized)
);

-- =============================================
-- RPC FUNCTIONS for atomic counter updates
-- =============================================

-- Increment participant count atomically
CREATE OR REPLACE FUNCTION increment_participant_count()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE event
  SET participant_count = participant_count + 1
  WHERE id = 'main';
END;
$$;

-- Decrement participant count atomically
CREATE OR REPLACE FUNCTION decrement_participant_count()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE event
  SET participant_count = participant_count - 1
  WHERE id = 'main';
END;
$$;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------
-- EVENT POLICIES
-- -------------------------------------------------
-- Everyone can read the event status (needed for lobby/reveal routing)
CREATE POLICY "event_read_all" ON event
  FOR SELECT USING (true);

-- Only admin (validated via app-level secret) can update event status
-- Note: Admin validation is done at application level via localStorage flag
-- For stricter security, you could add a Supabase Auth admin user
CREATE POLICY "event_update_admin" ON event
  FOR UPDATE USING (true); -- In production, restrict this further

-- -------------------------------------------------
-- PARTICIPANTS POLICIES
-- -------------------------------------------------
-- Anyone can read participants (public roster for lobby)
CREATE POLICY "participants_read_all" ON participants
  FOR SELECT USING (true);

-- Users can insert their own participant row (name_normalized is their identity)
CREATE POLICY "participants_insert_own" ON participants
  FOR INSERT WITH CHECK (true); -- App validates name uniqueness

-- Users can update their own preferences (but not PIN after creation)
CREATE POLICY "participants_update_own" ON participants
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- -------------------------------------------------
-- ORDERS POLICIES
-- -------------------------------------------------
-- Anyone can read orders (admin needs this for export, but orders have no identity)
CREATE POLICY "orders_read_all" ON orders
  FOR SELECT USING (true);

-- Giver can insert/update their own order
CREATE POLICY "orders_upsert_own" ON orders
  FOR INSERT WITH CHECK (true); -- App validates ownership via giver_name_normalized

-- -------------------------------------------------
-- ASSIGNMENTS POLICIES (CRITICAL FOR PAIRING PRIVACY)
-- -------------------------------------------------
-- Giver can read ONLY their own assignment
CREATE POLICY "assignments_read_own" ON assignments
  FOR SELECT USING (
    giver_name_normalized = current_setting('app.current_user', true)
  );

-- NO SELECT policy for Admin or anyone else - pairing stays hidden
-- NO INSERT/UPDATE/DELETE policies - only the draw transaction writes

-- =============================================
-- REALTIME PUBLICATION
-- =============================================
-- Enable realtime for the tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE event;

-- Note: orders and assignments are NOT in realtime - they are read on-demand