export const SUBSCRIPTION_PLANS = {
  MONTHLY: {
    id: "MONTHLY",
    name: "Monthly Subscription",
    price: 499, // in INR
    currency: "INR",
    durationDays: 30,
    maxDevices: 2,
    description: "Full access for 30 days on up to 2 Windows devices"
  },
  YEARLY: {
    id: "YEARLY",
    name: "Annual Subscription",
    price: 4999, // in INR
    currency: "INR",
    durationDays: 365,
    maxDevices: 2,
    description: "Full access for 1 year on up to 2 Windows devices"
  },
  LIFETIME: {
    id: "LIFETIME",
    name: "Lifetime License",
    price: 14999, // in INR
    currency: "INR",
    durationDays: 36500, // 100 years
    maxDevices: 2,
    description: "Perpetual access on up to 2 Windows devices"
  }
};

export function getPlan(planId) {
  return SUBSCRIPTION_PLANS[planId?.toUpperCase()] || null;
}

