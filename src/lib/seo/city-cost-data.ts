/**
 * Data for programmatic city cost pages (/piano-tuning-cost/{city}).
 *
 * Price ranges are researched estimates until platform booking data exists:
 * national baseline $100–$200 for a standard tuning, scaled by metro cost
 * of living. Pitch raise adds $50–$100 on top. Keep every number honest —
 * these pages live or die on whether a skeptical tuner would nod along.
 */

export interface CityFaq {
  question: string;
  answer: string;
}

export interface CityCost {
  /** URL segment, e.g. "boston" */
  slug: string;
  name: string;
  state: string;
  /** Standard tuning, low end, USD */
  priceLow: number;
  /** Standard tuning, high end, USD */
  priceHigh: number;
  /** 2–3 honest, city-specific sentences (conservatories, climate, housing stock) */
  flavor: string[];
}

export const NATIONAL_LOW = 100;
export const NATIONAL_HIGH = 200;
export const PITCH_RAISE_LOW = 50;
export const PITCH_RAISE_HIGH = 100;

/** Priority order: launch metro first, then by rollout plan. */
export const CITY_COSTS: CityCost[] = [
  {
    slug: "boston",
    name: "Boston",
    state: "MA",
    priceLow: 130,
    priceHigh: 220,
    flavor: [
      "Boston has one of the densest concentrations of trained piano technicians in the country, thanks to New England Conservatory, Berklee, and the area's music schools — supply is good, but the best-reviewed tuners book out weeks ahead.",
      "New England's climate is hard on pianos: humid summers followed by bone-dry winters of forced-air and radiator heat swing soundboards enough that many local techs recommend tuning twice a year.",
      "Older housing stock in Cambridge, Somerville, and the Back Bay often means steam heat, which dries a piano out faster than modern HVAC.",
    ],
  },
  {
    slug: "new-york-city",
    name: "New York City",
    state: "NY",
    priceLow: 175,
    priceHigh: 275,
    flavor: [
      "NYC is the most expensive US metro for piano tuning — travel time, parking, and building access are real costs, and rates from established Manhattan techs reflect it.",
      "Steam-heated apartments are notorious piano killers: radiators can drop indoor humidity below 20% in January, so many city tuners push twice-yearly tunings and a humidity system.",
      "With Juilliard, Manhattan School of Music, and the concert scene, the city has deep technician talent — including concert-level tuners whose rates run well above this range.",
    ],
  },
  {
    slug: "newark-north-nj",
    name: "Newark & North Jersey",
    state: "NJ",
    priceLow: 140,
    priceHigh: 230,
    flavor: [
      "North Jersey sits in NYC's orbit: many technicians serve both sides of the Hudson, and rates run meaningfully below Manhattan while staying above the national average.",
      "The same Northeast humidity cycle applies here — muggy summers, dry heated winters — so pianos in older Newark, Montclair, and Jersey City homes drift out of tune seasonally.",
    ],
  },
  {
    slug: "houston",
    name: "Houston",
    state: "TX",
    priceLow: 100,
    priceHigh: 185,
    flavor: [
      "Houston tuning rates sit near the national baseline — the metro is spread out, so some techs add travel fees for far suburbs like Katy or The Woodlands.",
      "Gulf Coast humidity is the defining factor: pianos here fight constant moisture, and heavy air-conditioning cycles create their own wet/dry swings inside the home.",
      "Rice University's Shepherd School and Houston's church-music scene support a solid base of working technicians.",
    ],
  },
  {
    slug: "chicago",
    name: "Chicago",
    state: "IL",
    priceLow: 120,
    priceHigh: 210,
    flavor: [
      "Chicago winters are brutal on pianos: months of radiator or forced-air heat can drop indoor humidity to desert levels, then muggy summers swing it right back.",
      "That seasonal whiplash is why many Chicago techs recommend two tunings a year, or at least one timed after the heating season ends.",
      "A large teaching and performance scene — DePaul, Roosevelt's CCPA, the CSO — keeps a healthy pool of experienced tuners working in the metro.",
    ],
  },
  {
    slug: "seattle",
    name: "Seattle",
    state: "WA",
    priceLow: 135,
    priceHigh: 225,
    flavor: [
      "Seattle's mild, damp marine climate is actually gentler on pianos than most of the country — indoor humidity stays comparatively stable year-round.",
      "Rates still run above the national average because Seattle's cost of living pushes service pricing up across the board.",
      "Pianos near the water or in older, less-insulated Craftsman homes still see enough seasonal drift to need at least an annual tuning.",
    ],
  },
  {
    slug: "los-angeles",
    name: "Los Angeles",
    state: "CA",
    priceLow: 140,
    priceHigh: 240,
    flavor: [
      "LA pricing varies with geography as much as anything: coastal neighborhoods enjoy stable, piano-friendly humidity, while inland valleys are dry enough to crack soundboards over time.",
      "Traffic is a genuine cost input — techs quote with drive time in mind, and some charge more for far-flung parts of the metro.",
      "The studio, film-scoring, and conservatory scene (Colburn, UCLA, USC Thornton) supports some of the best concert technicians in the country.",
    ],
  },
  {
    slug: "philadelphia",
    name: "Philadelphia",
    state: "PA",
    priceLow: 115,
    priceHigh: 200,
    flavor: [
      "Philadelphia rates run slightly below other Northeast metros — a rare bit of good news for piano owners in the region.",
      "Rowhome radiator heat is the local hazard: small, steam-heated rooms dry out quickly in winter and push pianos flat by spring.",
      "The Curtis Institute and a deep church-organ-and-piano tradition mean the city has long supported serious keyboard technicians.",
    ],
  },
  {
    slug: "san-francisco",
    name: "San Francisco",
    state: "CA",
    priceLow: 160,
    priceHigh: 260,
    flavor: [
      "The Bay Area is second only to New York for tuning costs — technician time is priced like every other skilled service in the region.",
      "Microclimates matter: foggy, marine-stable San Francisco is kind to pianos, while the drier East Bay and South Bay see bigger seasonal swings.",
      "The SF Conservatory and an active classical scene keep top-tier technicians in the area, though the best book out well in advance.",
    ],
  },
  {
    slug: "washington-dc",
    name: "Washington, DC",
    state: "DC",
    priceLow: 140,
    priceHigh: 235,
    flavor: [
      "DC-area rates run comfortably above the national average, and most techs serve the whole metro — District, Maryland suburbs, and Northern Virginia.",
      "The climate swings hard: swampy, humid summers into dry heated winters, one of the tougher annual humidity cycles for a piano on the East Coast.",
      "Embassies, universities, and performance venues around town sustain a steady base of professional technicians.",
    ],
  },
  {
    slug: "atlanta",
    name: "Atlanta",
    state: "GA",
    priceLow: 105,
    priceHigh: 190,
    flavor: [
      "Atlanta tuning costs sit close to the national baseline, with travel fees more common for the far metro (the region is one of the most spread-out in the country).",
      "Humid subtropical summers keep pianos swollen and sharp; winter heating dries them back down — a big enough swing that annual tuning is the practical minimum.",
    ],
  },
  {
    slug: "denver",
    name: "Denver",
    state: "CO",
    priceLow: 115,
    priceHigh: 205,
    flavor: [
      "Denver's defining challenge is dryness: high-altitude air routinely sits below 30% humidity, which shrinks soundboards, loosens tuning pins, and can crack an unprotected piano over the years.",
      "Most Front Range techs will talk to you about humidification (room humidifiers or an in-piano system) before they talk about anything else — it's not an upsell, it's survival at this altitude.",
    ],
  },
];

export function getCityBySlug(slug: string): CityCost | undefined {
  return CITY_COSTS.find((c) => c.slug === slug);
}

export function formatRange(low: number, high: number): string {
  return `$${low}–$${high}`;
}

/**
 * FAQ entries per city. Built from the city's real numbers so the schema
 * markup and visible copy never disagree.
 */
export function buildCityFaqs(city: CityCost): CityFaq[] {
  const range = formatRange(city.priceLow, city.priceHigh);
  return [
    {
      question: `How much does piano tuning cost in ${city.name}?`,
      answer: `A standard tuning in the ${city.name} area typically runs ${range}. If your piano hasn't been tuned in a few years, expect a pitch raise first — an extra $${PITCH_RAISE_LOW}–$${PITCH_RAISE_HIGH} on top. Ask for the all-in price when you book so there's no surprise at the door.`,
    },
    {
      question: "Why is my quote higher than the advertised tuning price?",
      answer: `The most common reason is a pitch raise: when a piano has drifted well below standard pitch, the technician must pull every string roughly up to pitch first, then do the fine tuning — effectively two passes in one visit. That's real extra work, not padding, and it usually adds $${PITCH_RAISE_LOW}–$${PITCH_RAISE_HIGH}. Broken strings, sticky keys, or repairs discovered during the visit are quoted separately.`,
    },
    {
      question: `How often should I tune my piano in ${city.name}?`,
      answer: `Once a year is the practical minimum for a piano that gets played. New pianos (or pianos that just moved) need 2–4 tunings in the first year while the strings settle. ${city.flavor[1] ?? city.flavor[0]}`,
    },
    {
      question: "Is my old piano worth tuning?",
      answer:
        "Usually yes, if it holds pitch. A technician can tell you within the first few minutes of a visit whether the pinblock still holds tension — and a good one will say so honestly before charging you for a full tuning. If the piano has been silent for decades, budget for a pitch raise and possibly a follow-up tuning a few weeks later.",
    },
    {
      question: "How long does a piano tuning take?",
      answer:
        "A standard tuning takes about 1 to 1.5 hours. Add roughly 30–45 minutes if a pitch raise is needed. Plan for the technician to need a reasonably quiet room while they work.",
    },
  ];
}
