import Image from "next/image";
import GroupPhoto from "@/assets/GroupPhoto.jpg";

export function AboutSection() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-b border-[#2b2b2b] bg-black py-16 sm:py-24"
    >
      <div className="container-wrap">
        <h2 className="text-4xl font-bold text-white sm:text-5xl">
          About <span className="text-[#f5b642]">Our Club</span>
        </h2>
        <p className="mt-2 text-lg text-[#b8a98a] sm:text-xl">
          Who we are and what drives us forward
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#2f2f2f] shadow-[0_0_40px_-12px_rgba(245,182,66,0.25)]">
            <Image
              src={GroupPhoto}
              alt="Generative AI Club members"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          <div className="space-y-6 text-[#cfcfcf]">
            <p className="text-lg leading-relaxed">
              The Generative AI Club is a student-led community for anyone curious about{" "}
              <span className="font-medium text-[#f5b642]">prompt engineering</span>,{" "}
              <span className="font-medium text-[#f5b642]">large language models</span>, and
              building real projects with modern AI tools.
            </p>
            <p className="leading-relaxed text-[#bfbfbf]">
              We run workshops, collaborate on experiments, and support each other from first
              ideas through demos—whether you&apos;re new to ML or already shipping side projects.
            </p>
            <p className="leading-relaxed text-[#bfbfbf]">
              Join us to learn together, share what you build, and help shape how generative tech
              gets used on campus and beyond.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
