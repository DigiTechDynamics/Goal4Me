import type { RunGoal, RunnerLevel, RunSessionType } from "@goal4me/core";

/** Bundled with the app (small and static), so the guide works offline. */

export interface RunnerStage {
  level: RunnerLevel;
  title: string;
  tagline: string;
  youAreHere: string;
  focus: string[];
  milestone: string;
  suggestedGoal: RunGoal;
}

export const RUNNER_STAGES: readonly RunnerStage[] = [
  {
    level: "novice",
    title: "Novice",
    tagline: "From the couch to your first 20 minutes",
    youAreHere: "Running for a few minutes leaves you out of breath, or you haven't run in years.",
    focus: [
      "Mix running and walking. Short runs with walk breaks build fitness without the misery.",
      "Go slow enough to talk. Feeling breathless means you're going too fast, not that you're unfit.",
      "Three sessions a week on non-consecutive days. Rest days are when your body adapts.",
      "Count sessions, not speed. Turning up is the whole job right now.",
    ],
    milestone: "Run 20 minutes without stopping.",
    suggestedGoal: "5k",
  },
  {
    level: "beginner",
    title: "Beginner",
    tagline: "Building a habit and your first 5K",
    youAreHere: "You can run 20–30 minutes non-stop, but less than about 15 km a week.",
    focus: [
      "Keep almost every run easy. Most beginners run too fast too often.",
      "Add a slightly longer run once a week. It is the base everything else stands on.",
      "Learn your route options: flat for easy days, gentle hills when you feel strong.",
      "Add two short strength sessions a week (squats, lunges, calf raises, planks).",
    ],
    milestone: "Run 5K comfortably and about 15 km in a week.",
    suggestedGoal: "5k",
  },
  {
    level: "intermediate",
    title: "Intermediate",
    tagline: "Getting faster and going further",
    youAreHere: "You run 15–30 km a week and have finished a 5K or 10K.",
    focus: [
      "One quality session a week: tempo runs, intervals or hill repeats.",
      "Follow the 80/20 rule: about 80% easy running, 20% hard.",
      "Grow your long run gradually towards 75–90 minutes.",
      "Start learning your paces: easy, steady, tempo and fast.",
    ],
    milestone: "Run 10K strongly and 30 km in a week without niggles.",
    suggestedGoal: "10k",
  },
  {
    level: "advanced",
    title: "Advanced",
    tagline: "Structured training for big goals",
    youAreHere: "You run 30–55 km a week and are ready for a half or full marathon.",
    focus: [
      "Two quality sessions a week, separated by easy days.",
      "Practise race-day fuelling on long runs: gels, drinks, breakfast timing.",
      "Plan in cycles: three weeks building, one lighter week, then a taper before races.",
      "Look after recovery: sleep, protein, mobility and an easy week after a race.",
    ],
    milestone: "Finish a half marathon and train at 55 km a week consistently.",
    suggestedGoal: "half",
  },
  {
    level: "pro",
    title: "Pro",
    tagline: "Performance, consistency and longevity",
    youAreHere: "You run 55+ km a week and race regularly.",
    focus: [
      "Train by pace or heart-rate zones, checked against recent race results.",
      "Use a season plan: base, build, peak and recovery phases around key races.",
      "Strength and plyometrics all year to stay powerful and injury-resistant.",
      "Track your form, sleep and resting heart rate, and back off early when they slip.",
    ],
    milestone: "Keep improving your times year after year, staying healthy.",
    suggestedGoal: "marathon",
  },
];

export const STAGE_BY_LEVEL = Object.fromEntries(
  RUNNER_STAGES.map((stage) => [stage.level, stage]),
) as Record<RunnerLevel, RunnerStage>;

export interface TipCategory {
  id: string;
  title: string;
  icon: string;
  tips: { title: string; body: string }[];
}

export const RUNNING_TIPS: readonly TipCategory[] = [
  {
    id: "form",
    title: "Running form",
    icon: "🏃",
    tips: [
      {
        title: "Run tall",
        body: "Imagine a string pulling the top of your head up. Lean very slightly forward from the ankles, not the waist.",
      },
      {
        title: "Short, quick steps",
        body: "Land with your foot under your body rather than reaching ahead. Quicker, lighter steps are easier on the knees.",
      },
      {
        title: "Relax your upper body",
        body: "Loose shoulders, hands softly cupped, arms swinging forward and back, not across your chest.",
      },
      {
        title: "Look ahead",
        body: "Eyes 10–20 metres in front, not at your feet. Your neck and back will thank you.",
      },
    ],
  },
  {
    id: "breathing",
    title: "Breathing and pace",
    icon: "🫁",
    tips: [
      {
        title: "The talk test",
        body: "On easy runs you should be able to speak in full sentences. If you can't, slow down or walk for a minute.",
      },
      {
        title: "Breathe through your belly",
        body: "Let your stomach rise as you breathe in. Mouth and nose together is fine: you need the air.",
      },
      {
        title: "Start slower than you want to",
        body: "The first 10 minutes should feel almost too easy. Most runs that go wrong started too fast.",
      },
    ],
  },
  {
    id: "gear",
    title: "Shoes and gear",
    icon: "👟",
    tips: [
      {
        title: "Comfort beats hype",
        body: "Choose the shoe that feels comfortable in the shop. Leave a thumb's width of space at the toe.",
      },
      {
        title: "Replace shoes every 500–800 km",
        body: "Worn cushioning is a common cause of new aches. Note the date you started using a pair.",
      },
      {
        title: "Dress for 10 °C warmer",
        body: "You heat up quickly. Slightly cold at the start means just right after a kilometre.",
      },
      {
        title: "Be seen",
        body: "Wear bright or reflective kit and a light in the dark. Run facing traffic where there is no pavement.",
      },
    ],
  },
  {
    id: "injury",
    title: "Staying injury-free",
    icon: "🩹",
    tips: [
      {
        title: "Build slowly",
        body: "Increase weekly running by no more than about 10%, and take a lighter week every month.",
      },
      {
        title: "Warm up, cool down",
        body: "Five minutes of brisk walking or gentle jogging before and after. Save long stretches for later in the day.",
      },
      {
        title: "Strength is injury insurance",
        body: "Twice a week: squats, lunges, glute bridges, calf raises and planks. 15 minutes is enough.",
      },
      {
        title: "Pain is a stop sign",
        body: "Soreness that eases as you warm up is normal. Sharp pain, or pain that changes how you run, means stop and rest. See a professional if it lasts more than a week.",
      },
    ],
  },
  {
    id: "fuel",
    title: "Food and water",
    icon: "🥤",
    tips: [
      {
        title: "Eat 1–3 hours before",
        body: "A light, carb-based snack such as toast, a banana or oats. Experiment on training days, never on race day.",
      },
      {
        title: "Drink to thirst",
        body: "For runs under an hour, water before and after is usually enough. In heat, carry some.",
      },
      {
        title: "Fuel long runs",
        body: "Over 75–90 minutes, take some carbohydrate every 30–45 minutes (gels, chews or a sports drink).",
      },
      {
        title: "Refuel within an hour",
        body: "Carbs plus protein after hard or long runs, for example yoghurt and fruit or a chicken sandwich.",
      },
    ],
  },
  {
    id: "recovery",
    title: "Rest and recovery",
    icon: "😴",
    tips: [
      {
        title: "Sleep is training",
        body: "7–9 hours is when your muscles repair. Short on sleep? Make the day's run easy.",
      },
      {
        title: "Easy days easy",
        body: "Recovery runs should feel slow. They help you absorb the hard days instead of adding to them.",
      },
      {
        title: "Listen to warning signs",
        body: "A high resting heart rate, heavy legs and a bad mood together mean take an extra rest day.",
      },
    ],
  },
  {
    id: "motivation",
    title: "Motivation",
    icon: "🔥",
    tips: [
      {
        title: "Schedule it",
        body: "Put runs in your calendar like meetings. Lay out your kit the night before.",
      },
      {
        title: "Sign up for an event",
        body: "A date on the calendar turns 'someday' into a plan. Free weekly community runs are a great first race.",
      },
      {
        title: "Run with others",
        body: "A friend or running club makes it social and much harder to skip.",
      },
      {
        title: "Celebrate small wins",
        body: "First non-stop mile, first 5K, first rainy run. Every one counts.",
      },
    ],
  },
];

export const LEVEL_LABEL: Record<RunnerLevel, string> = {
  novice: "Novice",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  pro: "Pro",
};

export const SESSION_LABEL: Record<RunSessionType, string> = {
  walk_run: "Walk-run",
  easy: "Easy run",
  long: "Long run",
  tempo: "Tempo run",
  intervals: "Intervals",
  hills: "Hill repeats",
  race: "Goal day",
};
