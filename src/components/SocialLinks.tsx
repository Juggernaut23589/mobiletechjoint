/** Social icon row for the footer and Contact page — each icon only
 *  renders when its env var is set (same no-fabricated-details pattern as
 *  the rest of the contact block in SiteFooter), in the platform's own
 *  brand colour so they read at a glance rather than as generic outline
 *  icons. Add a platform by adding its env var + icon here. */

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="10%" stopColor="#FFDD55" />
          <stop offset="50%" stopColor="#FF543E" />
          <stop offset="100%" stopColor="#C837AB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.3" cy="7.7" r="0.9" fill="#fff" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path
        d="M14.5 8.5h1.7V6h-2c-2 0-3.2 1.3-3.2 3.3V11H9v2.5h2v6h2.7v-6h2.1l.4-2.5h-2.5V9.6c0-.6.2-1.1 1-1.1Z"
        fill="#fff"
      />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path
        d="M14.3 5.2c.3 1.6 1.3 2.6 3 2.8v2.1c-1.1 0-2.1-.3-3-.9v4.6a4.1 4.1 0 1 1-4.1-4.1c.2 0 .5 0 .7.1v2.2a2 2 0 1 0 1.4 1.9V5.2h2Z"
        fill="#fff"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path
        d="M6.5 6.5 11 12.4 6.3 17.5h1.6l3.9-4.2 3.1 4.2h3L13 11.2l4.4-4.7h-1.6l-3.6 3.9-2.8-3.9h-3Z"
        fill="#fff"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="m10.5 9 4.5 3-4.5 3V9Z" fill="#fff" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#25D366" />
      <path
        d="M12 5.5a6.5 6.5 0 0 0-5.6 9.8L5.5 18.5l3.3-.9A6.5 6.5 0 1 0 12 5.5Zm0 1.4a5.1 5.1 0 1 1-2.7 9.4l-.3-.2-2 .5.5-1.9-.2-.3A5.1 5.1 0 0 1 12 6.9Zm-2 2.2c-.2 0-.4 0-.5.3-.2.3-.7.8-.7 1.8s.7 2 .8 2.1c.1.2 1.4 2.1 3.3 2.9 1.6.6 1.9.5 2.3.5.4 0 1.2-.5 1.4-1 .2-.4.2-.8.1-.9-.1-.1-.2-.2-.5-.3l-1.3-.6c-.2-.1-.3-.1-.5.1l-.5.6c-.1.1-.2.2-.4.1-.2-.1-.9-.3-1.7-1.1-.6-.6-1-1.3-1.1-1.5-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4 0-.1 0-.3 0-.4l-.6-1.4c-.1-.3-.3-.3-.5-.3H10Z"
        fill="#fff"
      />
    </svg>
  );
}

const PLATFORMS = [
  { url: process.env.INSTAGRAM_URL, label: "Instagram", Icon: InstagramIcon },
  { url: process.env.FACEBOOK_URL, label: "Facebook", Icon: FacebookIcon },
  { url: process.env.TIKTOK_URL, label: "TikTok", Icon: TikTokIcon },
  { url: process.env.TWITTER_URL, label: "X (Twitter)", Icon: XIcon },
  { url: process.env.YOUTUBE_URL, label: "YouTube", Icon: YouTubeIcon },
] as const;

export function SocialLinks({ className = "" }: { className?: string }) {
  const active = PLATFORMS.filter((p) => p.url);
  if (active.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {active.map(({ url, label, Icon }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="overflow-hidden rounded-lg transition-transform hover:-translate-y-0.5"
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}

export function WhatsAppLink({ className = "" }: { className?: string }) {
  const number = process.env.WHATSAPP_NUMBER;
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number.replace(/[^0-9]/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 hover:text-white ${className}`}
    >
      <WhatsAppIcon />
      Chat on WhatsApp
    </a>
  );
}
