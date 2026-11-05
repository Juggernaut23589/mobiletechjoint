import { WhatsAppBadge } from "@/components/SocialLinks";

/** Always-visible floating WhatsApp button, fixed to the bottom-right of
 *  every page (the business's preferred corner) so a customer can reach
 *  chat support no matter where they've scrolled to — not just the
 *  homepage/Contact page sections. BackToTop shares this corner but sits
 *  higher up (see its own comment) so the two never overlap. Renders
 *  nothing if no WhatsApp destination is configured, same as every other
 *  use of WhatsAppBadge. */
export function WhatsAppFloatingButton() {
  return (
    <div className="fixed bottom-16 right-5 z-20 sm:bottom-20 sm:right-8">
      <WhatsAppBadge size={52} />
    </div>
  );
}
