

# Database Migration: Extend Course System

## Overview
Run a single migration to add instructor details, learning metadata, lead capture, and coupon support to the course system.

## Changes

### A. Extend `courses` table
Add columns for instructor info (name, bio, avatar, social links), course metadata (skill level, what you'll learn, requirements, outcomes), access control (lifetime access, duration), and lead form configuration.

### B. Extend `course_modules` table
Add `is_free_preview` and `is_locked` flags per module.

### C. Extend `course_chapters` table
Add `is_free_preview`, `is_locked`, `estimated_duration_minutes`, and resource attachment fields.

### D. New table: `course_leads`
Captures lead form submissions (name, email, phone) per course. Public insert and read via RLS.

### E. New table: `course_coupons`
Discount codes per course with usage tracking and expiry. Public read for active coupons, authenticated management via RLS.

## Technical Details

Single SQL migration combining all five blocks (A-E) exactly as provided. RLS enabled on both new tables with the specified policies.

**Tables modified:** `courses`, `course_modules`, `course_chapters`
**Tables created:** `course_leads`, `course_coupons`

No frontend code changes in this step -- this is a schema-only migration.

