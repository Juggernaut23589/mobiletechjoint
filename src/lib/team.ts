import { createPublicClient } from "@/lib/supabase/server";

export interface TeamMember {
  slug: string;
  name: string;
  firstName: string;
  role: string;
  /** One line under the name on the homepage card. */
  tagline: string;
  /** Storage public URL or a /team/... bundled original. */
  photo: string;
  /** Categories this person personally curates, as category slugs used
   *  for the "Shop what {firstName} picks" links on their profile. */
  curates: { label: string; href: string }[];
  /** Profile page copy, one paragraph per entry. */
  bio: string[];
  /** Short pull-quote for the profile hero. */
  quote: string;
}

interface TeamMemberRow {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  quote: string;
  bio: string;
  photo_url: string | null;
  curates: { label: string; href: string }[] | null;
}

function rowToMember(row: TeamMemberRow): TeamMember {
  return {
    slug: row.slug,
    name: row.name,
    firstName: row.name.split(" ")[0],
    role: row.role,
    tagline: row.tagline,
    photo: row.photo_url || "/team/placeholder.jpg",
    curates: row.curates ?? [],
    bio: row.bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    quote: row.quote,
  };
}

/** Public "Meet the team" profiles — managed from the staff dashboard's
 *  "Manage team blog" (see staff-team.ts), stored in team_members. */
export async function getPublishedTeamMembers(): Promise<TeamMember[]> {
  const { data } = await createPublicClient()
    .from("team_members")
    .select("slug, name, role, tagline, quote, bio, photo_url, curates")
    .eq("is_published", true)
    .order("position", { ascending: true });
  return (data ?? []).map(rowToMember);
}

export async function getTeamMember(slug: string): Promise<TeamMember | undefined> {
  const { data } = await createPublicClient()
    .from("team_members")
    .select("slug, name, role, tagline, quote, bio, photo_url, curates")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ? rowToMember(data) : undefined;
}
