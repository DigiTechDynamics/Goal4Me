/**
 * Money lessons: 5 tracks × 6 short lessons (about 3 minutes each), each
 * with a 3-question quiz and one small action. Written for every launch
 * market, so examples avoid country-specific products and tax rules.
 * General education only, never personal financial advice.
 *
 * Body format (rendered by the app): paragraphs separated by a blank line,
 * and bullet lists with lines starting "- ".
 */
export const LESSON_TRACKS = ["budgeting", "saving", "debt", "investing", "side_income"] as const;
export type LessonTrack = (typeof LESSON_TRACKS)[number];

export interface QuizQuestion {
  question: string;
  options: [string, string, string];
  /** Index of the correct option. */
  answer: 0 | 1 | 2;
}

export interface LessonSeed {
  slug: string;
  track: LessonTrack;
  title: string;
  body: string;
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion];
  action: string;
}

const L = (seed: LessonSeed): LessonSeed => seed;

export const LESSONS: readonly LessonSeed[] = [
  // ---------------------------------------------------------------- Budgeting
  L({
    slug: "where-your-money-goes",
    track: "budgeting",
    title: "Where does your money go?",
    body: `A budget is not a punishment. It is a plan that tells your money where to go, instead of wondering where it went.

The first step is simply to look. Most people underestimate small, frequent costs: airtime and data, transport, snacks and delivery fees.

- Write down every expense for one week, however small.
- Group them: needs (rent, food, transport), wants (eating out, entertainment) and savings.
- Compare the total with what you earn.

You can't change what you don't measure. One honest week of tracking is worth more than a perfect plan you never follow.`,
    quiz: [
      {
        question: "What is the main purpose of a budget?",
        options: [
          "To stop you spending anything",
          "To give every unit of income a job",
          "To impress your bank",
        ],
        answer: 1,
      },
      {
        question: "Which costs do people most often underestimate?",
        options: ["Rent", "Small, frequent purchases", "School fees"],
        answer: 1,
      },
      {
        question: "What is a good first step?",
        options: [
          "Track every expense for a week",
          "Cut all wants immediately",
          "Open a new credit card",
        ],
        answer: 0,
      },
    ],
    action: "Log every expense in Goal4Me for the next 7 days.",
  }),
  L({
    slug: "the-50-30-20-rule",
    track: "budgeting",
    title: "The 50/30/20 rule",
    body: `The 50/30/20 rule is a simple starting point for splitting your income after tax:

- 50% for needs: housing, groceries, transport, utilities and minimum debt payments.
- 30% for wants: eating out, entertainment, clothes beyond the basics.
- 20% for savings and paying off debt faster.

It is a guide, not a law. If rent alone takes half your income, start with what is realistic, for example 60/30/10, and move toward 20% savings over time.

Goal4Me sets up your budget categories with this split, and you can change any limit.`,
    quiz: [
      {
        question: "In the 50/30/20 rule, what gets 20%?",
        options: ["Wants", "Savings and extra debt payments", "Needs"],
        answer: 1,
      },
      {
        question: "Minimum debt payments belong to…",
        options: ["Needs", "Wants", "Savings"],
        answer: 0,
      },
      {
        question: "If your needs take 60% of income, you should…",
        options: [
          "Give up on budgeting",
          "Start with a realistic split and adjust over time",
          "Borrow to cover wants",
        ],
        answer: 1,
      },
    ],
    action: "Set up this month's budget in the Money tab.",
  }),
  L({
    slug: "needs-vs-wants",
    track: "budgeting",
    title: "Needs versus wants",
    body: `A need is something you must have to live and work: basic food, shelter, transport to work, essential utilities. A want makes life nicer but you could go without it.

Many purchases have a need part and a want part. You need a phone; you want the newest model. You need food; you want takeaway.

A useful test before buying: "What happens if I don't buy this?" If the honest answer is "nothing much", it is a want.

Wants are not bad. Planning for them in your 30% means you can enjoy them without guilt.`,
    quiz: [
      {
        question: "Which is a need?",
        options: ["A streaming subscription", "Transport to work", "A new pair of designer shoes"],
        answer: 1,
      },
      {
        question: "A good test for a purchase is…",
        options: ["Is it on sale?", "What happens if I don't buy it?", "Do my friends have one?"],
        answer: 1,
      },
      {
        question: "Wants should be…",
        options: ["Banned completely", "Planned for within your budget", "Paid for with loans"],
        answer: 1,
      },
    ],
    action: "Review last week's expenses and mark each one as a need or a want.",
  }),
  L({
    slug: "irregular-income",
    track: "budgeting",
    title: "Budgeting with irregular income",
    body: `If you earn from piece work, commission, a business or several side jobs, your income changes every month. You can still budget.

- Find your baseline: the lowest monthly income from the last 6 months.
- Budget your needs using the baseline only.
- When you earn more, use the extra in this order: emergency fund, debt, then wants.

In a good month, set some money aside to "pay yourself" in a slow month. This smooths your income so a bad month doesn't become a crisis.`,
    quiz: [
      {
        question: "With irregular income, budget your needs on…",
        options: ["Your best month", "Your lowest recent month", "Your average hope"],
        answer: 1,
      },
      {
        question: "Extra money in a good month should first go to…",
        options: ["Your emergency fund", "A holiday", "New furniture"],
        answer: 0,
      },
      {
        question: "Why set money aside in good months?",
        options: ["To pay yourself in slow months", "To lend to friends", "It's not useful"],
        answer: 0,
      },
    ],
    action: "Look at your last 6 months of income and note the lowest month.",
  }),
  L({
    slug: "the-monthly-money-date",
    track: "budgeting",
    title: "Your monthly money date",
    body: `Budgets fail when they are set once and forgotten. A short "money date" with yourself each month keeps you on track.

Spend 20 minutes on the first weekend of the month:

- Compare last month's spending with your limits.
- Find one category that went over and decide why.
- Set this month's budget and any big expenses coming up.
- Move money to your savings goals first.

Weekly check-ins of 2 minutes (a quick look at the Money tab) catch problems before the month is over.`,
    quiz: [
      {
        question: "How often should you review your full budget?",
        options: ["Once a year", "Monthly", "Only when you're broke"],
        answer: 1,
      },
      {
        question: "When a category goes over, you should…",
        options: ["Ignore it", "Understand why and adjust", "Delete the category"],
        answer: 1,
      },
      {
        question: "Savings should be moved…",
        options: ["At the start of the month", "With whatever is left at the end", "Never"],
        answer: 0,
      },
    ],
    action: "Put a 20-minute money date in your calendar for the 1st of next month.",
  }),
  L({
    slug: "family-and-black-tax",
    track: "budgeting",
    title: "Supporting family on a budget",
    body: `In many households, earners support parents, siblings or extended family. This is generous and important, and it also needs a plan.

- Give support its own budget category so it is visible.
- Agree on regular amounts where possible, rather than unplanned requests.
- Keep your own emergency fund. If you have no safety net, you can't help anyone in a crisis.

It is okay to say "not this month" when your budget can't stretch. Clear, kind limits protect both you and the people you love.`,
    quiz: [
      {
        question: "Why give family support its own category?",
        options: ["So it's visible and planned", "To avoid paying it", "Banks require it"],
        answer: 0,
      },
      {
        question: "Your own emergency fund…",
        options: [
          "Is selfish",
          "Lets you help others in a crisis",
          "Isn't needed if you support family",
        ],
        answer: 1,
      },
      {
        question: "Regular agreed amounts are better than…",
        options: ["Unplanned requests", "Saving", "Budgeting"],
        answer: 0,
      },
    ],
    action: "Add a 'Family support' category with a monthly limit.",
  }),

  // ------------------------------------------------------------------ Saving
  L({
    slug: "pay-yourself-first",
    track: "saving",
    title: "Pay yourself first",
    body: `Most people save whatever is left at the end of the month, which is usually nothing. Paying yourself first flips this around.

As soon as income arrives, move your savings amount to a separate account or wallet before spending on anything else. Then live on the rest.

- Start small: even 5% builds the habit.
- Automate it with a debit order or scheduled transfer if you can.
- Increase it by 1% every few months.

The habit matters more than the amount at the start.`,
    quiz: [
      {
        question: "'Pay yourself first' means…",
        options: ["Save before you spend", "Buy yourself a treat on payday", "Pay your boss back"],
        answer: 0,
      },
      {
        question: "A good starting savings rate if money is tight is…",
        options: ["0%", "Even 5% to build the habit", "50%"],
        answer: 1,
      },
      {
        question: "Why automate savings?",
        options: ["So you don't have to decide each month", "Banks charge less", "It's required"],
        answer: 0,
      },
    ],
    action: "Create a savings goal in Goal4Me and add your first contribution.",
  }),
  L({
    slug: "emergency-fund-basics",
    track: "saving",
    title: "Build an emergency fund",
    body: `An emergency fund is money set aside only for real surprises: job loss, a medical bill, an urgent repair. It stops one bad event from pushing you into expensive debt.

- First target: one month of essential expenses.
- Full target: three to six months.
- Keep it separate from daily spending, but easy to reach within a day or two.

A car service you knew was coming is not an emergency; plan for it in your budget. Rebuild the fund as soon as you use it.`,
    quiz: [
      {
        question: "A full emergency fund usually covers…",
        options: ["One week", "Three to six months of essentials", "Ten years"],
        answer: 1,
      },
      {
        question: "Which is a true emergency?",
        options: ["A planned holiday", "Losing your job", "A sale at your favourite shop"],
        answer: 1,
      },
      {
        question: "After using the fund you should…",
        options: ["Rebuild it", "Close it", "Borrow to replace it"],
        answer: 0,
      },
    ],
    action: "Mark a savings goal as your emergency fund.",
  }),
  L({
    slug: "savings-goals-that-stick",
    track: "saving",
    title: "Savings goals that stick",
    body: `"Save more" is a wish. "Save 1,200 for a laptop by December" is a goal.

Good goals are specific, have an amount and a date, and are broken into monthly steps. Goal4Me works out the monthly amount for you.

- Name the goal after what it buys, so it feels real.
- Keep big goals in a separate place from your spending money.
- Celebrate milestones: 25%, 50%, 75%.

If a goal keeps slipping, move the date rather than giving up.`,
    quiz: [
      {
        question: "Which is a well-defined goal?",
        options: ["Save more", "Save 1,200 for a laptop by December", "Be rich"],
        answer: 1,
      },
      {
        question: "Breaking a goal into monthly amounts helps because…",
        options: [
          "It shows exactly what to do each month",
          "It makes the goal bigger",
          "It isn't helpful",
        ],
        answer: 0,
      },
      {
        question: "If a goal keeps slipping you should…",
        options: ["Give up", "Adjust the date and keep going", "Borrow the money"],
        answer: 1,
      },
    ],
    action: "Give one of your savings goals a target date.",
  }),
  L({
    slug: "savings-clubs",
    track: "saving",
    title: "Savings clubs and group saving",
    body: `Group savings clubs (rounds, stokvels, chilimba and similar) are a powerful tradition: members contribute regularly and take turns receiving the pot, or share it at year end.

They work because of commitment and trust. Protect yourself:

- Join groups with written rules and records of every payment.
- Know what happens if someone stops paying.
- Prefer groups that keep money in a bank or mobile account rather than cash with one person.

A club is great for discipline. Keep your emergency fund separate, because you can't always get club money when you need it.`,
    quiz: [
      {
        question: "Savings clubs work mainly because of…",
        options: ["High interest rates", "Commitment and trust", "Government guarantees"],
        answer: 1,
      },
      {
        question: "A safer club…",
        options: ["Has written rules and records", "Keeps cash with one member", "Has no rules"],
        answer: 0,
      },
      {
        question: "Should club money be your emergency fund?",
        options: [
          "Yes, always",
          "No, keep emergency money separately accessible",
          "Only in December",
        ],
        answer: 1,
      },
    ],
    action: "If you're in a savings club, add your contributions as a savings goal.",
  }),
  L({
    slug: "inflation-and-your-savings",
    track: "saving",
    title: "Inflation and your savings",
    body: `Inflation means prices rise over time, so the same money buys less. If prices rise 10% a year and your savings earn nothing, you lose about a tenth of their buying power each year.

- Compare the interest you earn with the inflation rate.
- Money for the next few months can sit somewhere safe and easy to reach.
- Money for many years needs to grow faster than inflation, which usually means investing (see the Investing track).

In high-inflation economies, many people hold savings in a more stable currency. Understand any fees and rules before doing so.`,
    quiz: [
      {
        question: "Inflation means…",
        options: [
          "Prices rise and money buys less",
          "Your salary doubles",
          "Interest rates fall to zero",
        ],
        answer: 0,
      },
      {
        question: "If savings earn less than inflation…",
        options: ["They lose buying power", "They gain buying power", "Nothing changes"],
        answer: 0,
      },
      {
        question: "Money needed in a few months should be…",
        options: ["Somewhere safe and easy to reach", "In risky investments", "Spent immediately"],
        answer: 0,
      },
    ],
    action: "Find the interest rate on your savings and compare it with inflation in your country.",
  }),
  L({
    slug: "small-savings-big-results",
    track: "saving",
    title: "Small savings, big results",
    body: `Small daily costs add up. A drink bought every workday is roughly 250 purchases a year.

You don't have to cut everything. Pick one or two habits and redirect that money to a goal:

- Cook one more meal at home each week.
- Review subscriptions and cancel the ones you don't use.
- Compare data and airtime bundles; buying bigger bundles is often cheaper per unit.

Move the money you saved to your goal the same day, otherwise it quietly gets spent elsewhere.`,
    quiz: [
      {
        question: "A daily habit on workdays happens about…",
        options: ["25 times a year", "250 times a year", "2,500 times a year"],
        answer: 1,
      },
      {
        question: "Bigger data bundles are often…",
        options: ["Cheaper per unit", "Always a waste", "Illegal"],
        answer: 0,
      },
      {
        question: "When you save on a habit, you should…",
        options: [
          "Move that money to a goal the same day",
          "Spend it on something else",
          "Keep it in your wallet",
        ],
        answer: 0,
      },
    ],
    action: "Pick one habit to change this week and log the savings as a contribution.",
  }),

  // -------------------------------------------------------------------- Debt
  L({
    slug: "good-debt-bad-debt",
    track: "debt",
    title: "Good debt and bad debt",
    body: `Debt is a tool. Borrowing for something that grows in value or raises your income (education, a business asset) can make sense. Borrowing to pay for things that lose value or are used up (clothes, nights out) usually doesn't.

The real cost of debt is the interest and fees. Always ask:

- What is the total I will repay, not just the monthly amount?
- What is the interest rate per year?
- What happens if I miss a payment?

A small monthly payment over a long time can cost far more than the item itself.`,
    quiz: [
      {
        question: "Borrowing usually makes the most sense for…",
        options: ["Things that raise income or value", "Nights out", "Daily groceries"],
        answer: 0,
      },
      {
        question: "The most important number to compare loans is…",
        options: [
          "The monthly payment",
          "The total cost including interest and fees",
          "The colour of the card",
        ],
        answer: 1,
      },
      {
        question: "A long loan with small payments…",
        options: ["Is always cheapest", "Can cost much more in total", "Has no interest"],
        answer: 1,
      },
    ],
    action: "List every debt you have with its balance and interest rate.",
  }),
  L({
    slug: "know-your-interest",
    track: "debt",
    title: "Understand interest rates",
    body: `Interest is the price of borrowing. A 30% annual rate on 1,000 costs about 300 a year if you don't pay it down.

Watch out for:

- Rates quoted per month: 5% a month is about 80% a year once it compounds.
- Fees added at the start (initiation, admin) that make the real cost much higher.
- "Buy now, pay later" offers that become very expensive if you miss a payment.

Lenders must tell you the total cost of credit. Ask for it in writing before you sign.`,
    quiz: [
      {
        question: "5% interest per month is roughly…",
        options: ["5% a year", "About 80% a year", "60% a month"],
        answer: 1,
      },
      {
        question: "Fees added at the start of a loan…",
        options: ["Increase the real cost", "Don't matter", "Reduce interest"],
        answer: 0,
      },
      {
        question: "Before signing a loan you should…",
        options: [
          "Ask for the total cost in writing",
          "Sign quickly before the offer ends",
          "Only check the monthly payment",
        ],
        answer: 0,
      },
    ],
    action: "Find the yearly interest rate for each debt on your list.",
  }),
  L({
    slug: "avalanche-or-snowball",
    track: "debt",
    title: "Avalanche or snowball?",
    body: `With several debts, pay the minimum on all of them and put any extra toward one at a time.

- Avalanche: extra money goes to the highest interest rate first. This saves the most money.
- Snowball: extra money goes to the smallest balance first. Quick wins keep you motivated.

Both work far better than spreading extra money thinly. Pick the one you will stick with. When one debt is paid off, roll its payment into the next one.`,
    quiz: [
      {
        question: "The avalanche method targets…",
        options: ["The highest interest rate first", "The smallest balance first", "A random debt"],
        answer: 0,
      },
      {
        question: "The snowball method's main benefit is…",
        options: ["Quick wins for motivation", "Lowest total interest", "No minimum payments"],
        answer: 0,
      },
      {
        question: "When a debt is paid off you should…",
        options: ["Roll its payment into the next debt", "Take a new loan", "Stop budgeting"],
        answer: 0,
      },
    ],
    action: "Choose avalanche or snowball and write down which debt you'll attack first.",
  }),
  L({
    slug: "avoid-the-debt-trap",
    track: "debt",
    title: "Avoid the debt trap",
    body: `A debt trap starts when you borrow to repay another debt, or borrow every month to reach payday. The interest grows faster than you can pay.

Warning signs:

- You only ever pay the minimum.
- You use credit for groceries or rent.
- You've borrowed from a new lender to pay an old one.

If this sounds familiar, stop taking new credit, talk to your lenders early (many will agree to a payment plan) and look for a registered debt counsellor or free advice service in your country.`,
    quiz: [
      {
        question: "Which is a debt-trap warning sign?",
        options: [
          "Borrowing to repay another debt",
          "Paying debts off early",
          "Having an emergency fund",
        ],
        answer: 0,
      },
      {
        question: "If you're struggling, talking to lenders early…",
        options: ["Can lead to a payment plan", "Is pointless", "Makes things worse"],
        answer: 0,
      },
      {
        question: "Using credit for groceries regularly means…",
        options: ["Your budget needs attention", "You're doing well", "Nothing at all"],
        answer: 0,
      },
    ],
    action: "Check whether any of the warning signs apply to you, honestly.",
  }),
  L({
    slug: "credit-scores",
    track: "debt",
    title: "Your credit record",
    body: `Credit bureaus keep a record of how you repay debt. Lenders, landlords and sometimes employers check it.

A good record helps you borrow at lower rates when you really need to. It improves when you:

- Pay every account on time, even if only the minimum.
- Keep credit card balances well below their limits.
- Avoid applying for lots of credit in a short time.

In many countries you can check your credit report for free at least once a year. Check it for mistakes and dispute anything wrong.`,
    quiz: [
      {
        question: "What improves your credit record most?",
        options: ["Paying on time", "Applying for many cards", "Maxing out limits"],
        answer: 0,
      },
      {
        question: "Many applications in a short time…",
        options: ["Can hurt your record", "Help your record", "Have no effect"],
        answer: 0,
      },
      {
        question: "If your report has a mistake you should…",
        options: ["Dispute it", "Ignore it", "Take a new loan"],
        answer: 0,
      },
    ],
    action: "Find out how to get your free credit report in your country.",
  }),
  L({
    slug: "mobile-loans",
    track: "debt",
    title: "Mobile and instant loans",
    body: `Instant loans on your phone are fast and convenient, and that is exactly why they can be dangerous. Fees of 5–15% for a few weeks add up to very high yearly rates.

Before borrowing:

- Work out the total you'll repay and the date.
- Ask whether this is a true emergency or something that can wait.
- Never take a second instant loan to repay the first.

Late repayments are often reported to credit bureaus and can block you from cheaper credit later.`,
    quiz: [
      {
        question: "A 10% fee for a 30-day loan is…",
        options: ["Cheap", "A very high yearly cost", "Free money"],
        answer: 1,
      },
      {
        question: "Taking a second instant loan to repay the first is…",
        options: ["A smart strategy", "A sign of a debt trap", "Recommended"],
        answer: 1,
      },
      {
        question: "Late repayments on mobile loans…",
        options: ["Can harm your credit record", "Never matter", "Improve your credit"],
        answer: 0,
      },
    ],
    action: "Delete instant-loan apps you don't need from your phone.",
  }),

  // --------------------------------------------------------------- Investing
  L({
    slug: "why-invest",
    track: "investing",
    title: "Why invest at all?",
    body: `Saving keeps money safe; investing helps it grow faster than inflation over many years. It also comes with risk: values go up and down.

Invest only after you have:

- An emergency fund.
- No expensive debt (paying off a 30% loan is a guaranteed 30% "return").

Money you need within the next few years should not be invested in shares. Investing works best with time, patience and regular contributions.`,
    quiz: [
      {
        question: "The main reason to invest is…",
        options: [
          "Growth above inflation over many years",
          "Guaranteed quick profits",
          "To avoid budgeting",
        ],
        answer: 0,
      },
      {
        question: "Before investing you should have…",
        options: ["An emergency fund", "A new car", "Several loans"],
        answer: 0,
      },
      {
        question: "Paying off a 30% loan is like…",
        options: ["A guaranteed 30% return", "Losing money", "Nothing"],
        answer: 0,
      },
    ],
    action: "Check you have an emergency fund goal before you start investing.",
  }),
  L({
    slug: "compound-growth",
    track: "investing",
    title: "The power of compound growth",
    body: `Compounding means your returns earn returns. 1,000 growing 8% a year becomes about 2,160 after 10 years and about 4,660 after 20, without adding anything.

Time matters more than amount. Someone who starts at 25 with small amounts can end up with more than someone who starts at 40 with bigger amounts.

- Start early, even with small amounts.
- Contribute regularly.
- Leave the money alone to grow.`,
    quiz: [
      {
        question: "Compounding means…",
        options: ["Your returns earn returns", "Fees go down", "Prices fall"],
        answer: 0,
      },
      {
        question: "What matters most for compounding?",
        options: ["Time", "Luck", "Checking prices daily"],
        answer: 0,
      },
      {
        question: "To benefit from compounding you should…",
        options: [
          "Start early and leave it to grow",
          "Withdraw every month",
          "Wait until you're rich",
        ],
        answer: 0,
      },
    ],
    action: "Work out what your savings could grow to in 10 years at 8% a year.",
  }),
  L({
    slug: "risk-and-diversification",
    track: "investing",
    title: "Risk and diversification",
    body: `Higher potential returns come with higher risk. Shares can grow a lot over time but can also fall sharply in a single year.

Diversification means not putting all your eggs in one basket: spreading money across many companies, industries and countries.

- One company can fail; a whole market rarely disappears.
- Index funds and exchange-traded funds (ETFs) give you many companies in one product.
- Be very careful of anyone promising high returns with "no risk". That does not exist.`,
    quiz: [
      {
        question: "Higher potential returns usually mean…",
        options: ["Higher risk", "No risk", "Lower fees"],
        answer: 0,
      },
      {
        question: "Diversification means…",
        options: [
          "Spreading money across many investments",
          "Buying one hot stock",
          "Keeping cash under the bed",
        ],
        answer: 0,
      },
      {
        question: "A promise of high returns with no risk is…",
        options: ["A warning sign", "A great deal", "Normal"],
        answer: 0,
      },
    ],
    action: "Write down how you would feel if an investment fell 20% in a year.",
  }),
  L({
    slug: "index-funds",
    track: "investing",
    title: "Index funds and ETFs",
    body: `An index fund buys every company in a market index (for example the largest companies on a stock exchange). An ETF is a similar fund that trades on an exchange like a share.

Why many beginners start here:

- Instant diversification.
- Low fees compared with actively managed funds.
- No need to pick winning companies.

Fees matter enormously over decades: a 2% yearly fee can take a large share of your final balance compared with a 0.3% fee. Always check the total annual cost.`,
    quiz: [
      {
        question: "An index fund…",
        options: ["Buys all companies in an index", "Picks one company", "Guarantees profits"],
        answer: 0,
      },
      {
        question: "A key advantage of index funds is…",
        options: ["Low fees and diversification", "No risk at all", "Daily guaranteed growth"],
        answer: 0,
      },
      {
        question: "Over decades, fees…",
        options: ["Make a big difference", "Don't matter", "Always fall to zero"],
        answer: 0,
      },
    ],
    action: "Look up the annual fee of any fund or retirement product you already have.",
  }),
  L({
    slug: "spotting-scams",
    track: "investing",
    title: "Spotting investment scams",
    body: `Scams target people who want to get ahead. Common signs:

- Guaranteed high returns, especially "double your money".
- Pressure to invest quickly or recruit friends.
- Payments to personal accounts or in crypto only.
- The company isn't registered with your country's financial regulator.

Check every investment company with your financial regulator before sending money. If it sounds too good to be true, it is. Never share PINs or one-time codes with anyone.`,
    quiz: [
      {
        question: "Which is a scam warning sign?",
        options: [
          "Guaranteed returns of double your money",
          "A regulated company",
          "Clear written fees",
        ],
        answer: 0,
      },
      {
        question: "Before investing with a company you should…",
        options: [
          "Check it with your financial regulator",
          "Trust a friend's tip",
          "Pay quickly to secure a spot",
        ],
        answer: 0,
      },
      {
        question: "Should you share a one-time PIN with an advisor?",
        options: ["Never", "Only if they ask nicely", "Yes, it's normal"],
        answer: 0,
      },
    ],
    action: "Find your country's financial regulator website and bookmark it.",
  }),
  L({
    slug: "retirement-basics",
    track: "investing",
    title: "Retirement basics",
    body: `Retirement can feel far away, which is exactly why starting early is so powerful.

- If your employer offers a pension or provident fund, find out how much you and they contribute.
- Some countries give tax benefits for retirement savings. Ask a registered advisor or your employer how it works where you live.
- Avoid cashing out retirement savings when changing jobs; you lose years of compound growth and may pay tax.

A common rule of thumb is to save 10–15% of income for retirement over your working life.`,
    quiz: [
      {
        question: "Why start retirement saving early?",
        options: [
          "More time for compound growth",
          "It's required by law everywhere",
          "Returns are guaranteed",
        ],
        answer: 0,
      },
      {
        question: "Cashing out retirement savings when changing jobs…",
        options: ["Loses growth and may cost tax", "Is always smart", "Has no downside"],
        answer: 0,
      },
      {
        question: "A common retirement savings rule of thumb is…",
        options: ["10–15% of income", "1% of income", "Nothing until 50"],
        answer: 0,
      },
    ],
    action: "Find out whether you have a pension or provident fund and its balance.",
  }),

  // ------------------------------------------------------------- Side income
  L({
    slug: "start-with-your-skills",
    track: "side_income",
    title: "Start with your skills",
    body: `A side income doesn't need a big idea. It starts with what you already know or can do.

- List your skills: languages, maths, design, cooking, repairs, driving, admin.
- Ask: who needs this and would pay for it?
- Start small: one paying customer proves the idea.

Services (tutoring, repairs, design) need little money to start. Products need stock and carry more risk. Begin with a service if cash is tight.`,
    quiz: [
      {
        question: "A side income should start with…",
        options: ["Your existing skills", "A big loan", "Expensive equipment"],
        answer: 0,
      },
      {
        question: "What proves a side-income idea?",
        options: ["One paying customer", "A nice logo", "A business card"],
        answer: 0,
      },
      {
        question: "Services are often easier to start because…",
        options: ["They need little money", "They're always more profitable", "No one competes"],
        answer: 0,
      },
    ],
    action: "Write down three skills someone might pay you for.",
  }),
  L({
    slug: "pricing-your-work",
    track: "side_income",
    title: "Pricing your work",
    body: `Many people starting out charge too little and burn out. Price from your costs, not your nerves.

- Add up your costs: materials, transport, data, fees.
- Decide what an hour of your time is worth.
- Check what others charge for similar work.

Price = costs + your time + a margin. It's easier to offer a discount than to raise prices later. Ask for a deposit on bigger jobs.`,
    quiz: [
      {
        question: "A good price covers…",
        options: ["Costs, your time and a margin", "Only materials", "Whatever feels safe"],
        answer: 0,
      },
      {
        question: "On bigger jobs you should…",
        options: ["Ask for a deposit", "Work for free first", "Never invoice"],
        answer: 0,
      },
      {
        question: "Is it easier to discount or raise prices later?",
        options: ["Discount", "Raise", "Neither"],
        answer: 0,
      },
    ],
    action: "Work out an hourly price for one skill using costs + time + margin.",
  }),
  L({
    slug: "separate-business-money",
    track: "side_income",
    title: "Keep business money separate",
    body: `Mixing personal and business money makes it impossible to know whether your side hustle is actually profitable.

- Use a separate account or mobile wallet for business income and costs.
- Record every sale and every expense.
- Pay yourself a set amount, rather than dipping in whenever you need cash.

At the end of each month, profit = income − costs. If you're not sure you're making a profit, you probably aren't measuring it.`,
    quiz: [
      {
        question: "Why separate business and personal money?",
        options: ["To know if you're profitable", "Banks require it", "It hides income"],
        answer: 0,
      },
      {
        question: "Profit equals…",
        options: ["Income minus costs", "Income only", "Costs minus income"],
        answer: 0,
      },
      {
        question: "You should pay yourself…",
        options: ["A set amount", "Whenever you need cash", "Never"],
        answer: 0,
      },
    ],
    action: "Add a 'Side income costs' category to track business expenses.",
  }),
  L({
    slug: "find-customers",
    track: "side_income",
    title: "Finding your first customers",
    body: `Your first customers are usually people who already know you.

- Tell friends, family and colleagues what you offer, clearly and with a price.
- Use WhatsApp status, community groups and local social media pages.
- Ask every happy customer for a review or a referral.

Show your work: before-and-after photos, examples and short testimonials build trust faster than any advert.`,
    quiz: [
      {
        question: "First customers often come from…",
        options: [
          "People who already know you",
          "Expensive adverts",
          "Cold calling strangers only",
        ],
        answer: 0,
      },
      {
        question: "What builds trust quickly?",
        options: ["Examples of your work and reviews", "A long business plan", "A high price"],
        answer: 0,
      },
      {
        question: "After a happy customer you should…",
        options: ["Ask for a referral", "Raise their price", "Never contact them again"],
        answer: 0,
      },
    ],
    action: "Tell three people about your service this week, with a price.",
  }),
  L({
    slug: "tax-and-records",
    track: "side_income",
    title: "Tax and simple records",
    body: `Side income is usually taxable once it passes a certain level. The rules differ by country, so check with your tax authority or a registered tax practitioner.

Simple habits that save stress later:

- Keep receipts for business costs (a photo is fine).
- Record income on the day you receive it.
- Set aside a percentage of side income for tax in a separate goal.

Good records also help when you apply for a loan or a lease, because they prove your income.`,
    quiz: [
      {
        question: "Side income is…",
        options: ["Often taxable above a threshold", "Never taxable", "Always tax-free"],
        answer: 0,
      },
      {
        question: "Keeping receipts helps because…",
        options: ["They prove business costs", "They're decorative", "They're not useful"],
        answer: 0,
      },
      {
        question: "A smart habit is to…",
        options: ["Set aside a percentage for tax", "Spend everything", "Hide income"],
        answer: 0,
      },
    ],
    action: "Create a savings goal called 'Tax' for part of your side income.",
  }),
  L({
    slug: "grow-or-stay-small",
    track: "side_income",
    title: "Grow or stay small?",
    body: `Not every side hustle needs to become a business. Decide what you want from it: extra cash, a safety net, or a future full-time income.

Before growing:

- Is it consistently profitable for at least six months?
- Can you deliver more without hurting quality or your health?
- Do you have savings to cover a slow month?

Growing too fast is a common reason small businesses fail. Steady, profitable growth beats a big leap.`,
    quiz: [
      {
        question: "Before growing a side hustle, check that it is…",
        options: ["Consistently profitable", "Popular on social media", "Expensive"],
        answer: 0,
      },
      {
        question: "A common reason small businesses fail is…",
        options: ["Growing too fast", "Having savings", "Keeping records"],
        answer: 0,
      },
      {
        question: "Must every side hustle become a full business?",
        options: ["No, it depends on your goals", "Yes, always", "Only in December"],
        answer: 0,
      },
    ],
    action: "Write one sentence about what you want your side income to do for you.",
  }),
];
