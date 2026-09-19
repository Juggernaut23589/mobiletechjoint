import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { TEAM } from "@/lib/team";

export const metadata: Metadata = {
  title: "Our Team",
  description:
    "The creators, engineers and shooters who decide what MobileTechJoint stocks — and why.",
};

export default function TeamIndexPage() {
  return (
    <div>
      <section className="bg-brand-900 px-4 py-14 text-white sm:px-8 sm:py-20">
        <div className="bg-grid-texture mx-auto max-w-[1360px]">
          <div className="mb-5 text-[13px] text-white/60">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-white">Team</span>
          </div>
          <span className="mb-3 inline-block text-[11.5px] font-bold uppercase tracking-[0.16em] text-accent-400">
            The people behind the picks
          </span>
          <h1 className="font-display max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Every shelf here is curated by someone who works in it.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/65">
            We&apos;re a small team of working creators and technicians. Before anything goes on
            sale, the person who specialises in that kind of gear has used it on a real job.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-4 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <Link
              key={member.slug}
              href={`/team/${member.slug}`}
              className="group flex overflow-hidden rounded-[24px] border border-neutral-200/70 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-glow"
            >
              <div className="relative w-[42%] shrink-0 bg-brand-900">
                <Image
                  src={member.photo}
                  alt={`${member.name}, ${member.role}`}
                  fill
                  sizes="(min-width: 1024px) 190px, (min-width: 640px) 25vw, 42vw"
                  className="team-portrait object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <span className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-500">
                    {member.role}
                  </span>
                  <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-brand-900">
                    {member.name}
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                    {member.tagline}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700">
                  Read profile
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
