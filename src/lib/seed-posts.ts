/**
 * Seed content for trigger-moment guides (Pillar 2 of content pipeline).
 * These are blog posts designed to capture customers at key moments:
 * - New piano purchases
 * - Moves and relocations
 * - Inherited/neglected pianos
 * - Student tuning questions
 */

export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  isHowTo: boolean;
}

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "new-piano-first-year-schedule",
    title: "You just bought a piano — here's the first-year tuning schedule",
    excerpt:
      "New pianos need 3–4 tunings in the first year as the strings settle. Here's the honest timeline and why it matters.",
    contentHtml: `<h2>Why new pianos need so many early tunings</h2>
<p>A brand-new piano has strings under massive tension, anchored to a freshly-glued soundboard. In the first weeks and months, the strings and wood are both still settling — strings are stretching, the soundboard is stabilizing under the load. Pitch drifts fast during this period, which is why a piano bought in January may be noticeably flat by April even if no one plays it hard.</p>

<h2>The realistic first-year schedule</h2>
<p>Most piano technicians recommend this rhythm:</p>
<ul>
<li><strong>First tuning:</strong> Within 1–2 weeks of delivery. Yes, before you've even played it much. The manufacturer pre-tunes at the factory, but shipping and setup changes tension.</li>
<li><strong>Second tuning:</strong> 4–6 weeks later. The piano is still settling fast.</li>
<li><strong>Third tuning:</strong> 3–4 months from now (roughly mid-year). Strings and soundboard have mostly stabilized, but not completely.</li>
<li><strong>Fourth tuning (optional but common):</strong> Around month 9–10. Catches any remaining drift before you get into fall/winter heating season.</li>
</ul>
<p>After that first year, if you keep playing regularly, shift to once or twice a year depending on your climate and how hard the piano gets used.</p>

<h2>Why not wait until it sounds "bad"?</h2>
<p>A piano owner's instinct is often to skip tunings while the instrument is new and "probably still in tune." But drift during the settling period is inevitable and fast. Waiting until you notice it means the piano is already significantly flat — which means a pitch raise when you finally call a technician, adding $50–$100 to the bill. Regular tunings during the first year are cheaper than one pitch-raise call later.</p>

<h2>Budget-conscious approach</h2>
<p>If budget is tight, <em>don't</em> skip the first two tunings — they're too close to delivery and the drift is fastest then. The third and fourth can stretch longer or be optional. But the first two are non-negotiable for a piano that will hold resale value and sound good.</p>`,
    category: "Buying Guides",
    tags: ["new piano", "tuning schedule", "first year"],
    seoTitle: "New Piano Tuning Schedule — First Year (3–4 Tunings)",
    seoDescription:
      "New pianos need 3–4 tunings in the first year as strings settle. Here's the honest timeline and why it matters for resale value.",
    isHowTo: true,
  },
  {
    slug: "piano-move-tuning-guide",
    title: "Just moved your piano? When (and whether) to tune after a move",
    excerpt:
      "Moving a piano shifts every string. Here's when to tune and what signs say your piano took damage.",
    contentHtml: `<h2>What moving does to a piano</h2>
<p>Moving a piano — whether across the room, to another floor, or across the country — is a controlled shock to the instrument. The soundboard experiences new vibrations, the tension on every string shifts slightly, and the pinblock (the wooden block holding the tuning pins) can move a fraction of an inch. Even a careful, professional move will detune the piano.</p>

<h2>The timeline for tuning after a move</h2>
<p><strong>Wait at least 2–4 weeks</strong> before tuning the piano after it arrives at its new location. Here's why:</p>
<ol>
<li>The piano is adjusting to a new room — different temperature, humidity, light exposure. The wood and strings need time to settle into the new environment.</li>
<li>If you tune immediately, the piano will drift again as the room's climate and the instrument's structure stabilize. You'll pay for a tuning twice.</li>
<li>After 2–4 weeks, the piano has largely stopped settling and tuning will hold better.</li>
</ol>
<p>If the piano travels a long distance or spends time in a truck, add another week to be safe — the move itself can introduce more drift than a local move.</p>

<h2>Signs your piano needs repair, not just tuning</h2>
<p>Most moves go fine, but rough handling or accidents can damage a piano beyond simple detuning. Call a technician immediately (don't wait) if you notice:</p>
<ul>
<li>Visible cracks in the soundboard or case</li>
<li>Broken or jammed keys</li>
<li>A pedal that doesn't work or feels wrong</li>
<li>Strings that look slack or obviously broken</li>
<li>A hinge or wood seam visibly separated</li>
</ul>
<p>These aren't "it's out of tune" problems — they're structural and need a technician's hands-on assessment, not a tuning.</p>

<h2>After the first tuning</h2>
<p>Once the piano is tuned and settled in its new home, if it's played regularly, shift to the standard schedule: once a year minimum, twice if the room's humidity swings a lot or the piano sees heavy use.</p>`,
    category: "Maintenance",
    tags: ["moving", "relocation", "tuning timing"],
    seoTitle: "Piano Move & Tuning Guide — When to Tune After Moving",
    seoDescription:
      "After moving a piano, wait 2–4 weeks to tune. Learn what signs mean repair, not just tuning.",
    isHowTo: true,
  },
  {
    slug: "inherited-piano-worth-tuning",
    title: "Is grandma's piano worth tuning? An honest inherited-piano guide",
    excerpt:
      "Inherited pianos are often silent for years. Here's how to tell if it's worth the investment.",
    contentHtml: `<h2>The emotional vs. practical question</h2>
<p>An inherited piano carries history — decades in someone's home, a symbol of their musical life, a gift across generations. The question "should I tune it?" is never just mechanical. But an honest answer requires both.</p>

<h2>First: can it hold pitch?</h2>
<p>The deal-breaker question. If a piano has been silent for many years and the pinblock (the wooden block that holds the tuning pins) has dried out, it might not grip the pins well enough to hold pitch. A technician can tell you within 5 minutes of a visit whether the pinblock still works — they'll try to tighten a few pins and feel the resistance.</p>
<p>If the pinblock is shot, the piano can't be reliably tuned and repair may cost more than the piano's value. That's the moment you know.</p>

<h2>What tuning actually costs</h2>
<p>For an inherited piano that's been neglected for years, budget for:</p>
<ul>
<li><strong>Standard tuning:</strong> $100–$250 depending on your area</li>
<li><strong>Pitch raise:</strong> +$50–$100 if it's very flat (likely, if it's been silent for 5+ years)</li>
<li><strong>Possible follow-up tuning:</strong> 3–4 weeks later, $100–$250 again, if the first tuning didn't hold</li>
</ul>
<p>So realistically, $250–$500 to get an old piano playable and stable.</p>

<h2>The worth-it checklist</h2>
<p>Consider tuning if:</p>
<ul>
<li>Someone in your household actually plays piano or wants to learn</li>
<li>The instrument is a known brand (Steinway, Baldwin, Mason &amp; Hamlin, etc.) with likely collector or resale value</li>
<li>It's in decent visual condition — no obvious cracking, intact legs, bench comes with it</li>
<li>You have room for it and it fits your home</li>
</ul>
<p>Skip tuning if:</p>
<ul>
<li>No one plays and you're storing it "just in case"</li>
<li>It's a cheap upright from a discount retailer, with no particular sentimental or material value</li>
<li>It has visible structural damage or takes up space you'd rather use for something else</li>
</ul>

<h2>Sentimental pianos are sometimes the best ones to tune</h2>
<p>If the piano belonged to someone you loved, tuning it can be a beautiful way to honor that — not as an investment, but as reconnecting with their music. The cost is real, but so is the meaning. There's no formula for that decision.</p>`,
    category: "Buying Guides",
    tags: ["inherited piano", "decision making", "neglected pianos"],
    seoTitle: "Inherited Piano Guide — Is It Worth Tuning?",
    seoDescription:
      "Inherited pianos often need tuning and repair. Here's the honest assessment: can it hold pitch, what does it cost, and is it worth it.",
    isHowTo: true,
  },
  {
    slug: "student-piano-tuning-frequency",
    title: "How often should a student's piano be tuned?",
    excerpt:
      "Student pianos take a beating. Here's the real frequency and why teachers recommend what they do.",
    contentHtml: `<h2>Student pianos drift faster</h2>
<p>A student piano — especially one played daily for an hour or more — takes more stress than a living-room showpiece. Keys are struck harder and more often, the action (the mechanical linkage from key to hammer) gets heavier use, and strings are under constant vibration. All of this accelerates drift.</p>

<h2>The teacher's recommendation: twice a year</h2>
<p>Most experienced piano teachers recommend <strong>tuning twice a year for a student piano</strong>, ideally timed around practice season changes:</p>
<ul>
<li><strong>Fall tuning:</strong> Before the intensive winter practice season and holiday performances</li>
<li><strong>Spring tuning:</strong> After months of daily playing and before summer's heat and humidity</li>
</ul>
<p>Once-yearly tunings for student pianos often leave the instrument visibly flat by spring, which is demotivating for a student trying to develop ear training and technique.</p>

<h2>Why it matters for students</h2>
<p>A piano out of tune by even a quarter-tone makes it harder for a student to:</p>
<ul>
<li>Hear intervals accurately — their ear training suffers</li>
<li>Play with other instruments (school orchestra, duets, ensembles)</li>
<li>Judge their own technique — a out-of-tune piano sounds "bad" no matter how well they're playing</li>
<li>Enjoy practicing — an instrument that sounds wrong is demoralizing</li>
</ul>
<p>The cost of two tunings a year is often less than the cost of a private lesson, and the payoff in the student's progress is real.</p>

<h2>Budget considerations</h2>
<p>If twice-yearly is impossible, <em>at minimum</em> tune before performances or competitions — the week before, not the day of. And at least once a year in spring or fall. Skipping the entire winter (the heaviest playing season) is the most damaging schedule.</p>

<h2>Professional/performance students</h2>
<p>If a student is serious — preparing for auditions, competitions, or college-level study — the piano may need tuning more than twice a year, and a technician who specializes in performance pianos is worth the investment.</p>`,
    category: "How-To",
    tags: ["student piano", "tuning frequency", "education"],
    seoTitle: "How Often to Tune a Student Piano? Twice a Year.",
    seoDescription:
      "Student pianos should be tuned twice yearly. Here's why teachers insist, and how to budget for it.",
    isHowTo: true,
  },
];
