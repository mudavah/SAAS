export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  date: string;
  category: string;
  readingMinutes: number;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "getting-started-with-kaziflow",
    title: "Getting Started with KaziFlow: A 5-Minute Setup",
    excerpt: "From signup to your first paid invoice — the fastest path to running your business on KaziFlow.",
    body: "KaziFlow is built for Kenyan businesses. After signing up, complete onboarding to create your organization, invite your team, and connect M-Pesa or Stripe. Create your first invoice in under five minutes and share it by link or email. Tax reports and eTIMS compliance are one toggle away in the Compliance Center.",
    author: "KaziFlow Team",
    date: "2026-07-01",
    category: "Getting Started",
    readingMinutes: 4,
  },
  {
    slug: "etims-compliance-made-simple",
    title: "eTIMS Compliance Made Simple",
    excerpt: "How KaziFlow automates KRA electronic Tax Invoice Management System submissions.",
    body: "Connect your KRA eTIMS credentials once, and KaziFlow validates every invoice against KRA PIN rules before submission. Failed submissions land in a retry queue with alerts, and your Compliance Health dashboard shows a live score. No more manual uploads to the KRA portal.",
    author: "KaziFlow Team",
    date: "2026-07-08",
    category: "Compliance",
    readingMinutes: 6,
  },
  {
    slug: "multi-branch-management",
    title: "Running Multiple Branches Without the Chaos",
    excerpt: "Approvals, inter-branch transfers and benchmarking for growing enterprises.",
    body: "Enterprise plans unlock branch management: create branches, delegate admins, route approvals, and transfer inventory between locations. The Branch Benchmarking dashboard compares revenue, expenses and profit so you can spot your top performers at a glance.",
    author: "KaziFlow Team",
    date: "2026-07-12",
    category: "Enterprise",
    readingMinutes: 5,
  },
];
