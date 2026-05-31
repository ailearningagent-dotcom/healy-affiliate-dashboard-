import type { Metadata } from "next";
import BookPageClient from "./BookPage";

export const metadata: Metadata = {
  title: "Book a Discovery Call",
  description:
    "Schedule a discovery call to learn how we can help you achieve your goals.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function BookPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
        {/* Left Panel — Brand / Messaging */}
        <div className="relative flex flex-col justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-6 py-12 text-white lg:w-[40%] lg:px-10 lg:py-16 xl:px-14">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent-500/10 blur-3xl" />

          <div className="relative z-10">
            {/* Logo mark */}
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              Let&apos;s find a time
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/70 max-w-md">
              Book a discovery call and let&apos;s discuss your goals, challenges,
              and how we can help your business grow.
            </p>

            {/* Trust signals */}
            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-white/70">Free 30-minute consultation</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-white/70">Google Meet video link included</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-white/70">No commitment, no pressure</span>
              </div>
            </div>

            {/* Bottom testimonial / trust */}
            <div className="mt-12 border-t border-white/10 pt-6">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-6 w-6 rounded-full border-2 border-primary-800 bg-white/20"
                    />
                  ))}
                </div>
                <p className="text-xs text-white/50">
                  Join <span className="font-semibold text-white/80">100+</span> businesses using MarketAI
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — Booking Widget */}
        <div className="flex flex-1 items-center justify-center bg-surface-50 px-4 py-12 lg:px-8 lg:py-16 xl:px-16">
          <div className="w-full max-w-lg">
            <BookPageClient />
          </div>
        </div>
      </div>
    </div>
  );
}
