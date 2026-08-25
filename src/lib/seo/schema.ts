/**
 * JSON-LD schema.org builders for SEO markup.
 * All schemas follow https://schema.org patterns and must remain honest:
 * no fabricated review counts, ratings, or pricing data outside the real numbers.
 */

import { siteUrl } from "@/lib/site";

/**
 * Build a schema.org FAQPage from questions and answers.
 */
export function buildFaqPageSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Build a schema.org Service for piano tuning.
 * Describes the service offering with realistic price ranges (no padding, no reviews).
 */
export function buildPianoTuningServiceSchema(options: {
  name: string;
  description: string;
  priceLow: number;
  priceHigh: number;
  currency?: string;
  areaServed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: options.name,
    description: options.description,
    serviceType: "Piano Tuning",
    areaServed: options.areaServed,
    priceRange: `$${options.priceLow}-$${options.priceHigh}`,
    priceCurrency: options.currency ?? "USD",
  };
}

/**
 * Build a schema.org LocalBusiness for piano technician services in a city.
 * Kept minimal: honest service presence without fabricated reviews or ratings.
 */
export function buildLocalBusinessSchema(options: {
  name: string;
  description: string;
  city: string;
  state: string;
  priceLow: number;
  priceHigh: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/piano-tuning-cost/${options.city.toLowerCase().replace(/\s+/g, "-")}`,
    name: options.name,
    description: options.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: options.city,
      addressRegion: options.state,
      addressCountry: "US",
    },
    serviceArea: {
      "@type": "Place",
      name: `${options.city}, ${options.state}`,
    },
    priceRange: `$${options.priceLow}-$${options.priceHigh}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: `$${options.priceLow}-$${options.priceHigh}`,
    },
  };
}

/**
 * Build a schema.org BreadcrumbList for navigation context.
 */
export function buildBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };
}
