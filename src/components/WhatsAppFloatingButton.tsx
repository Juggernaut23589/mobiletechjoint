import { WhatsAppBadge } from "@/components/SocialLinks";

/** Always-visible floating WhatsApp button, fixed to the bottom-left of
 *  every page (BackToTop owns bottom-right, see its own comment) so a
 *  customer can reach chat support no matter where they've scrolled to —
 *  not just the homepage/Contact page sections. Renders nothing if no
 *  WhatsApp destination is configured, same as every other use of
 *  WhatsAppBadge. */
export function WhatsAppFloatingButton() {
  return (
    <div className="fixed bottom-6 left-5 z-20 sm:bottom-8 sm:left-8">
      <WhatsAppBadge size={52} />
    </div>
  );
}
