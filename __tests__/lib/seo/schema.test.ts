import { describe, it, expect } from "vitest";
import {
  buildFaqPageSchema,
  buildPianoTuningServiceSchema,
  buildLocalBusinessSchema,
  buildBreadcrumbSchema,
} from "@/lib/seo/schema";

describe("schema builders", () => {
  describe("buildFaqPageSchema", () => {
    it("creates FAQPage schema with questions and answers", () => {
      const faqs = [
        {
          question: "What is piano tuning?",
          answer: "Piano tuning is the process of adjusting string tension.",
        },
        {
          question: "How much does it cost?",
          answer: "It typically costs $100-$200.",
        },
      ];

      const schema = buildFaqPageSchema(faqs);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]).toEqual({
        "@type": "Question",
        name: "What is piano tuning?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Piano tuning is the process of adjusting string tension.",
        },
      });
    });

    it("handles empty FAQ array", () => {
      const schema = buildFaqPageSchema([]);
      expect(schema.mainEntity).toHaveLength(0);
    });
  });

  describe("buildPianoTuningServiceSchema", () => {
    it("creates Service schema with pricing", () => {
      const schema = buildPianoTuningServiceSchema({
        name: "Piano Tuning Service",
        description: "Professional piano tuning",
        priceLow: 100,
        priceHigh: 200,
        areaServed: "New York",
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("Service");
      expect(schema.name).toBe("Piano Tuning Service");
      expect(schema.priceRange).toBe("$100-$200");
      expect(schema.priceCurrency).toBe("USD");
      expect(schema.serviceType).toBe("Piano Tuning");
      expect(schema.areaServed).toBe("New York");
    });

    it("defaults currency to USD", () => {
      const schema = buildPianoTuningServiceSchema({
        name: "Test",
        description: "Test",
        priceLow: 50,
        priceHigh: 100,
      });

      expect(schema.priceCurrency).toBe("USD");
    });
  });

  describe("buildLocalBusinessSchema", () => {
    it("creates LocalBusiness schema with address", () => {
      const schema = buildLocalBusinessSchema({
        name: "Piano Tuning - Boston",
        description: "Piano tuning services in Boston",
        city: "Boston",
        state: "MA",
        priceLow: 130,
        priceHigh: 220,
      });

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("LocalBusiness");
      expect(schema.name).toBe("Piano Tuning - Boston");
      expect(schema.address).toEqual({
        "@type": "PostalAddress",
        addressLocality: "Boston",
        addressRegion: "MA",
        addressCountry: "US",
      });
      expect(schema.priceRange).toBe("$130-$220");
    });
  });

  describe("buildBreadcrumbSchema", () => {
    it("creates BreadcrumbList with navigation items", () => {
      const items = [
        { name: "Home", url: "/" },
        { name: "Piano Tuning Cost", url: "/piano-tuning-cost" },
        { name: "Boston", url: "/piano-tuning-cost/boston" },
      ];

      const schema = buildBreadcrumbSchema(items);

      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@type"]).toBe("BreadcrumbList");
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0]).toEqual({
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: expect.stringContaining("/"),
      });
    });

    it("handles absolute URLs", () => {
      const items = [
        { name: "External", url: "https://example.com/page" },
      ];

      const schema = buildBreadcrumbSchema(items);

      expect(schema.itemListElement[0].item).toBe(
        "https://example.com/page"
      );
    });
  });
});
