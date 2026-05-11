-- Migration 002: Add week column to plan_action for week-granularity planning
ALTER TABLE plan_action ADD COLUMN week INTEGER;
