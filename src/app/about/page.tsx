import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "About Us",
  description: "Who MobileTechJoint is and what we do.",
};

export default function AboutPage() {
  return (
    <LegalPage title="About Us" updated="October 2026">
      <p>
        At MobileTechJoint (MTJ), we make content creation easier with the right tools and
        technology. We offer a wide range of digital gadgets and accessories, including
        microphones, lighting equipment, tripods, camera accessories, adapters, smart bags, and
        other essential tools for content creators, filmmakers, and tech enthusiasts.
      </p>
      <p>
        Our goal is to make quality content creation equipment accessible to everyone, whether
        you&apos;re a beginner, a professional creator, or a business looking to upgrade your
        setup.
      </p>
      <p>
        We are committed to providing quality products, a seamless shopping experience, and
        reliable customer service to help you find the right tools for your needs.
      </p>
      <h2>At MobileTechJoint, we bring the tools you need to create, connect, and do more.</h2>
    </LegalPage>
  );
}
