/** Simple payment-method marks for the footer trust row. Mastercard's is
 *  the actual mark (two overlapping circles — easy to reproduce exactly,
 *  no typography involved); Visa and Paystack are plain wordmarks in each
 *  brand's own colour rather than an attempt at pixel-exact logotypes. */

export function VisaMark() {
  return (
    <span className="flex h-7 items-center rounded-md bg-white px-2.5">
      <span className="font-display text-[15px] font-black italic tracking-tight text-[#1A1F71]">
        VISA
      </span>
    </span>
  );
}

export function MastercardMark() {
  return (
    <span className="flex h-7 items-center rounded-md bg-white px-2">
      <svg width="34" height="20" viewBox="0 0 34 20" aria-label="Mastercard">
        <circle cx="13" cy="10" r="10" fill="#EB001B" />
        <circle cx="21" cy="10" r="10" fill="#F79E1B" />
        <path
          d="M17 2.6a9.98 9.98 0 0 1 0 14.8 9.98 9.98 0 0 1 0-14.8Z"
          fill="#FF5F00"
        />
      </svg>
    </span>
  );
}

export function PaystackMark() {
  return (
    <span className="flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#00C3F7" />
        <path
          d="M7 16V8.5a1 1 0 0 1 1-1h3.2a3.3 3.3 0 1 1 0 6.6H9.5V16H7Zm2.5-4.1h1.7a1.1 1.1 0 1 0 0-2.2H9.5v2.2Z"
          fill="#011B33"
        />
      </svg>
      <span className="font-display text-[13px] font-bold tracking-tight text-[#011B33]">
        Paystack
      </span>
    </span>
  );
}
