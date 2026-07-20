# Hobby CPU host free tiers for a FastAPI Docker inference API

**Research date:** 2026-07-20  
**Question:** Is there a provider that is **truly free forever** (not just a trial) suitable for an always-deployed hobby CPU container/web service that can sleep / cold-start? Candidates historically considered: Render, Fly.io, Railway. Railway is already in use but noted as free for only ~30 days.

**Method:** Claims below are from **primary sources only** (official pricing pages, free-tier docs, first-party blog posts). Third-party roundups were not used as sources of truth.

---

## Recommendation for verdia

**Prefer Render’s Free web service** for the academic demo Inference API if the goal is free-forever hosting with cold starts acceptable.

Render documents an ongoing Free web service instance type ($0/month), custom Docker support, spin-down after 15 minutes of idle inbound traffic, ~1 minute cold start, and 750 Free instance hours/month. That matches a small FastAPI Docker service that is “always deployed” but allowed to sleep.

**If staying on Railway is preferred for DX**, plan on **Hobby ($5/month)** after the trial — not the Free plan. Railway’s Free plan is $0 subscription with only **$1/month** usage credit and free-tier deploy peak-hour restrictions; it is not a practical always-on (or even lightly used always-deployed) ML demo host once the 30-day / $5 trial ends.

**Strong free-forever alternatives** if PaaS simplicity is less important:

- **Google Cloud Run Always Free** — genuine monthly free allotment + scale-to-zero; best container fit among hyperscalers, but requires a Cloud Billing account (credit card) and more GCP ops surface.
- **Oracle Cloud Always Free** — free forever VMs, not a managed container PaaS; DIY Docker + known capacity / idle-reclamation caveats.

Fly.io is **not** free forever (trial only).

---

## Comparison table

| Provider | Free forever? | Sleep / scale-to-zero | Hard limits (summary) | Credit card | Suitability for small FastAPI Docker |
| --- | --- | --- | --- | --- | --- |
| **Render** | **Yes** (Free web services) | Yes — 15 min idle | 512 MB / 0.1 CPU; 750 instance-hrs/mo; bandwidth & build minutes | Not required for Free; needed if overages would bill | **Excellent** if cold starts OK |
| **Railway** | **Partial** — Free plan $0 + $1/mo credit after trial | Optional Serverless (~10 min no outbound) | Trial: 30 days / $5; Free: 0.5 GB / 1 vCPU, peak deploy bans; Hobby: $5/mo | Pricing page: trial “No credit card required” | Trial OK; Free plan weak; **Hobby acceptable** |
| **Fly.io** | **No** — trial only | Trial machines auto-stop after 5 min | 2 VM-hours **or** 7 days | Required after trial | Poor for free-forever; cheap paid possible |
| **Google Cloud Run** | **Yes** (Always Free monthly limits) | Yes — scales to zero | Request-based free: 180k vCPU-s, 360k GiB-s, 2M req/mo (+ egress) | Billing account / payment method required | **Excellent** for containers; more setup |
| **Koyeb** | **Yes** (free Instance type; docs still current as of 2026-05) | Yes — free instances scale to zero after 1 hour idle | 1 free web service: 512 MB / 0.1 vCPU / 2 GB SSD; FRA or IAD only | Uncertain — FAQ discusses CC for paid; older blog said often no CC | Good hobby fit; **note Mistral acquisition** |
| **Oracle Cloud** | **Yes** (Always Free, unlimited time) | N/A (always-on VM; idle VMs may be **reclaimed**) | e.g. 2× AMD micro and/or Ampere A1 1,500 OCPU-h + 9,000 GB-h/mo (~2 OCPU / 12 GB for Always Free tenancies) | Required at signup (card types restricted) | Workable DIY Docker; **not** managed PaaS |

---

## Provider details

### 1. Railway

**Free forever?** Partial.  
There is a lasting **Free** plan at **$0/month** with **$1 of free credit per month** (non-rollover). That is not the same as a generous forever free hobby host. New users first get a **Free Trial**: up to **30 days** and a one-time **$5** credit; then the account reverts to Free.

1. **Is there a free forever tier?** Partial — Free plan exists forever at $0 + $1/mo credit; trial is time/credit limited.
2. **Hard limits:**
   - Trial: $5 once / 30 days; trial resources include up to **1 GB RAM**, shared vCPU, **5 services/project** ([Free Trial](https://docs.railway.com/pricing/free-trial)).
   - Free plan: **$1/mo** credit; max **0.5 GB RAM**, **1 vCPU**, 1 replica, 0.5 GB volume, 4 GB image ([Plans](https://docs.railway.com/pricing/plans)).
   - Free-tier **deployments rejected during peak hours** (approx. 8 AM–8 PM local per region) ([Deployments reference](https://docs.railway.com/deployments/reference)).
   - Hobby: **$5/month** subscription including **$5** usage; not free ([Plans FAQ](https://docs.railway.com/pricing/plans)).
   - Optional **Serverless** (formerly App Sleeping): sleep after **~10 minutes** with no **outbound** traffic; cold boot on wake; first request may **502** ([Serverless](https://docs.railway.com/deployments/serverless)).
   - Credit card: marketing pricing lists Free Trial as **“No credit card required”** ([railway.com/pricing](https://railway.com/pricing)).
3. **Suitability:** Fine during trial. After trial, Free plan credit is too small for continuous runtime (RAM alone is billed at **$10/GB/month**), and peak-hour deploy locks hurt iteration. With Serverless + very sparse traffic, Free might stay under $1 — **uncertain / fragile** for a demo. **Hobby is the realistic Railway path.**
4. **Sources:**  
   - https://docs.railway.com/pricing/free-trial  
   - https://docs.railway.com/pricing/plans  
   - https://railway.com/pricing  
   - https://docs.railway.com/deployments/serverless  
   - https://docs.railway.com/deployments/reference  

---

### 2. Render

**Free forever?** Yes, for Free instance types (web services, with documented limitations). Official docs frame Free as for hobby / preview — not production — but do **not** describe it as a time-boxed trial.

1. **Is there a free forever tier?** Yes (Free web services at $0/month on the Hobby workspace plan priced at $0 + compute).
2. **Hard limits:**
   - Free web service: **512 MB RAM / 0.1 CPU** ([Pricing](https://render.com/pricing)).
   - **Spins down after 15 minutes** without inbound HTTP / WebSocket activity; spin-up **~1 minute**; loading page during wake ([Deploy for Free](https://render.com/docs/free)).
   - **750 Free instance hours** per workspace per calendar month; spun-down time does not consume hours; exhaustion suspends Free web services until next month ([Deploy for Free](https://render.com/docs/free)).
   - Counts against workspace **outbound bandwidth** and **build pipeline minutes**; without a payment method, exceeding bandwidth/build limits can suspend Free services or disable new builds ([Deploy for Free](https://render.com/docs/free); [FAQ](https://render.com/docs/faq)).
   - Ephemeral FS; no persistent disks on Free; may restart anytime; no horizontal scale / SSH / private inbound, etc. ([Deploy for Free](https://render.com/docs/free)).
   - Custom **Docker** containers are supported for services on the platform ([Pricing](https://render.com/pricing)).
   - Credit card: not required to run Free; billing applies if a payment method is on file and included usage is exceeded ([FAQ](https://render.com/docs/faq)).
3. **Suitability:** **Strong match** for a small FastAPI Docker Inference API when cold starts are OK. Keep the service mostly idle so 750 hours last; avoid high outbound egress.
4. **Sources:**  
   - https://render.com/docs/free  
   - https://render.com/pricing  
   - https://render.com/docs/faq  

---

### 3. Fly.io

**Free forever?** No.

1. **Is there a free forever tier?** No. Official cost docs: **“There is no ‘free account/free tier’ on Fly.io.”** Only a Free Trial ([Cost management](https://fly.io/docs/about/cost-management/); [Free Trial](https://fly.io/docs/about/free-trial/)).
2. **Hard limits (trial):**
   - **2 total VM hours or 7 days**, whichever first.
   - Trial machines **auto-stop after 5 minutes**.
   - Caps: 10 machines, 20 GB volumes, up to 2 vCPUs / 4 GB RAM per machine.
   - After trial (or when limits hit): apps stop until a **payment method** is added; adding a card **ends the trial** and usage bills.
3. **Suitability:** Not free forever. After trial, a tiny auto-stop machine can be cheap paid (~few USD/month per Fly’s own examples), but that fails the free-forever criterion.
4. **Sources:**  
   - https://fly.io/docs/about/free-trial/  
   - https://fly.io/docs/about/cost-management/  

---

### 4. Google Cloud Run (Always Free)

**Free forever?** Yes — monthly Always Free / Free Tier allotments that **do not expire** with the 90-day trial (subject to Google changing limits). Separate from the $300 / 90-day Free Trial credit.

1. **Is there a free forever tier?** Yes (Free Tier monthly limits for Cloud Run).
2. **Hard limits (as documented):**
   - Free Tier summary for **request-based billing**: **2M requests/mo**, **360,000 GB-seconds** memory, **180,000 vCPU-seconds**, **1 GB** North America outbound ([Free cloud features](https://docs.cloud.google.com/free/docs/free-cloud-features); [Cloud Run pricing](https://cloud.google.com/run/pricing)).
   - **Instance-based billing** free tier differs (e.g. **240,000** vCPU-seconds / **450,000** GiB-seconds on the pricing page) — use the billing mode that matches the service ([Cloud Run pricing](https://cloud.google.com/run/pricing)).
   - Scales to zero when idle (pay-per-use model; free tier covers usage under limits).
   - A **Cloud Billing account** is required for Free Tier; signup uses a **credit card or other payment method**; overages on a Paid account are billed ([Free cloud features](https://docs.cloud.google.com/free/docs/free-cloud-features)).
   - Free Trial ($300 / 90 days) is separate; without upgrading before trial end, trial resources can be stopped/deleted — Free Tier continues on an active billing account ([Free cloud features](https://docs.cloud.google.com/free/docs/free-cloud-features)).
3. **Suitability:** **Excellent** for a containerized FastAPI API with cold starts OK. More account/IAM/region setup than Render/Railway. Watch free-tier region/billing-mode details on the pricing page.
4. **Sources:**  
   - https://docs.cloud.google.com/free/docs/free-cloud-features  
   - https://cloud.google.com/run/pricing  
   - https://cloud.google.com/free  

---

### 5. Koyeb

**Free forever?** Yes, per current product docs (last updated **2026-05-27** on FAQ/instances pages). Official blog historically committed to a forever free tier. **Caveat:** Koyeb states it has been **acquired by Mistral AI**; blog posts may lag platform changes — verify at deploy time.

1. **Is there a free forever tier?** Yes — one `free` web Service per org.
2. **Hard limits:**
   - **512 MB RAM, 0.1 vCPU, 2 GB SSD**; FRA or Washington, D.C. only; one Free Instance per organization ([Instances](https://www.koyeb.com/docs/reference/instances); [Pricing FAQ](https://www.koyeb.com/docs/faqs/pricing)).
   - Free Instances **scale down to zero after 1 hour** without traffic ([Instances](https://www.koyeb.com/docs/reference/instances)).
   - Not for Workers; no custom scaling; no Volumes ([Instances](https://www.koyeb.com/docs/reference/instances)).
   - Credit card: Pricing FAQ documents CC requirements for paid plans / fraud checks. Older first-party blog said free signup may skip CC when identity can be proven automatically — **treat CC requirement as ambiguous** ([Pricing FAQ](https://www.koyeb.com/docs/faqs/pricing); [Blog 2023](https://www.koyeb.com/blog/sustaining-free-compute-in-a-hostile-environment)).
3. **Suitability:** Good hobby Docker web service if free tier remains post-acquisition; similar sleep model to Render (longer idle window).
4. **Sources:**  
   - https://www.koyeb.com/docs/faqs/pricing  
   - https://www.koyeb.com/docs/reference/instances  
   - https://www.koyeb.com/blog/sustaining-free-compute-in-a-hostile-environment  

---

### 6. Oracle Cloud Always Free

**Free forever?** Yes. Always Free services are available for an **unlimited period of time** (with stated limitations). Separate 30-day / $300 trial credits.

1. **Is there a free forever tier?** Yes.
2. **Hard limits (compute-relevant):**
   - Up to **two** Always Free AMD **VM.Standard.E2.1.Micro** instances.
   - Ampere A1: first **1,500 OCPU hours** and **9,000 GB hours**/month free; for Always Free tenancies equivalent to **2 OCPUs and 12 GB** ([Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm); [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)).
   - Home region only for Always Free compute; **“out of host capacity”** errors are documented.
   - **Idle reclamation:** Always Free compute may be reclaimed if over 7 days CPU/network/(memory for A1) utilization stays below thresholds ([Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)).
   - Marketing terms also note accounts idle **30+ days** may be deemed abandoned ([oracle.com/cloud/free](https://www.oracle.com/cloud/free/)).
   - Credit/debit card required at signup (restricted card types) ([oracle.com/cloud/free](https://www.oracle.com/cloud/free/)).
3. **Suitability:** Viable for DIY Docker on a free VM, **not** a managed “deploy container URL” PaaS. Ops burden and capacity/idle risks make it a weaker fit for a small academic demo unless someone already runs OCI.
4. **Sources:**  
   - https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm  
   - https://www.oracle.com/cloud/free/  

---

## Bottom line

| Goal | Choice |
| --- | --- |
| **Free forever + Docker web service + sleep OK** | **Render Free** (first choice) |
| **Free forever + containers, OK with GCP** | **Cloud Run Always Free** |
| **Keep Railway DX** | **Hobby ($5/mo)** after trial — not Free plan |
| **Avoid** for free-forever requirement | **Fly.io** (trial only) |

**Uncertainty markers:** Koyeb post–Mistral acquisition longevity; exact Cloud Run free numbers depend on request-based vs instance-based billing; whether Railway Free + Serverless stays under $1/mo for a real FastAPI image (depends on wake frequency and outbound chatter).

---

## Source index

1. Railway Free Trial — https://docs.railway.com/pricing/free-trial  
2. Railway Plans — https://docs.railway.com/pricing/plans  
3. Railway Pricing (marketing) — https://railway.com/pricing  
4. Railway Serverless — https://docs.railway.com/deployments/serverless  
5. Railway Deployments reference (free peak hours) — https://docs.railway.com/deployments/reference  
6. Render Deploy for Free — https://render.com/docs/free  
7. Render Pricing — https://render.com/pricing  
8. Render FAQ — https://render.com/docs/faq  
9. Fly.io Free Trial — https://fly.io/docs/about/free-trial/  
10. Fly.io Cost Management — https://fly.io/docs/about/cost-management/  
11. Google Cloud Free features — https://docs.cloud.google.com/free/docs/free-cloud-features  
12. Cloud Run pricing — https://cloud.google.com/run/pricing  
13. Google Cloud Free landing — https://cloud.google.com/free  
14. Koyeb Pricing FAQ — https://www.koyeb.com/docs/faqs/pricing  
15. Koyeb Instances — https://www.koyeb.com/docs/reference/instances  
16. Koyeb free-tier blog — https://www.koyeb.com/blog/sustaining-free-compute-in-a-hostile-environment  
17. Oracle Always Free Resources — https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm  
18. Oracle Cloud Free Tier — https://www.oracle.com/cloud/free/  
