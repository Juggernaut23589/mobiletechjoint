export interface Faq {
  id: string;
  question: string;
  answer: string;
  topic: "Products" | "Ordering" | "Payment" | "Delivery" | "Support";
}

/** Homepage FAQ cards. Written for the questions creators actually ask a
 *  camera/lighting/audio store in Lagos before they commit to a purchase. */
export const FAQS: Faq[] = [
  {
    id: "original",
    topic: "Products",
    question: "Are your products original and brand new?",
    answer:
      "Yes. Everything we sell is brand new, sealed, and sourced directly from the manufacturer or an authorised distributor — Sony, Canon, DJI, Godox, Ulanzi and the rest. Each product page shows exactly what's in the box, and our team tests categories they specialise in before we stock them.",
  },
  {
    id: "ordering",
    topic: "Ordering",
    question: "How do I place an order?",
    answer:
      "Add what you need to your cart, sign in (or create an account in under a minute), confirm your delivery address, and pay securely. You'll get an email confirmation immediately and another when your order is on its way. Prefer to talk it through first? Reach us on Instagram or by phone and we'll guide you.",
  },
  {
    id: "payment",
    topic: "Payment",
    question: "What payment methods do you accept?",
    answer:
      "We accept debit and credit cards (Visa, Mastercard, Verve), bank transfer, and USSD — all processed securely through Paystack. We never see or store your full card details. Logged-in customers can save a card for faster checkout next time.",
  },
  {
    id: "delivery",
    topic: "Delivery",
    question: "How long does delivery take, and where do you deliver?",
    answer:
      "We deliver nationwide across Nigeria. Orders within Lagos typically arrive in 1–2 working days; other states usually take 2–5 working days depending on the courier route. Delivery fees are calculated at checkout from your state and LGA, and you can also arrange pickup in Lagos.",
  },
  {
    id: "warranty",
    topic: "Support",
    question: "Do you offer a warranty or returns?",
    answer:
      "All products carry the manufacturer's warranty. If an item arrives faulty or damaged, contact us within 7 days with your order number and we'll arrange a replacement or refund. Unopened items in original packaging can be returned within the same window. Our team also helps with setup questions long after the sale.",
  },
];
