import { useEffect, useMemo, useState } from "react";

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress =
        docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;

      setIsVisible(scrollTop > 300);
      setScrollProgress(progress);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const circumference = useMemo(() => 2 * Math.PI * 20, []);
  const dashOffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className={[
        "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full",
        "transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-3 opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <span className="absolute inset-0 rounded-full bg-white shadow-lg ring-1 ring-slate-200" />

      <svg
        className="absolute inset-0 h-14 w-14 -rotate-90"
        viewBox="0 0 48 48"
        aria-hidden="true"
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="rgb(226 232 240)"
          strokeWidth="3"
        />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="rgb(24 49 112)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-200"
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center text-slate-900">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </svg>
      </span>
    </button>
  );
}