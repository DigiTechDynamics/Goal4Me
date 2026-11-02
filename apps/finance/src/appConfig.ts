import { APP_NAMES, configureApp } from "@goal4me/app-kit/app/config";

/**
 * Registers Goal4Me Money with the shared kit. Imported first by the root
 * layout, so it runs before any screen renders.
 */
configureApp({
  id: "money",
  name: APP_NAMES.money,
  startHref: "/sign-up",
  startLabel: "Create a free account",
  signUp: {
    title: "Take control of your money",
    subtitle: "Create a free account to budget, save towards goals and learn as you go.",
  },
  premiumBenefits: [
    "All 30 money lessons and quizzes",
    "New lesson tracks as they launch",
    `Every workout and run plan in ${APP_NAMES.fitness}`,
    "Support Goal4Me's development",
  ],
  disclaimer:
    "Goal4Me Money provides general financial education. It is not personal financial advice, and it never connects to your bank.",
  // Money keeps nothing on the device beyond the shared query cache, which the kit clears.
});
