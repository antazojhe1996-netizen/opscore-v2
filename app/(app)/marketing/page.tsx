"use client";

import { supabaseClient as supabase } from "@/lib/supabase-client";
import {
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Gift,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import PageGuard from "@/components/PageGuard";

const campaigns = [
  {
    title: "Rainy Day Room Promo",
    channel: "Facebook Ads",
    status: "Active",
    budget: "Ã¢â€šÂ±5,000",
    reach: "18,420",
    leads: "64",
  },
  {
    title: "Pool Day Tour Boost",
    channel: "Organic Social",
    status: "Scheduled",
    budget: "Ã¢â€šÂ±0",
    reach: "8,250",
    leads: "31",
  },
  {
    title: "Sports Bar Weekend Promo",
    channel: "Facebook Page",
    status: "Draft",
    budget: "Ã¢â€šÂ±2,000",
    reach: "4,900",
    leads: "18",
  },
];

const posts = [
  { day: "Mon", title: "Room Promo Post", type: "Facebook", status: "Posted" },
  { day: "Tue", title: "Pool Reel", type: "Instagram", status: "Scheduled" },
  { day: "Wed", title: "Restaurant Menu Feature", type: "Facebook", status: "Draft" },
  { day: "Thu", title: "Guest Review Highlight", type: "Google", status: "Scheduled" },
  { day: "Fri", title: "Weekend Bar Promo", type: "Facebook", status: "Draft" },
];

const leads = [
  { name: "Sarah Miller", source: "Facebook", interest: "Family Room", status: "New Lead" },
  { name: "Mark Anthony", source: "Messenger", interest: "Day Tour", status: "Follow Up" },
  { name: "Ana Cruz", source: "Google", interest: "Deluxe Room", status: "Converted" },
  { name: "John Reyes", source: "Walk-in Inquiry", interest: "Event Package", status: "Quoted" },
];

export default function MarketingPage() {
  return (
    <PageGuard moduleKey="dashboard">
      <div className="flex min-h-screen bg-slate-100 text-slate-950">
<main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/25">
                <Megaphone size={24} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">
                  OPSCORE Marketing
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                  Marketing Command Center
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Plan campaigns, monitor leads, schedule posts, and track promotional performance.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
                <CalendarDays size={16} />
                June 2026
              </button>

              <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25">
                <Plus size={17} />
                New Campaign
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={<Target size={22} />}
              title="Active Campaigns"
              value="7"
              note="3 running today"
            />
            <Metric
              icon={<Users size={22} />}
              title="New Leads"
              value="126"
              note="+18 this week"
            />
            <Metric
              icon={<TrendingUp size={22} />}
              title="Estimated Reach"
              value="42.8K"
              note="Across all channels"
            />
            <Metric
              icon={<Gift size={22} />}
              title="Promo Conversions"
              value="34"
              note="Room & day tour leads"
            />
          </section>

          <section className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Campaign Performance
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Current marketing campaigns and expected business impact.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Search size={16} className="text-slate-400" />
                    <input
                      placeholder="Search campaign..."
                      className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <th className="pb-3 font-black">Campaign</th>
                        <th className="pb-3 font-black">Channel</th>
                        <th className="pb-3 font-black">Status</th>
                        <th className="pb-3 font-black">Budget</th>
                        <th className="pb-3 font-black">Reach</th>
                        <th className="pb-3 font-black">Leads</th>
                      </tr>
                    </thead>

                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.title} className="border-b border-slate-100 last:border-0">
                          <td className="py-4">
                            <p className="font-black text-slate-900">{campaign.title}</p>
                            <p className="text-xs font-bold text-slate-400">Vincent Resort Hotel</p>
                          </td>
                          <td className="py-4 text-sm font-bold text-slate-600">{campaign.channel}</td>
                          <td className="py-4">
                            <span className={getStatusClass(campaign.status)}>
                              {campaign.status}
                            </span>
                          </td>
                          <td className="py-4 text-sm font-black text-slate-800">{campaign.budget}</td>
                          <td className="py-4 text-sm font-black text-slate-800">{campaign.reach}</td>
                          <td className="py-4 text-sm font-black text-blue-600">{campaign.leads}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Content Calendar
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Weekly posting plan.
                      </p>
                    </div>
                    <CalendarDays className="text-blue-600" size={22} />
                  </div>

                  <div className="mt-5 space-y-3">
                    {posts.map((post) => (
                      <div
                        key={`${post.day}-${post.title}`}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white">
                          {post.day}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {post.title}
                          </p>
                          <p className="text-xs font-bold text-slate-400">{post.type}</p>
                        </div>

                        <span className={getStatusClass(post.status)}>
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Promo Pipeline
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Suggested promos to launch.
                      </p>
                    </div>
                    <Sparkles className="text-blue-600" size={22} />
                  </div>

                  <div className="mt-5 space-y-3">
                    <Promo
                      title="Weekday Room Saver"
                      desc="Boost low-occupancy weekdays with direct booking promo."
                      tag="Rooms"
                    />
                    <Promo
                      title="Pool + Food Bundle"
                      desc="Convert day tour guests into restaurant revenue."
                      tag="Day Tour"
                    />
                    <Promo
                      title="Sports Bar Weekend"
                      desc="Increase Friday and Saturday night spending."
                      tag="F&B"
                    />
                    <Promo
                      title="Review Booster"
                      desc="Encourage satisfied guests to leave Google reviews."
                      tag="Reputation"
                    />
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Channel Breakdown
                </h2>

                <div className="mt-5 space-y-4">
                  <Channel label="Facebook" value="45%" />
                  <Channel label="Google" value="25%" />
                  <Channel label="Walk-in" value="15%" />
                  <Channel label="Booking.com" value="10%" />
                  <Channel label="Referrals" value="5%" />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Guest Leads
                </h2>

                <div className="mt-4 space-y-3">
                  {leads.map((lead) => (
                    <div key={lead.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{lead.name}</p>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {lead.source} Ã¢â‚¬Â¢ {lead.interest}
                          </p>
                        </div>
                        <span className={getStatusClass(lead.status)}>
                          {lead.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-blue-200 bg-blue-600 p-5 text-white shadow-xl shadow-blue-600/30">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Star size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black">AI Suggestion</p>
                    <p className="text-xs text-blue-100">Marketing opportunity</p>
                  </div>
                </div>

                <p className="mt-4 text-sm font-semibold leading-6 text-blue-50">
                  Push a weekday room promo and pair it with pool day tour content to improve low-demand days.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </PageGuard>
  );
}

function Metric({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/20">
          {icon}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            {title}
          </p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">{value}</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">{note}</p>
        </div>
      </div>
    </div>
  );
}

function Promo({
  title,
  desc,
  tag,
}: {
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
          {tag}
        </span>
      </div>
      <p className="text-xs font-medium leading-5 text-slate-500">{desc}</p>
    </div>
  );
}

function Channel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-600" style={{ width: value }} />
      </div>
    </div>
  );
}

function getStatusClass(status: string) {
  if (status === "Active" || status === "Posted" || status === "Converted") {
    return "rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700";
  }

  if (status === "Scheduled" || status === "Follow Up" || status === "Quoted") {
    return "rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700";
  }

  if (status === "Draft" || status === "New Lead") {
    return "rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-700";
  }

  return "rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600";
}



