import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { TEAM, getTeamMember } from "@/lib/team";

export function generateStaticParams() {
  return TEAM.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) return {};
  return {
    title: `${member.name} — ${member.role}`,
    description: member.tagline,
  };
}

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = getTeamMember(slug);
  if (!member) notFound();

  const index = TEAM.findIndex((m) => m.slug === member.slug);
  const next = TEAM[(index + 1) % TEAM.length];

  return (
    <div>
      <section className="bg-brand-900 text-white">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center lg:gap-16">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[28px] bg-brand-900 shadow-2xl">
            <Image
              src={member.photo}
              alt={`${member.name}, ${member.role}`}
              fill
              preload
              sizes="(min-width: 1024px) 420px, 90vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-900/70 via-transparent to-transparent" />
          </div>

          <div>
            <div className="mb-6 text-[13px] text-white/60">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-1.5">/</span>
              <Link href="/team" className="hover:text-white">
                Team
              </Link>
              <span className="mx-1.5">/</span>
              <span className="text-white">{member.name}</span>
            </div>
            <span className="inline-block rounded-full border border-accent-500/40 bg-accent-500/15 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.14em] text-accent-400">
              {member.role}
            </span>
            <h1 className="font-display mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              {member.name}
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-white/65">
              {member.tagline}
            </p>

            <blockquote className="mt-8 flex max-w-xl gap-3 rounded-[20px] border border-white/10 bg-white/5 p-5">
              <Quote className="h-5 w-5 shrink-0 text-accent-400" />
              <p className="font-display text-[17px] font-medium leading-snug text-white/90">
                {member.quote}
              </p>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-4 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,340px)]">
          <article className="max-w-3xl">
            <span className="mb-2 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent-500">
              What {member.firstName} does here
            </span>
            <h2 className="font-display mb-6 text-[26px] font-bold leading-[1.1] tracking-tight text-brand-900 sm:text-[30px]">
              Why the {member.role.toLowerCase()} decides what you can buy.
            </h2>
            <div className="space-y-5 text-[16px] leading-[1.75] text-neutral-700">
              {member.bio.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="space-y-5 lg:pt-10">
            <div className="rounded-[24px] border border-neutral-200/70 bg-white p-6">
              <h3 className="font-display mb-1 text-lg font-bold tracking-tight text-brand-900">
                Shop what {member.firstName} picks
              </h3>
              <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
                The parts of the store {member.firstName} personally curates.
              </p>
              <ul className="flex flex-col gap-2">
                {member.curates.map((c) => (
                  <li key={c.href}>
                    <Link
                      href={c.href}
                      className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-surface px-4 py-3 text-[14px] font-semibold text-neutral-900 transition-all hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"
                    >
                      {c.label}
                      <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={`/team/${next.slug}`}
              className="group flex items-center gap-4 rounded-[24px] border border-neutral-200/70 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-glow"
            >
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-2xl bg-brand-900">
                <Image
                  src={next.photo}
                  alt={`${next.name}, ${next.role}`}
                  fill
                  sizes="56px"
                  className="team-portrait object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-500">
                  Next: {next.role}
                </span>
                <span className="font-display block truncate text-[15px] font-bold text-brand-900">
                  {next.name}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/team"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 hover:text-brand-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to the whole team
            </Link>
          </aside>
        </div>
      </section>
    </div>
  );
}
