import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Calendar, Star, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-muted/50 to-background px-4 py-20 text-center sm:py-32">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find a Trusted Piano Tuner Near You
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Book expert piano technicians for tuning, repair, and maintenance.
              Transparent pricing, verified professionals, easy scheduling.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/search">
                <Button size="lg" className="w-full sm:w-auto">
                  <Search className="mr-2 h-5 w-5" />
                  Find a Tuner
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Join as a Technician
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold">How It Works</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Search",
                  description:
                    "Browse verified piano technicians in your area. Compare ratings, services, and pricing.",
                },
                {
                  icon: Calendar,
                  title: "Book",
                  description:
                    "Choose your services, pick a convenient time, and book online in minutes.",
                },
                {
                  icon: Star,
                  title: "Enjoy",
                  description:
                    "Get professional service at your door. Pay securely and leave a review.",
                },
              ].map((step, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Value Props for Technicians */}
        <section className="bg-muted/30 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold">
              For Piano Technicians
            </h2>
            <p className="mt-4 text-center text-muted-foreground">
              The all-in-one platform to run your piano service business
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Calendar,
                  title: "Easy Scheduling",
                  description: "Manage your calendar and let clients book online",
                },
                {
                  icon: Shield,
                  title: "Get Verified",
                  description: "Build trust with verified credentials and reviews",
                },
                {
                  icon: Star,
                  title: "Grow Your Business",
                  description: "Reach new customers searching for tuners nearby",
                },
                {
                  icon: Search,
                  title: "Manage Clients",
                  description: "Track customer records, piano details, and history",
                },
              ].map((feature, i) => (
                <div key={i} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-3 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/sign-up">
                <Button size="lg">Start Free Today</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
