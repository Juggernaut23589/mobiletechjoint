import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TEAM } from "@/lib/team";

/** "Meet the team" block before the footer. Portraits share one grayscale
 *  treatment (the source photos are a mix of colour and B&W) and warm up
 *  to full colour on hover; each card opens the person's profile page. */
export function TeamSection() {
  return (
    <section id="team" className="mx-auto max-w-[1360px] px-4 py-16 sm:px-8 sm:py-20">
      <SectionHeader
        eyebrow="The people behind the picks"
        title="Meet the team"
        subtitle="Every category in this store is curated by someone who works in it. Tap a face to see what they bring to your kit."
        action={{ label: "Full team", href: "/team" }}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TEAM.map((member, i) => (
          <RevealOnScroll key={member.slug} delay={Math.min(i, 5) * 0.06}>
            <Link
              href={`/team/${member.slug}`}
              className="group relative block overflow-hidden rounded-[22px] bg-brand-900 shadow-[0_10px_30px_-18px_rgba(11,14,20,0.5)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={member.photo}
                  alt={`${member.name}, ${member.role}`}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                  className="team-portrait object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900 via-brand-900/30 to-transparent" />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-accent-400">
                  {member.role}
                </span>
                <h3 className="font-display text-[15px] font-bold leading-tight text-white">
                  {member.name}
                </h3>
              </div>
            </Link>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
