export type EventStatus = "upcoming" | "live";

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  role: string;
  position: string;
  linkedin_url: string | null;
  image_url: string | null;
  status: "pending" | "active";
  created_at: string;
  updated_at: string;
  team?: Team;
}

export interface Project {
  id: string;
  title: string;
  short_description: string;
  image_url: string | null;
  github_url: string | null;
  live_url: string | null;
  blog_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  event_date: string;
  status: EventStatus;
  image_url: string | null;
  register_url: string | null;
  created_at: string;
  updated_at: string;
}
