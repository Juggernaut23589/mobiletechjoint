/** Expenses above this, recorded by anyone other than a super admin, wait
 *  for a super admin's approval before they count in the P&L. ₦50,000. */
export const EXPENSE_APPROVAL_LIMIT_KOBO = 5_000_000;

export const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries & wages",
  "Logistics & delivery",
  "Marketing & ads",
  "Utilities & internet",
  "Equipment & tools",
  "Packaging & supplies",
  "Bank & payment charges",
  "Repairs & maintenance",
  "Professional services",
  "Other",
];

export const RECEIPT_BUCKET = "expense-receipts";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
