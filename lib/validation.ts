import { z } from "zod";

export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  team_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  role: z.string().min(2).max(100),
  position: z.string().min(2).max(100),
  linkedin_url: z.string().max(500).optional().or(z.literal("")),
  image_url: z.string().max(500).optional().or(z.literal("")),
  status: z.enum(["pending", "active"]).default("active"),
});

export const teamSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  image_url: z.string().max(500).optional().or(z.literal("")),
});

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(140),
  short_description: z.string().min(10).max(240),
  image_url: z.string().max(500).optional().or(z.literal("")),
  github_url: z.string().max(500).optional().or(z.literal("")),
  live_url: z.string().max(500).optional().or(z.literal("")),
  blog_url: z.string().max(500).optional().or(z.literal("")),
});

export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(140),
  description: z.string().min(10).max(300),
  venue: z.string().min(2).max(140),
  event_date: z.string().min(10),
  status: z.enum(["upcoming", "live"]),
  image_url: z.string().max(500).optional().or(z.literal("")),
  register_url: z.string().max(500).optional().or(z.literal("")),
});
