import type { ReactNode } from "react";
type SocialLink = {
    label: string;
    href: string;
    icon: ReactNode;
  };
  
  function IconSvg({ children }: { children: ReactNode }) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="currentColor"
      >
        {children}
      </svg>
    );
  }
  
  const socialLinks: SocialLink[] = [
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/pressurecal",
      icon: (
        <IconSvg>
          <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 8h4V23h-4V8Zm7.5 0h3.84v2.05h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.67 4.8 6.14V23h-4v-7.84c0-1.87-.03-4.28-2.61-4.28-2.61 0-3.01 2.04-3.01 4.15V23h-4V8Z" />
        </IconSvg>
      ),
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/@UsePressureCal",
      icon: (
        <IconSvg>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.5-5.8ZM9.6 15.57V8.43L15.82 12 9.6 15.57Z" />
        </IconSvg>
      ),
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/pressure.cal",
      icon: (
        <IconSvg>
          <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.35a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
        </IconSvg>
      ),
    },
    {
      label: "Facebook",
      href: "https://www.facebook.com/PressureCal",
      icon: (
        <IconSvg>
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </IconSvg>
      ),
    },
    {
      label: "Threads",
      href: "https://www.threads.net/@pressure.cal",
      icon: <span className="text-[15px] font-semibold leading-none">@</span>,
    },
  ];
  
  export default function FooterSocialLinks() {
    return (
      <nav aria-label="PressureCal social media" className="mt-4">
        <div className="flex items-center gap-2">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              aria-label={`PressureCal on ${link.label}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              {link.icon}
            </a>
          ))}
        </div>
      </nav>
    );
  }