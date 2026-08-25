// Tip amount is customer-chosen at checkout (None / 10% / 15% / 20% / custom
// dollar amount) but always validated server-side against the booking total
// before it reaches Stripe.
export function isValidTipCents(tipCents: number, totalCents: number): boolean {
  return Number.isInteger(tipCents) && tipCents >= 0 && tipCents <= totalCents;
}
