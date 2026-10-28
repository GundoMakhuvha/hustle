// Hustle notifications, sent by Taylor (taylor@capvtal.com).
//
// Called by database triggers (see supabase/hustle_database.sql) whenever
// something happens that a user should hear about. Sends email through Resend.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        API key from resend.com (domain capvtal.com verified)
//   NOTIFY_WEBHOOK_SECRET Any long random string; the same value goes in app_config
// Optional:
//   EMAIL_FROM            Defaults to "Taylor from Hustle <taylor@capvtal.com>"
//   EMAIL_REPLY_TO        Defaults to taylor@capvtal.com
//   SITE_URL              Defaults to https://hustle.capvtal.com
//   TAYLOR_WEBHOOK_URL    If set, every event is also forwarded to Taylor's own API
//   TAYLOR_WEBHOOK_SECRET Sent to Taylor as the x-taylor-secret header
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

type Row = Record<string, any>;
interface EventPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Row | null;
  old_record: Row | null;
}

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://hustle.capvtal.com";
const FROM = Deno.env.get("EMAIL_FROM") ?? "Taylor from Hustle <taylor@capvtal.com>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "taylor@capvtal.com";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

// ---------- helpers ----------------------------------------------------------

interface Person {
  id: string;
  email: string | null;
  name: string;
  wantsEmail: boolean;
}

async function getPerson(userId: string | null | undefined): Promise<Person | null> {
  if (!userId) return null;
  const { data } = await db
    .from("profiles")
    .select("id, email, full_name, email_notifications")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    name: (data.full_name || "there").split(" ")[0],
    wantsEmail: data.email_notifications !== false,
  };
}

async function getHustlerPerson(hustlerProfileId: string): Promise<Person | null> {
  const { data } = await db.from("hustler_profiles").select("user_id").eq("id", hustlerProfileId).maybeSingle();
  return getPerson(data?.user_id);
}

async function getService(serviceId: string) {
  const { data } = await db.from("services").select("title").eq("id", serviceId).maybeSingle();
  return data?.title ?? "your service";
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const zar = (n: unknown) => `R ${Number(n ?? 0).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}`;

function when(date: string, time: string) {
  const d = new Date(`${date}T${time}`);
  const day = d.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  const t = d.toLocaleTimeString("en-ZA", { hour: "numeric", minute: "2-digit" });
  return `${day} at ${t}`;
}

interface Email {
  to: Person | null;
  subject: string;
  heading: string;
  lines: string[];
  details?: [string, string][];
  cta?: { label: string; path: string };
  /** Transactional emails that must go out even if the user muted updates. */
  essential?: boolean;
}

function render(e: Email) {
  const details = e.details?.length
    ? `<table role="presentation" width="100%" style="margin:20px 0;border-collapse:collapse;background:#f5f5f5;border-radius:12px">
        ${e.details
          .map(
            ([k, v]) =>
              `<tr><td style="padding:10px 16px;color:#737373;font-size:14px">${esc(k)}</td><td style="padding:10px 16px;font-size:14px;font-weight:600;text-align:right">${esc(v)}</td></tr>`,
          )
          .join("")}
      </table>`
    : "";
  const cta = e.cta
    ? `<p style="margin:28px 0"><a href="${SITE_URL}${e.cta.path}" style="background:#141414;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:14px;display:inline-block">${esc(e.cta.label)}</a></p>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#141414">
  <table role="presentation" width="100%" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #ebebeb;border-radius:16px;padding:32px">
      <tr><td>
        <p style="margin:0 0 24px;font-weight:800;font-size:20px;letter-spacing:-0.5px">Hustle</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${esc(e.heading)}</h1>
        ${e.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#404040">${esc(l)}</p>`).join("")}
        ${details}
        ${cta}
        <p style="margin:24px 0 0;font-size:15px;color:#404040"><strong>Taylor</strong><br><span style="color:#737373;font-size:13px">Chief Information Officer (CIO)<br>Capvtal Innovations</span></p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#a3a3a3">Powered by Taylor AI · A Capvtal Innovations product<br>
      <a href="${SITE_URL}/settings" style="color:#a3a3a3">Email preferences</a></p>
  </td></tr></table></body></html>`;
}

async function send(e: Email) {
  if (!e.to?.email) return "skipped: no email";
  if (!e.essential && !e.to.wantsEmail) return "skipped: muted";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [e.to.email],
      reply_to: REPLY_TO,
      subject: e.subject,
      html: render(e),
      text: [e.heading, "", ...e.lines, ...(e.cta ? ["", `${e.cta.label}: ${SITE_URL}${e.cta.path}`] : []), "", "Taylor", "Chief Information Officer (CIO), Capvtal Innovations"].join("\n"),
    }),
  });
  return res.ok ? "sent" : `failed: ${res.status} ${await res.text()}`;
}

// ---------- event → emails ---------------------------------------------------

async function emailsFor(p: EventPayload): Promise<Email[]> {
  const r = p.record ?? {};
  const o = p.old_record ?? {};

  // New account
  if (p.table === "profiles" && p.type === "INSERT") {
    const me = await getPerson(r.id);
    return [{
      to: me,
      essential: true,
      subject: "Welcome to Hustle",
      heading: `Welcome, ${me?.name ?? "there"}!`,
      lines: [
        "I'm Taylor, Chief Information Officer (CIO) at Capvtal Innovations, and I'll keep you posted on your bookings, messages and anything else that needs your attention.",
        "Find a verified hustler near you, or offer your own skills and start earning.",
      ],
      cta: { label: "Explore Hustle", path: "/browse" },
    }];
  }

  // Bookings
  if (p.table === "bookings") {
    const [customer, hustler, title] = await Promise.all([
      getPerson(r.customer_id),
      getHustlerPerson(r.hustler_id),
      getService(r.service_id),
    ]);
    const details: [string, string][] = [
      ["Service", title],
      ["When", when(r.scheduled_date, r.scheduled_time)],
      ["Total", zar(r.total_price)],
    ];

    if (p.type === "INSERT") {
      return [
        {
          to: hustler,
          essential: true,
          subject: `New booking request: ${title}`,
          heading: "You have a new booking request",
          lines: [`${customer?.name ?? "A customer"} would like to book you. Please accept or decline it soon so they can plan their day.`],
          details: r.notes ? [...details, ["Notes", r.notes]] : details,
          cta: { label: "Review request", path: "/dashboard" },
        },
        {
          to: customer,
          subject: `Booking requested: ${title}`,
          heading: "Your booking request is in",
          lines: [`I've sent your request to ${hustler?.name ?? "your hustler"}. I'll email you as soon as they respond.`],
          details,
          cta: { label: "View my bookings", path: "/my-bookings" },
        },
      ];
    }

    if (p.type === "UPDATE" && r.payment_status === "paid" && o.payment_status !== "paid") {
      return [
        {
          to: customer,
          essential: true,
          subject: `Payment received: ${title}`,
          heading: "You're all booked",
          lines: [`Thanks! Your payment went through and ${hustler?.name ?? "your hustler"} has been told you're confirmed.`],
          details: [...details, ["Paid", zar(r.total_price)]],
          cta: { label: "View booking", path: "/my-bookings" },
        },
        {
          to: hustler,
          essential: true,
          subject: `Paid: ${title}`,
          heading: "The customer has paid",
          lines: [
            `${customer?.name ?? "Your customer"} paid for this booking. It's confirmed, so you can go ahead with the job.`,
            "Your share is paid out to your bank account by Paystack on its normal settlement schedule.",
          ],
          details: [
            ...details,
            ["Hustle fee (10%)", `- ${zar(r.platform_fee)}`],
            ["You earn", zar(r.hustler_amount)],
          ],
          cta: { label: "Open dashboard", path: "/dashboard" },
        },
      ];
    }

    if (p.type === "UPDATE" && r.status !== o.status) {
      switch (r.status) {
        case "accepted":
          return [{
            to: customer,
            essential: true,
            subject: `Accepted: ${title}. Pay to confirm`,
            heading: "Your hustler said yes",
            lines: [
              `Good news! ${hustler?.name ?? "Your hustler"} accepted your booking.`,
              "Pay securely on Hustle to lock in your slot. You can message them any time.",
            ],
            details,
            cta: { label: "Pay now", path: "/my-bookings" },
          }];
        case "declined":
          return [{
            to: customer,
            essential: true,
            subject: `Not available: ${title}`,
            heading: "Your hustler can't make it",
            lines: [
              `Sorry, ${hustler?.name ?? "the hustler"} isn't available for this booking. You haven't been charged.`,
              ...(r.decline_reason ? [`Their note: “${String(r.decline_reason).slice(0, 300)}”`] : []),
              "There are plenty of other verified hustlers ready to help.",
            ],
            details,
            cta: { label: "Find another hustler", path: "/browse" },
          }];
        case "completed":
          return [{
            to: customer,
            subject: `How did it go? ${title}`,
            heading: "Job done! How was it?",
            lines: [`${hustler?.name ?? "Your hustler"} marked your booking as complete. A quick rating helps other customers and rewards great work.`],
            details,
            cta: { label: "Leave a review", path: "/my-bookings" },
          }];
        case "cancelled":
          return [{
            to: hustler,
            essential: true,
            subject: `Cancelled: ${title}`,
            heading: "A booking was cancelled",
            lines: [`${customer?.name ?? "The customer"} cancelled this booking. The time slot is free again.`],
            details,
            cta: { label: "Open dashboard", path: "/dashboard" },
          }];
      }
    }
    return [];
  }

  // Hustler applications
  if (p.table === "hustler_profiles") {
    const applicant = await getPerson(r.user_id);

    if (p.type === "INSERT") {
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
      const adminPeople = await Promise.all((admins ?? []).map((a) => getPerson(a.user_id)));
      return [
        {
          to: applicant,
          essential: true,
          subject: "We received your Hustler application",
          heading: "Application received",
          lines: [
            "Thanks for applying to hustle with us! Our team is checking your documents now.",
            "Most applications are reviewed within 2 to 3 business days. I'll email you as soon as there's news.",
          ],
          cta: { label: "Check status", path: "/become-hustler" },
        },
        ...adminPeople.map((admin) => ({
          to: admin,
          essential: true,
          subject: "New Hustler application to review",
          heading: "New application waiting",
          lines: [`${applicant?.name ?? "Someone"} applied to become a hustler.`],
          cta: { label: "Review applications", path: "/admin" },
        })),
      ];
    }

    if (p.type === "UPDATE" && r.status !== o.status) {
      if (r.status === "approved") {
        return [{
          to: applicant,
          essential: true,
          subject: "You're approved! Welcome to Hustle",
          heading: "You're approved 🎉",
          lines: [
            "Your documents check out and your Hustler profile is live.",
            "Add your first service with clear photos and a fair price, and customers nearby can start booking you.",
          ],
          cta: { label: "Add your first service", path: "/dashboard" },
        }];
      }
      if (r.status === "rejected") {
        return [{
          to: applicant,
          essential: true,
          subject: "Update on your Hustler application",
          heading: "We couldn't approve your application",
          lines: [
            "Unfortunately we weren't able to approve your application this time, usually because a document was unclear or incomplete.",
            "Reply to this email and our team will tell you what's needed.",
          ],
        }];
      }
    }
    return [];
  }

  // New chat message (only the first unread one, so busy chats don't flood inboxes)
  if (p.table === "messages" && p.type === "INSERT") {
    const { data: convo } = await db
      .from("conversations")
      .select("customer_id, hustler_id")
      .eq("id", r.conversation_id)
      .maybeSingle();
    if (!convo) return [];

    const { count } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", r.conversation_id)
      .eq("sender_id", r.sender_id)
      .eq("is_read", false);
    if ((count ?? 0) > 1) return [];

    const hustler = await getHustlerPerson(convo.hustler_id);
    const customer = await getPerson(convo.customer_id);
    const senderIsCustomer = r.sender_id === convo.customer_id;
    const [sender, recipient] = senderIsCustomer ? [customer, hustler] : [hustler, customer];
    const preview = String(r.content ?? "").slice(0, 160);

    return [{
      to: recipient,
      subject: `New message from ${sender?.name ?? "Hustle"}`,
      heading: `${sender?.name ?? "Someone"} sent you a message`,
      lines: [`“${preview}${preview.length === 160 ? "…" : ""}”`],
      cta: { label: "Reply", path: `/chat/${r.conversation_id}` },
    }];
  }

  return [];
}

// ---------- entry point ------------------------------------------------------

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("NOTIFY_WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload = (await req.json()) as EventPayload;

    // Let Taylor's own system know as well, if it's connected.
    const taylorUrl = Deno.env.get("TAYLOR_WEBHOOK_URL");
    const forward = taylorUrl
      ? fetch(taylorUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-taylor-secret": Deno.env.get("TAYLOR_WEBHOOK_SECRET") ?? "" },
          body: JSON.stringify({ source: "hustle", ...payload }),
        }).catch((e) => console.error("Taylor forward failed", e))
      : Promise.resolve();

    const emails = await emailsFor(payload);
    const results = await Promise.all(emails.map(send));
    await forward;

    console.log(payload.table, payload.type, results);
    return Response.json({ ok: true, results });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
});
