import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, AlertTriangle, MessageCircle, CreditCard } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SITE } from "@/config/site";

const faqs = [
  {
    group: "Booking",
    items: [
      {
        q: "How do I book a hustler?",
        a: "Find a service on Home or Browse, tap “Book now”, choose a date and time, add any notes, then pay securely. The hustler confirms the request and you can chat with them from Messages.",
      },
      {
        q: "Can I cancel a booking?",
        a: "Yes. Pending bookings can be cancelled from My bookings. If a hustler has already accepted, message them first so they can plan around it.",
      },
      {
        q: "What happens after the job?",
        a: "Once the hustler marks the job complete, you can leave a star rating and review. Reviews help the community and reward great hustlers.",
      },
    ],
  },
  {
    group: "Payments",
    items: [
      {
        q: "How do payments work?",
        a: "Payments are processed by Stripe, in South African Rand. Hustle never stores your card details.",
      },
      {
        q: "Can I tip my hustler?",
        a: "Yes — add a tip at checkout. 100% of tips go to the hustler.",
      },
      {
        q: "What does Hustle charge?",
        a: `Customers pay the listed price. Hustle keeps a ${SITE.platformFeePercent}% platform fee from the service price to keep the lights on, verify hustlers and process payments.`,
      },
    ],
  },
  {
    group: "Hustlers",
    items: [
      {
        q: "How do I become a hustler?",
        a: "Create an account, tap “Become a Hustler” and submit your SA ID number, a police affidavit and a criminal record clearance. Our team reviews every application before you go live.",
      },
      {
        q: "How long does approval take?",
        a: "Most applications are reviewed within 2–3 business days. You can check the status any time from your profile.",
      },
      {
        q: "How do I get paid?",
        a: `You earn ${100 - SITE.platformFeePercent}% of each service price plus all tips. Track everything in the Earnings tab of your dashboard.`,
      },
    ],
  },
];

const safety = [
  { icon: ShieldCheck, text: "Every hustler submits ID and police clearance before approval." },
  { icon: CreditCard, text: "Always pay through Hustle — never in cash or by EFT outside the app." },
  { icon: MessageCircle, text: "Keep conversations in Hustle Messages so there's a record if something goes wrong." },
  { icon: AlertTriangle, text: "In an emergency, call 10111 (SAPS) or 112 from a mobile phone first, then let us know." },
];

const Help = () => {
  const { hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <Layout width="medium">
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-10">
        <PageHeader title="Help & FAQ" subtitle="Answers to the most common questions" />

        {faqs.map((g) => (
          <section key={g.group} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</h2>
            <Accordion type="single" collapsible className="rounded-2xl border border-border px-4">
              {g.items.map((f, i) => (
                <AccordionItem key={f.q} value={`${g.group}-${i}`} className={i === g.items.length - 1 ? "border-b-0" : ""}>
                  <AccordionTrigger className="text-left font-medium hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <section id="safety" className="space-y-3 scroll-mt-24">
          <h2 className="text-xl font-bold">Staying safe</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {safety.map((s) => (
              <div key={s.text} className="flex gap-3 p-4 rounded-2xl bg-secondary">
                <s.icon className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-foreground text-background p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold">Still need help?</h2>
            <p className="opacity-75 text-sm mt-1">Our team usually replies within one business day.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" className="rounded-full">
              <a href={`mailto:${SITE.supportEmail}`}>
                <Mail className="w-4 h-4 mr-2" /> Email support
              </a>
            </Button>
            <Button variant="outline" className="rounded-full bg-transparent text-background border-background/30 hover:bg-background/10 hover:text-background" onClick={() => navigate("/browse")}>
              Browse
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Help;
