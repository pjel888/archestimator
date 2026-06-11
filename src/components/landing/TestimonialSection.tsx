import { PlaceholderMedia } from "./PlaceholderMedia";

type TestimonialProps = {
  quote: string;
  name: string;
  role: string;
  imageLabel: string;
  reverse?: boolean;
};

export function TestimonialSection({ quote, name, role, imageLabel, reverse = false }: TestimonialProps) {
  return (
    <section className="border-y border-[#dedbd6] bg-[#faf9f6] py-16">
      <figure
        className={`grid w-full gap-8 px-6 ${
          reverse ? "lg:grid-cols-[1fr_0.35fr]" : "lg:grid-cols-[0.35fr_1fr]"
        }`}
      >
        {!reverse && <PlaceholderMedia label={imageLabel} className="min-h-[280px]" />}
        <div>
          <blockquote className="text-[36px] font-normal leading-[1.05] tracking-[-0.045em] text-[#111111]">&ldquo;{quote}&rdquo;</blockquote>
          <figcaption className="mt-8 text-[15px] text-[#626260]">
            <strong className="text-[#111111]">{name}</strong>
            <br />
            {role}
          </figcaption>
        </div>
        {reverse && <PlaceholderMedia label={imageLabel} className="min-h-[280px]" />}
      </figure>
    </section>
  );
}
