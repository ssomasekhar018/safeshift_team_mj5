# SafeShift 🛡️
### AI-Powered Parametric Income Insurance for India's Q-Commerce Delivery Partners

> *"When the rain stops your shift, SafeShift starts your payout."*

---

## ⚡ TL;DR

SafeShift is a zero-touch parametric insurance platform for Q-commerce delivery partners (Zepto, Blinkit, Swiggy Instamart) that automatically detects hyperlocal disruptions — heavy rain, dangerous AQI, local shutdowns — and pays income compensation directly to a worker's UPI wallet **within 90 seconds**, using AI-driven weekly risk pricing and a multi-layer adversarial fraud defense system. No forms. No calls. No waiting.

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKER INTERFACE  (Mobile PWA)                   │
│         Onboarding · Weekly Policy · Live Alerts · Payout Status    │
└───────────────┬─────────────────────────────────────────────────────┘
                │
    ┌───────────┼───────────────────────────────────┐
    ▼           ▼               ▼                   ▼
┌─────────┐ ┌──────────┐  ┌────────────────┐  ┌──────────────┐
│ Policy  │ │ Risk AI  │  │  Parametric    │  │    Fraud     │
│ Engine  │ │ (XGBoost)│  │Trigger Monitor │  │  Detection   │
│         │ │          │  │  (5 triggers)  │  │ (6-signal)   │
└────┬────┘ └────┬─────┘  └───────┬────────┘  └──────┬───────┘
     │           │                │                   │
     └───────────┴───────┬────────┴───────────────────┘
                         ▼
          ┌──────────────────────────────┐
          │        Core Database         │
          │  MongoDB · Redis · BullMQ    │
          └──────────────┬───────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   ┌─────────────┐ ┌──────────┐ ┌────────────┐
   │External APIs│ │ML Model  │ │  Payment   │
   │OpenWeather  │ │  Store   │ │  Gateway   │
   │AQICN · News │ │(joblib)  │ │  Razorpay  │
   └─────────────┘ └──────────┘ └────────────┘
                         │
    ┌────────────────────┼───────────────────────┐
    ▼                                            ▼
┌──────────────────────┐        ┌──────────────────────────┐
│   Worker Dashboard   │        │  Admin / Insurer Panel   │
│ Coverage · Payouts   │        │ Loss ratios · Fraud queue │
│ Zone risk map        │        │ Zone risk heatmap         │
└──────────────────────┘        └──────────────────────────┘
```

---

## 🔄 Core User Flow

```
[SUNDAY NIGHT]
Worker opens SafeShift PWA
    └─▶ AI shows zone risk score + recommended tier
    └─▶ One-tap UPI payment → policy activates Monday 00:01 AM

[DURING THE WEEK — FULLY AUTOMATED]
Trigger monitor polls APIs every 5 min per zone
    └─▶ Threshold crossed? → Check worker's active hours
    └─▶ Active policy found? → Run 6-signal fraud check (<15 sec)
    └─▶ Trust score ≥ 70?  → Claim auto-approved
    └─▶ Payout sent to UPI wallet
    └─▶ Worker gets SMS: "₹320 credited for rain disruption · 7:23 AM"

[WORKER NEVER OPENS APP · NEVER FILLS A FORM · NEVER MAKES A CALL]
```

---

## 📱 UI Mockup — Worker Dashboard

> Minimal single-screen design built for low-end Android users — large touch targets, high-contrast status indicators, and real-time payout notifications front and centre. No navigation menus. No settings buried three taps deep. Everything Ravi needs is visible the moment he opens the app.

```
┌───────────────────────────────────┐
│  SafeShift              Ravi K. ☰ │
├───────────────────────────────────┤
│  📍 Zone 4B · Koramangala         │
│  ✅ Coverage ACTIVE  (Mon–Sun)    │
│  Plan: Standard · ₹49/week        │
├───────────────────────────────────┤
│  THIS WEEK                        │
│  ┌───────────┐   ┌───────────┐    │
│  │  ₹960     │   │ 3 Events  │    │
│  │ Protected │   │ Triggered │    │
│  └───────────┘   └───────────┘    │
├───────────────────────────────────┤
│  RECENT PAYOUTS                   │
│  🌧  Rain  · Tue 7:23 AM  +₹320  │
│  🌫  AQI   · Wed 9:10 AM  +₹320  │
│  🌧  Rain  · Fri 6:45 AM  +₹320  │
├───────────────────────────────────┤
│  [View Zone Risk Map]             │
│  [This Week's Coverage Details]   │
└───────────────────────────────────┘
```

---

## 🎬 Demo Scenario

> **Simulated Event:** Heavy rain alert fires in Koramangala Zone 4B at 7:18 AM on a Tuesday.

**What happens in the next 90 seconds:**

| Time | Event |
|------|-------|
| `07:18:00` | OpenWeatherMap API returns rainfall = 18.4mm/hr for pincode 560034 |
| `07:18:05` | BullMQ job picks up trigger; cross-checks 120 active policies in Zone 4B |
| `07:18:12` | 6-signal fraud check runs on all 120 claimants simultaneously |
| `07:18:24` | 114 pass (trust ≥ 70); 4 soft-held; 2 flagged for human review |
| `07:18:30` | 114 payouts initiated via Razorpay sandbox |
| `07:19:28` | All 114 workers receive UPI credit + SMS notification |
| `07:19:28` | Admin dashboard: Zone 4B event · ₹36,480 paid · 2 flagged claims |

**Zero worker action. Zero manual processing. 89 seconds end-to-end.**

The 2 flagged claims enter the Grace & Verify queue — not rejected, re-checked silently every 5 minutes. Both clear within 15 minutes as behavioral signals stabilize.

---

## 📌 The Problem We're Solving

India's **Grocery/Q-Commerce delivery partners** (Zepto, Blinkit, Swiggy Instamart) operate on brutal 10-minute delivery windows. Unlike food or e-commerce riders, they work in hyper-dense micro-zones — a single waterlogged lane, a local market shutdown, or a 45-minute hailstorm can wipe out their entire peak-hour earnings.

**The numbers are stark:**
- A Zepto/Blinkit partner earns ₹600–900 per day during peak hours (6–10 AM, 7–11 PM)
- A 2-hour disruption in peak hours = 40–60% of daily income lost
- Zero existing insurance addresses this micro-disruption, micro-income-loss problem
- Current parametric products cover cyclones and district floods — not the 45-minute local downpour that drowns one delivery zone

**SafeShift fills this gap:** hyperlocal, automated income protection at the zone level, with payouts in under 90 seconds, zero paperwork, and weekly premiums as low as ₹29/week.

> **The mission is simple: no delivery worker should have to choose between riding out a storm and feeding their family that week.**

---

## 👤 Persona: The Q-Commerce Delivery Partner

**Meet Ravi, 26, Bangalore — Zepto Dark Store Zone 4B, Koramangala**

| Attribute | Detail |
|-----------|--------|
| Working hours | 6 AM–12 PM and 5 PM–11 PM, 6 days/week |
| Good day earnings | ₹700–1,000 |
| Disruption day earnings | ₹100–200 |
| Financial buffer | None — lives week-to-week |
| Device | Budget Android, 3G/4G |
| Payments | PhonePe / Paytm UPI |
| What he does NOT want | Forms, calls, waiting, extra apps |

**Persona-specific pain points:**
1. **Micro-zone waterlogging** — Koramangala and HSR Layout flood locally even when city weather shows "partly cloudy"
2. **Sudden dark store closures** — Blinkit/Zepto shut warehouses for audits with no rider notice
3. **AQI-triggered work bans** — Delhi/NCR winters, Diwali peaks; platforms restrict delivery at AQI 400+
4. **Local shutdowns** — bandhs, flash protests, police barricades near event venues

**Why Q-Commerce over Food/E-Commerce:**
- Tightest delivery windows → highest income sensitivity to even short disruptions
- Dark stores are geographically fixed → enables true hyperlocal risk modeling
- Workers cluster in known micro-zones → AI risk profiling achieves higher accuracy
- This segment has the least existing insurance coverage → highest differentiation potential

---

## ⚙️ Weekly Premium Model

### Tier Structure

| Tier | Zone Risk Level | Weekly Premium | Max Weekly Coverage |
|------|----------------|----------------|---------------------|
| Basic | Low-risk zone | ₹29/week | ₹500 |
| Standard | Medium-risk zone | ₹49/week | ₹900 |
| Pro | High-risk zone | ₹79/week | ₹1,500 |

### AI-Driven Premium Formula

```
weekly_premium = base_rate × zone_risk_multiplier × history_modifier × season_factor

base_rate              = ₹29 (floor)
zone_risk_multiplier   = 0.8–2.5  (zone disruption frequency, last 24 months)
history_modifier       = 0.85–1.3 (worker's personal claim history, last 4 weeks)
season_factor          = 1.0–1.6  (monsoon Jun–Sep; winter smog Nov–Jan)
```

**Weekly cycle:**
- Worker pays every Sunday night for the coming 7 days
- Coverage activates Monday 00:01 AM
- Payouts processed within 90 seconds of any trigger firing
- No annual commitment — cancel any Sunday, zero penalty

---

## 🎯 Parametric Triggers (5 Income-Loss Events)

All triggers fire **only** during the worker's declared active hours and within their registered 2km zone.

| # | Trigger | Data Source | Threshold | Why It Causes Income Loss |
|---|---------|------------|-----------|--------------------------|
| 1 | **Heavy Rain** | OpenWeatherMap (free) | > 15mm/hr for ≥ 45 min | Roads flooded; platform halts deliveries |
| 2 | **Severe AQI** | AQICN (free) | AQI > 400 | Platform-level delivery restriction activated |
| 3 | **Extreme Heat** | OpenWeatherMap | Feels-like > 46°C, 11AM–4PM | Heat advisory; platform pauses outdoor deliveries |
| 4 | **Dark Store Closure** | Platform mock API | Assigned store marked inactive | Worker cannot pick up orders |
| 5 | **Local Shutdown** | News API + admin flag | Admin-verified area curfew/bandh | Cannot access pickup or drop zones |

**Trigger design principles:**
- Fully objective and externally verifiable — no worker input required
- Minimum duration thresholds prevent false positives from momentary spikes
- Active hours binding — a 3 AM rainstorm never triggers a claim for a 6 AM worker
- Geographic binding — trigger must occur within the worker's registered zone radius

---

## 🤖 AI/ML Architecture

### 1. Dynamic Premium Calculation — XGBoost Risk Engine

**Why XGBoost over alternatives:**
Neural networks are too opaque for IRDAI insurance regulatory compliance and too heavy for weekly batch inference on thousands of zones. Linear regression is too simplistic to capture non-linear seasonal and geographic interactions. XGBoost produces interpretable feature importance scores (enabling audit compliance), handles missing data gracefully, and runs inference in under 10ms — critical for Sunday night mass policy renewals.

**Input features:**
- Zone historical disruption frequency (24 months of weather + incident data)
- Season index and time-of-year
- Local infrastructure drainage quality score (municipal data proxy)
- Worker's personal claim history (last 4 weeks)
- Platform delivery density in zone (order activity proxy)
- IMD forecast severity for the coming week

**Output pipeline:**
```
XGBoost → normalized zone_risk_score (0–100)
    → score 0–30   : Basic tier,    premium multiplier 0.8–1.0
    → score 31–65  : Standard tier, premium multiplier 1.0–1.8
    → score 66–100 : Pro tier,      premium multiplier 1.8–2.5

zone_risk_score also directly feeds:
    → trigger sensitivity thresholds (high-risk zones use tighter thresholds)
    → fraud baseline calibration (expected claim rate per zone per week)
    → admin insurer heatmap for portfolio risk visibility
```

**Retraining cadence:** Every Sunday at 10 PM before the new policy cycle begins.

---

### 2. Fraud Detection — Isolation Forest + Rule Engine

**Why Isolation Forest:**
Fraud detection at launch has no labelled fraud training examples — we don't know yet what fraud looks like in our system. Isolation Forest is ideal here: it detects statistical outliers by their isolation depth in random feature trees, requiring no labelled examples. It runs per-claim in under 5ms, scales horizontally, and naturally handles the high-dimensional sparse feature space of claim behavioral signals.

**Detection signals:**
- **GPS jitter naturalness:** Spoofed coordinates show variance < ±1m; genuine GPS drifts ±3–8m even stationary
- **Network type match:** Storms degrade cell towers; stable Wi-Fi signal during a "flood event" is anomalous
- **Signal strength match:** Heavy rain causes measurable signal degradation; home Wi-Fi does not
- **Accelerometer consistency:** Road vibration and rain-walk movement patterns are distinctive
- **Platform app activity:** Genuine worker on shift has delivery app open; spoofer typically does not
- **30-day zone presence history:** Has this device's GPS actually been confirmed in this zone on prior shifts?

**Trust score output:**
```
≥ 70  → Auto-approve; payout in <90 seconds
40–69 → Soft-hold; silent re-check every 5 min for up to 30 min
< 40  → Human review queue; payout withheld pending investigation
```

---

### 3. Onboarding Risk Profiling

At registration, the system immediately runs a zone risk lookup and shows the worker their Zone Safety Score — which triggers are active in their zone, what the thresholds are, and what they can expect to earn in a bad week. This is not a black-box premium number; it's a transparent safety contract that builds trust before the first rupee is collected.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, React Router, Recharts, Lucide Icons, Framer Motion, Three.js |
| **Styling** | Tailwind CSS v3, Custom CSS Variables, Glassmorphism Design System |
| **Frontend Architecture** | PWA (Workbox), ThemeContext, Custom Hooks, AnimatedWrapper |
| **Backend** | Node.js, Express.js, JWT, bcryptjs |
| **Database** | SQLite via `better-sqlite3` (persistent, file-based — zero config) |
| **Offline** | Workbox service worker — policy available without data |
| **ML Service** | Python, Flask, XGBoost, Isolation Forest (DBSCAN) |
| **Payments** | Razorpay UPI sandbox mode |
| **Weather API** | OpenWeatherMap (rain + heat triggers) |
| **AQI API** | AQICN / WAQI (air quality trigger) |
| **CI/CD** | GitHub Actions — auto-deploy on push |

---

## 📱 Platform Decision: Mobile-First PWA + Dual Portal Architecture

**Why PWA over native Android:**
1. Budget Android phones (2–4GB RAM) resist installing new apps
2. Zero Play Store friction — share a link, open in Chrome, done in seconds
3. Works offline for policy details; syncs when reconnected
4. Add-to-homescreen gives near-native feel at zero development overhead

**Why hybrid (PWA for workers, full web for admin):**
The admin fraud review queue and insurer analytics dashboard need desktop screen real estate. The worker flow is 4 screens maximum. A single responsive codebase serves both without maintaining two separate apps.

**Why dual-portal with distinct UX modes:**
The **Worker Portal** uses a strict PWA (Progressive Web App) model — no scrolling, no hover effects, no tap animations. Every animation that looks pretty on a desktop browser causes jank, mis-taps, and confusion on a budget Android phone held in wet hands during a rainstorm. Workers get a fixed, app-like experience that is rock-solid on low-end devices.

The **Admin Portal** uses the full web experience — smooth hover effects, scrollable analytics, animated charts, and rich interactive widgets designed for a desktop insurer monitoring the portfolio.

The same React component library (AnimatedWrapper) adapts its behavior automatically based on the active portal mode — detected via the `.pwa-mode` CSS class on the `<body>` element, propagated reactively through a `useIsPWA()` hook using MutationObserver.

---

## 🏦 Business Viability

### Unit Economics (per worker per week)

| Item | Amount |
|------|--------|
| Average premium collected | ₹49/week |
| Expected trigger rate per worker per week | 18% |
| Average payout per triggered claim | ₹320 |
| Expected payout cost per worker | ₹58/week |
| **Gross margin per worker** | **₹49 − ₹58 = −₹9 (near break-even)** |

The per-worker margin looks tight at small scale by design. **The model runs on pooled zone risk:** in any given week, 82% of workers in a zone experience no qualifying trigger. Their premiums subsidize the 18% who do — which is exactly how parametric insurance works. Initial slightly negative margins are intentional for early-stage user acquisition, with profitability achieved through risk pooling depth and dynamic pricing refinement as zone data matures at scale.

**Financial trajectory:**

| Scale | Weekly Premium Pool | Expected Payouts | Net Position |
|-------|--------------------|--------------------|--------------|
| 10,000 workers | ₹4,90,000 | ₹5,76,000 | −₹86,000 (acquisition phase) |
| 25,000 workers | ₹12,25,000 | ₹12,80,000 | −₹55,000 (nearing break-even) |
| 50,000 workers | ₹24,50,000 | ₹14,08,000 | **+₹10,42,000 (62% margin)** |

Break-even occurs between 25,000–30,000 workers as zone risk pricing precision improves with accumulated data. AQI and heat triggers have materially lower payout rates than rain, improving the blended loss ratio.

### Regulatory Compliance Layer
SafeShift is built compliance-first from Day 1:
- All parametric trigger decisions logged with immutable append-only audit trails
- Full trigger evidence chain stored per claim (raw API response JSON snapshots)
- Worker consent captured with versioned ToS acceptance records
- Architecture aligns with IRDAI Regulatory Sandbox framework for parametric insurance
- One-click compliance export for regulatory review at any point

---

## 🚨 Adversarial Defense & Anti-Spoofing Strategy

> **Market Crash Response:** A coordinated syndicate of 500 delivery workers used GPS-spoofing apps to fake their location inside active weather zones, triggering mass false payouts and draining a competitor's liquidity pool. Simple GPS verification is officially dead. Here is how SafeShift is architecturally immune.

> 💡 **Because no delivery worker should lose their weekly income to an uncontrollable event — and no fraudster should be able to exploit the system that protects them.**

---

### ⚡ Fraud Defense — 3-Line Summary

SafeShift scores every claim across **6 behavioral signals** (not just GPS) to produce a real-time Trust Score. Claims above 70 pay out in under 90 seconds. Claims below 40 go to human review. A dedicated **Ring Detector** runs in parallel to catch coordinated fraud groups via claim timing spikes, GPS coordinate clustering, and device fingerprint reuse. Honest workers are never blocked — flagged claims are silently re-checked every 5 minutes and auto-released the moment signals normalize.

---

### The Core Insight: SafeShift Asks a Different Question

Most parametric platforms ask: *"Is this worker inside the trigger zone?"* — which GPS spoofing answers trivially.

SafeShift asks: **"Is this worker's complete behavioral fingerprint consistent with someone genuinely stranded?"**

That question cannot be answered with a fake GPS coordinate alone.

---

### Layer 1 — The Differentiation: Real Worker vs. Bad Actor

| Signal | Genuine Stranded Worker | GPS Spoofer at Home |
|--------|------------------------|-------------------|
| GPS coordinate jitter | Natural ±3–8m drift even while stationary | Artificially smooth; variance < ±1m |
| Network type | Mobile data, possibly 2G/3G (tower congestion in storms) | Stable Wi-Fi |
| Network signal strength | Degraded — storms affect cell towers | Strong and stable |
| Device accelerometer | Stationary or slow; distinctive road/rain vibration | Stationary; no vibration pattern |
| Platform delivery app | Open and active — worker is on shift | Closed or idle |
| 30-day zone presence | Confirmed GPS check-ins in this zone on prior shifts | Little or no historical presence |
| Battery drain rate | Elevated — GPS active, screen on, poor signal in storm | Normal — home Wi-Fi, screen idle |

**SafeShift's 6-Signal Trust Scorer:**

```
trust_score = weighted_sum([
  gps_jitter_naturalness    × 0.20,
  network_type_match        × 0.15,
  signal_strength_match     × 0.15,
  accelerometer_consistency × 0.15,
  zone_presence_history     × 0.20,
  platform_app_active       × 0.15
])

≥ 70  → Auto-approve; payout in <90 seconds
40–69 → Soft-hold; silent re-check every 5 min (up to 30 min)
< 40  → Human review queue; payout withheld
```

> The scoring weights and signal logic are never exposed to workers. Revealing the methodology teaches bad actors exactly what to simulate next.

---

### Layer 2 — The Data: Catching a Coordinated Ring

A single bad actor is catchable. A ring of 500 coordinating on Telegram leaves unmistakable statistical signatures.

**Signal 1 — Simultaneous Claim Spike ("The Flash Mob Pattern")**

Genuine weather events produce organic claim waves — workers in the worst-hit streets claim first, spreading outward as conditions worsen. A fraud ring receives one Telegram message and 200 workers trigger within 90 seconds. SafeShift monitors **claim arrival rate per zone per minute** against a rolling 4-week baseline. A spike exceeding 3× baseline in under 2 minutes activates Ring Alert Mode — all pending claims in that zone are batched and escalated simultaneously.

**Signal 2 — GPS Coordinate Clustering ("The Teleportation Pattern")**

Spoofing apps anchor to the geographic center of a known flood zone. SafeShift runs **DBSCAN clustering** on all claim GPS coordinates per trigger event. If > 15% of claimants are within a 50m radius in a zone spanning 2 sq km, it is statistically impossible — genuine workers spread across the zone, not clustered at one point.

**Signal 3 — Enrollment Surge ("The Pre-Positioning Pattern")**

Fraud rings must enroll workers in the target zone before the trigger fires. SafeShift tracks zone registration velocity against 4-week averages. A zone seeing 3× normal new enrollments in the 48 hours before a forecast severe weather event flags those new accounts as Elevated Risk — their first claim requires behavioral review, not auto-approval.

**Signal 4 — Device Fingerprint Reuse ("One Phone, Many Accounts")**

SafeShift hashes device fingerprints (User-Agent + screen resolution + timezone + font list) at onboarding. Multiple accounts sharing a fingerprint are silently linked. A claim from any account in the cluster triggers a hold on all linked accounts simultaneously.

**Signal 5 — Cross-Zone Behavioral Inconsistency**

A worker claiming disruption in Zone 4B who has no GPS-confirmed shift presence in Zone 4B over the past 30 days scores near-zero on `zone_presence_history`. Alone, this is explainable (new zone). Combined with other signals, it becomes a strong fraud indicator.

---

### Layer 3 — The UX Balance: Never Punishing Honest Workers

The hardest design problem: **heavy rain is exactly when phones misbehave.** A genuine worker in a storm has degraded GPS, weak signal, and a wet screen — the same signals as a spoofer. A system that blocks everyone during bad weather is worse than no system.

**SafeShift's answer: the "Grace and Verify" principle.**

**Rule 1 — Presumption of innocence for established workers.**
Any worker with ≥ 4 weeks of verified zone presence history receives a trust buffer — their auto-approve threshold drops from 70 to 50. They have already proven they are real.

**Rule 2 — Soft-hold, never rejection.**
A flagged claim (score 40–69) is never shown as rejected. The worker sees:
> *"Your payout is processing. Expected in 15 minutes."*
The system silently re-checks every 5 minutes. Most genuine workers clear within 15 minutes as conditions stabilize and signals normalize.

**Rule 3 — Human review has a hard time cap.**
Any claim in human review for > 2 hours auto-escalates. The worker receives:
> *"We're reviewing your claim due to unusual system conditions today. You'll hear within 2 hours. If verified, your payout includes a ₹25 delay compensation."*

**Rule 4 — Mass Disruption Override.**
If a trigger is confirmed severe (rainfall > 50mm/hr; IMD red alert issued) AND > 40% of zone workers are claiming simultaneously, SafeShift activates Mass Disruption Mode: trust thresholds drop to 35, all payouts are processed immediately, and forensic review runs post-event for recovery actions. It is better to pay 5 fraudulent claims in a genuine catastrophe than to deny 50 honest ones.

**Rule 5 — Transparent appeal, no accusation.**
Any ultimately rejected claim receives:
> *"We couldn't verify your location during the disruption. Tap here to raise a review — a photo or short note helps us resolve this faster."*
No fraud language. Genuine workers respond. Ghost accounts don't.

---

### Ring Detection Flow

```
TRIGGER FIRES IN ZONE
        │
        ▼
 Claim arrival rate > 3× baseline in 2 min?
        ├── YES ──▶ RING ALERT MODE (all claims batched + escalated)
        └── NO
                │
                ▼
         6-Signal Trust Scorer (per claim, <15 sec)
                ├── Score ≥ 70  ──▶ Auto-approve → payout <90 sec
                ├── Score 40–69 ──▶ Soft-hold → silent re-check /5 min
                └── Score < 40  ──▶ Human review queue
                        │
                        ▼
                Ring Pattern Detector (async batch)
                ├── DBSCAN GPS clustering
                ├── Device fingerprint match
                └── Enrollment surge check
                        │
                 Ring confirmed?
                ├── YES ──▶ Hold all linked claims + account suspension
                └── NO  ──▶ Individual trust score decisions stand
```

**The bottom line:** SafeShift doesn't just check *where* you are. It checks *whether everything about your situation is consistent with being there.* A fraudster can fake a GPS coordinate in 30 seconds. They cannot simultaneously fake their network behavior, device motion sensors, 30-day zone presence history, and platform app activity — not at the scale required to drain a liquidity pool.

---

## 🗓️ Development Plan

### Phase 1 (March 20) — ✅ Foundation Complete
- [x] Idea document and README
- [x] Full system architecture designed
- [x] Adversarial defense & anti-spoofing strategy documented
- [x] Tech stack finalized
- [x] GitHub repo structure initialized
- [x] Basic React PWA scaffold
- [x] Database schema

---

### 📁 Repository Structure

```
safeshift/                           # Root repo
├── safeshift/                       # Main project directory
│   │
│   ├── frontend/                    # React PWA (Vite)
│   │   ├── public/
│   │   │   ├── manifest.json        # PWA manifest — add to homescreen
│   │   │   └── sw.js                # Workbox service worker (offline support)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Register.jsx     # New worker registration + PWA mode enforced
│   │   │   │   ├── Login.jsx        # OTP-based login + Worker/Admin portal switch
│   │   │   │   ├── Onboarding.jsx   # Multi-step: zone + shift + UPI ID
│   │   │   │   ├── WorkerDashboard.jsx  # Live coverage + payout feed + storytelling overlay
│   │   │   │   ├── PolicyShop.jsx   # AI-priced Basic/Standard/Pro tiers
│   │   │   │   ├── ClaimHistory.jsx # Claims log with trust score badges
│   │   │   │   ├── PayoutNotification.jsx  # 90-second payout alert
│   │   │   │   ├── ConsentScreen.jsx # GDPR-style consent capture
│   │   │   │   ├── Profile.jsx      # Worker profile + logout
│   │   │   │   └── AdminDashboard.jsx  # Insurer: fraud queue + zone heatmap + recharts
│   │   │   ├── components/
│   │   │   │   ├── AppShell.jsx          # PWA shell: PageHeader + BottomTabBar; enforces no-scroll for workers
│   │   │   │   ├── AnimatedWrapper.jsx   # Framer-motion wrappers; PWA-aware via useIsPWA() hook
│   │   │   │   ├── ThreeBackground.jsx   # Three.js particle mesh on auth pages; disabled in PWA
│   │   │   │   ├── ThemeToggle.jsx      # Dark/light theme switch persisted to localStorage
│   │   │   │   ├── ZoneHeatmap.jsx      # Color-coded zone risk grid + Recharts integration
│   │   │   │   ├── PlanCard.jsx         # Tier pricing card with animated CTA
│   │   │   │   ├── FraudQueue.jsx       # Admin: sortable fraud claim table
│   │   │   │   ├── PayoutRow.jsx        # Single payout history row
│   │   │   │   ├── ZoneBadge.jsx        # Zone risk level badge
│   │   │   │   └── EnhancedGlassDemo.jsx # Dev/test glassmorphism showcase
│   │   │   ├── context/
│   │   │   │   └── ThemeContext.jsx      # Global dark/light theme provider
│   │   │   ├── hooks/
│   │   │   │   ├── useGlassmorphism.js  # Glass class + style generator; performance-aware
│   │   │   │   ├── usePolicyStatus.js    # Polling hook for live policy state
│   │   │   │   └── useConfig.js          # App configuration hook
│   │   │   ├── services/
│   │   │   │   └── api.js           # Axios client: JWT interceptors, role-aware auth
│   │   │   ├── utils/
│   │   │   │   ├── animations.js     # Framer-motion variants: page, card, stagger, modal
│   │   │   │   ├── glassmorphismCompat.js  # Backdrop-filter support detection
│   │   │   │   ├── performanceMonitor.js    # FPS watchdog → auto-degrade glass effects
│   │   │   │   └── themeEnhancer.js        # Dynamic CSS variable bindings for Tailwind
│   │   │   ├── styles/
│   │   │   │   ├── glassmorphism.css  # Full glassmorphism design system (1274 lines)
│   │   │   │   └── README.md          # Design system documentation
│   │   │   ├── App.jsx               # Router: worker routes in AppShell; admin standalone
│   │   │   ├── main.jsx
│   │   │   └── index.css             # Design tokens, PWA mode CSS, scroll locks, native icon hiding
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── server/                      # Node.js + Express API
│   │   ├── routes/
│   │   │   ├── auth.js              # Register, OTP login, device fingerprint
│   │   │   ├── policies.js          # Create / renew / cancel policy
│   │   │   ├── claims.js            # Trigger → fraud check → payout pipeline
│   │   │   ├── triggers.js          # BullMQ job definitions + simulate endpoint
│   │   │   └── admin.js             # Insurer analytics + fraud queue endpoints
│   │   ├── services/
│   │   │   ├── triggerMonitor.js    # Polls all 5 triggers every 5 min (8 zones)
│   │   │   ├── fraudScorer.js       # 6-signal trust score calculator
│   │   │   ├── ringDetector.js      # DBSCAN + enrollment surge + device fingerprint
│   │   │   ├── payoutService.js     # Razorpay sandbox UPI payout integration
│   │   │   └── retrainingScheduler.js  # Sunday 10PM ML model retraining job
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT authentication middleware
│   │   ├── db/
│   │   │   ├── schema.sql           # Full PostgreSQL schema (6 tables)
│   │   │   └── init.js              # DB initializer / migration runner
│   │   ├── data/                    # SQLite local DB (dev/demo)
│   │   │   └── safeshift.db         # SQLite database file
│   │   ├── package.json
│   │   └── server.js                # Express app entry point
│   │
│   ├── ml/                          # Python Flask ML microservice
│   │   ├── models/
│   │   │   ├── premium_model.pkl    # XGBoost — zone risk scoring (4.5KB)
│   │   │   └── fraud_model.pkl      # Isolation Forest — anomaly detection (318KB)
│   │   ├── train/
│   │   │   ├── train_premium.py     # XGBoost training on zone + seasonal features
│   │   │   └── train_fraud.py       # Isolation Forest unsupervised anomaly training
│   │   ├── app.py                   # Flask endpoints: /score, /fraud-check
│   │   └── requirements.txt
│   │
│   ├── .github/
│   │   └── workflows/
│   │       └── deploy.yml           # GitHub Actions CI/CD pipeline
│   ├── package.json                 # Root-level scripts
│   └── .env.example                 # All required env vars documented
│
├── .gitignore
├── LICENSE
└── README.md
```

---

### 🗄️ Database Schema

```sql
-- Workers table
CREATE TABLE workers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(15) UNIQUE NOT NULL,
  name            VARCHAR(100) NOT NULL,
  platform        VARCHAR(50) NOT NULL,          -- zepto / blinkit / swiggy
  zone_id         VARCHAR(20) NOT NULL,           -- e.g. "KOR-4B"
  zone_pincode    VARCHAR(10) NOT NULL,
  shift_start     TIME NOT NULL,                  -- declared active hours start
  shift_end       TIME NOT NULL,                  -- declared active hours end
  upi_id          VARCHAR(100) NOT NULL,
  device_hash     VARCHAR(64),                    -- fingerprint for fraud detection
  trust_history   JSONB DEFAULT '[]',             -- rolling 4-week zone presence log
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Policies table
CREATE TABLE policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID REFERENCES workers(id),
  tier            VARCHAR(20) NOT NULL,           -- basic / standard / pro
  premium_inr     INTEGER NOT NULL,               -- 29 / 49 / 79
  coverage_inr    INTEGER NOT NULL,               -- 500 / 900 / 1500
  week_start      DATE NOT NULL,
  week_end        DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'active',   -- active / expired / cancelled
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger events table
CREATE TABLE trigger_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         VARCHAR(20) NOT NULL,
  trigger_type    VARCHAR(30) NOT NULL,           -- rain / aqi / heat / closure / shutdown
  triggered_at    TIMESTAMPTZ NOT NULL,
  api_payload     JSONB NOT NULL,                 -- raw API response snapshot (immutable audit)
  threshold_value NUMERIC NOT NULL,               -- e.g. 18.4 (mm/hr)
  threshold_unit  VARCHAR(20) NOT NULL,           -- mm/hr / AQI / celsius
  resolved_at     TIMESTAMPTZ
);

-- Claims table
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID REFERENCES workers(id),
  policy_id       UUID REFERENCES policies(id),
  trigger_id      UUID REFERENCES trigger_events(id),
  trust_score     INTEGER NOT NULL,               -- 0–100 from 6-signal scorer
  trust_signals   JSONB NOT NULL,                 -- breakdown of all 6 signals
  status          VARCHAR(20) DEFAULT 'pending',  -- pending / approved / soft_hold / flagged / rejected
  payout_inr      INTEGER,
  payout_ref      VARCHAR(100),                   -- Razorpay payment reference
  paid_at         TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, trigger_id)                   -- hard duplicate prevention
);

-- Fraud flags table
CREATE TABLE fraud_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id        UUID REFERENCES claims(id),
  worker_id       UUID REFERENCES workers(id),
  flag_type       VARCHAR(50) NOT NULL,           -- gps_cluster / device_reuse / enrollment_surge / flash_mob
  flag_detail     JSONB NOT NULL,                 -- evidence payload
  resolved        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Zone risk scores table (updated weekly by ML model)
CREATE TABLE zone_risk_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id         VARCHAR(20) NOT NULL,
  week_start      DATE NOT NULL,
  risk_score      INTEGER NOT NULL,               -- 0–100
  premium_basic   INTEGER NOT NULL,               -- computed weekly premium per tier
  premium_std     INTEGER NOT NULL,
  premium_pro     INTEGER NOT NULL,
  model_version   VARCHAR(20),
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, week_start)
);
```

---

### Phase 2 (March 21 – April 4) — ✅ Core Build Complete

#### 🖥️ Frontend (React PWA — Vite)
- [x] **Worker Registration** (`Register.jsx`) — Phone + name + platform + zone + shift hours + UPI ID onboarding flow
- [x] **Worker Login** (`Login.jsx`) — OTP-based authentication screen
- [x] **Multi-step Onboarding** (`Onboarding.jsx`) — Zone selection, shift declaration, eKYC step
- [x] **Worker Dashboard** (`WorkerDashboard.jsx`) — Live coverage status, weekly payout summary, recent payout history feed
- [x] **Policy Shop** (`PolicyShop.jsx`) — AI-priced Basic / Standard / Pro tier cards with zone risk score display
- [x] **Claim History** (`ClaimHistory.jsx`) — Full claims log with trust score badges and payout status
- [x] **Payout Notification** (`PayoutNotification.jsx`) — Real-time 90-second payout alert screen
- [x] **Admin Dashboard** (`AdminDashboard.jsx`) — Insurer panel: loss ratios, fraud queue, zone heatmap, event log
- [x] **Reusable Components** — `CoverageBanner`, `PayoutRow`, `PlanCard`, `ZoneBadge`, `FraudQueue`
- [x] **API Service Layer** (`services/api.js`) — Centralized Axios client for all backend endpoints
- [x] **`usePolicyStatus` Hook** — Polling hook for live policy and coverage state

#### ⚙️ Backend (Node.js + Express)
- [x] **Auth Routes** (`routes/auth.js`) — Register, OTP login, device fingerprint capture, eKYC
- [x] **Policy Routes** (`routes/policies.js`) — Create weekly policy, renew, cancel, fetch active policy
- [x] **Claims Routes** (`routes/claims.js`) — Auto-claim pipeline: trigger → fraud check → payout initiation
- [x] **Triggers Routes** (`routes/triggers.js`) — BullMQ job definitions + manual simulate endpoint
- [x] **Admin Routes** (`routes/admin.js`) — Fraud queue management, zone analytics, insurer overview
- [x] **Trigger Monitor Service** (`services/triggerMonitor.js`) — Polls **all 5 triggers** every 5 min across 8 zones:
  - Rain via OpenWeatherMap API (≥15mm/hr threshold)
  - Heat via OpenWeatherMap API (≥45°C feels-like)
  - AQI via AQICN/WAQI API (≥400 threshold)
  - Dark Store Closure (mock + simulation endpoint)
  - Platform Shutdown (mock + admin-flagged)
- [x] **6-Signal Fraud Scorer** (`services/fraudScorer.js`) — Full weighted trust score engine:
  - GPS jitter analysis (zone boundary matching, ±radius check)
  - Network type consistency (cell vs. Wi-Fi signal matching)
  - Signal strength realism (dBm range analysis)
  - Accelerometer / movement detection (GPS delta movement)
  - Zone presence history (rolling 30-day check-in count)
  - Platform delivery app activity (recent check-in timestamp)
  - Ring pattern early detection hook (device hash)
- [x] **Ring Detector Service** (`services/ringDetector.js`) — DBSCAN GPS clustering, device fingerprint reuse detection, enrollment surge monitoring
- [x] **Payout Service** (`services/payoutService.js`) — Razorpay sandbox integration for simulated UPI payouts
- [x] **ML Retraining Scheduler** (`services/retrainingScheduler.js`) — Sunday 10 PM automated model retraining job
- [x] **Database Schema** (`db/schema.sql`) — Full PostgreSQL schema: workers, policies, trigger_events, claims, fraud_flags, zone_risk_scores

#### 🤖 ML Microservice (Python / Flask)
- [x] **XGBoost Premium Model** — Trained and serialized (`models/premium_model.pkl`, 4.5KB)
- [x] **Isolation Forest Fraud Model** — Trained and serialized (`models/fraud_model.pkl`, 318KB)
- [x] **Premium Training Script** (`train/train_premium.py`) — XGBoost training on zone risk + seasonal + historical features
- [x] **Fraud Training Script** (`train/train_fraud.py`) — Isolation Forest unsupervised anomaly training on 6-signal feature set
- [x] **ML API** (`app.py`) — Flask endpoints: `/score` (premium calculation) and `/fraud-check` (anomaly scoring)

#### 🔄 DevOps & CI/CD
- [x] **GitHub Actions Pipeline** (`.github/workflows/deploy.yml`) — Auto-deploy on push to main
- [x] **`.env.example`** — All environment variables documented (OpenWeather, AQICN, Razorpay, DB, Redis)
- [x] **`.gitignore`** — Properly excludes `node_modules`, `.env`, `.pkl` model files, logs

### Phase 3 (April 5–17) — Scale & Polish

#### ✅ Frontend Phase-3 Enhancements

**Dual-Portal Architecture (PWA Worker + Web Admin)**
- [x] **`.pwa-mode` CSS System** — Strict PWA lock in `index.css`: `overflow: hidden`, `touch-action: none`, `height: 100vh / -webkit-fill-available`, scrollbar suppression, and `user-select: none` on all elements except inputs
- [x] **`useIsPWA()` Reactive Hook** (`components/AnimatedWrapper.jsx`) — Uses `MutationObserver` on `document.body` to watch for `.pwa-mode` class changes and broadcast portal-mode state reactively to all animated components
- [x] **AnimatedWrapper — PWA-Aware Components** — All wrapped components (`AnimatedPage`, `AnimatedCard`, `AnimatedButton`, `AnimatedListItem`, `AnimatedIcon`) automatically disable `whileHover` and `whileTap` framer-motion animations when `isPWA === true`
- [x] **AppShell Scroll Lock** (`components/AppShell.jsx`) — Worker portal `main` element uses `overflow-hidden` (no scrolling); Admin portal uses `overflow-y-auto` (full scrolling)
- [x] **Login Portal Switch** (`pages/Login.jsx`) — `useEffect` toggles `.pwa-mode` on `<body>` as user switches between Worker/Admin segmented control, changing the entire page's UX mode before login
- [x] **Register PWA Enforcement** (`pages/Register.jsx`) — `useEffect` unconditionally adds `.pwa-mode` on mount (Register is worker-only)
- [x] **Admin Dashboard — Full Web Experience** — All admin cards, charts, fraud queue rows, and tab navigation use standard browser scroll and hover behaviors

**UI Polish & Accessibility**
- [x] **Framer Motion Animations** — `AnimatedPage`, `AnimatedCard`, `AnimatedButton`, `AnimatedText`, `AnimatedList`, `AnimatedListItem` — orchestrate entrance animations, stagger delays, and scroll-triggered reveals across all pages
- [x] **Three.js 3D Background** — `ThreeBackground.jsx` renders an animated particle/shield mesh on the login/register/auth pages for visual brand differentiation; automatically disabled for PWA mode for performance
- [x] **Glassmorphism Design System** (`styles/glassmorphism.css`) — Comprehensive CSS variable system for frosted-glass UI effects with full dark/light theme adaptation, browser compatibility detection, and performance degradation fallbacks
- [x] **ThemeContext** (`context/ThemeContext.jsx`) — Global dark/light theme toggle persisted to `localStorage`, affecting all CSS custom properties in real-time
- [x] **`useGlassmorphism()` Hook** (`hooks/useGlassmorphism.js`) — Dynamic glass class selection with performance monitoring, backdrop-filter support detection, and reduced-motion preference respect
- [x] **Performance Monitor** (`utils/performanceMonitor.js`) — Frames-per-second watchdog that automatically degrades glassmorphism effects when FPS drops below 30 on low-end devices
- [x] **Theme Enhancer** (`utils/themeEnhancer.js`) — Enhances Tailwind CSS with dynamic CSS variable bindings for seamless dark/light mode transitions

**Authentication & Form Polish**
- [x] **Password Visibility Toggle** — Robust eye icon (Lucide `Eye`/`EyeOff`) with `z-index: 30` absolute positioning, `e.preventDefault()` / `e.stopPropagation()` to block browser native reveal interference, and `aria-label` for accessibility
- [x] **Native Browser Icon Suppression** (`index.css`) — `::-ms-reveal`, `::-webkit-reveal`, `::-webkit-clear-button`, `::-webkit-credentials-auto-fill-button`, `::-webkit-contacts-auto-fill-button` all forced to `display: none !important; width: 0; height: 0` to prevent native password UI from conflicting with custom eye toggle
- [x] **Phone Input Digit Filtering** — `onChange` strips non-digit characters and caps at 10 digits; `+91` prefix visually rendered but never submitted
- [x] **Password Strength Meter** — 4-segment animated bar + rule checklist (length ≥ 8, uppercase, number, special char) on Register form

**Worker Portal UI Components**
- [x] **Zone Heatmap** (`components/ZoneHeatmap.jsx`) — Color-coded zone risk visualization using CSS grid with Recharts integration for trend lines
- [x] **Storytelling Overlay** — "How SafeShift Works" 5-step guided modal on Worker Dashboard with animated step cards; dismissable once per session
- [x] **Live Weather Pills** — Real-time weather condition chips (Rain, AQI, Temp, Feels-like) pulled from `/api/triggers/live-conditions/:zone_id` with conditional tint coloring on dangerous values
- [x] **Trigger Simulation** — One-tap simulation of all 5 trigger types from Worker Dashboard for demo purposes

**Admin Portal UI Components**
- [x] **Fraud Queue Panel** — Tabular claim review with approve/reject actions, claim detail expansion, and trust score badge coloring (green/amber/red)
- [x] **Recharts Integration** — `BarChart`, `LineChart`, `PieChart`, `AreaChart` for loss ratio trends, payout history, zone analytics, and trigger event timelines
- [x] **KPI Cards** — Animated metric cards with live counters, percentage change indicators, and glassmorphism card styling
- [x] **Trigger Simulation Console** — Admin-accessible trigger simulation panel for demo and testing

#### ✅ Backend Phase-3 Enhancements
- [x] **Full Isolation Forest fraud anomaly detection** — Operational in `services/fraudScorer.js`
- [x] **Ring detection** (DBSCAN + enrollment surge + device fingerprint) — Operational in `services/ringDetector.js`
- [x] **All 5 parametric triggers live** — Rain, AQI, Heat, Dark Store Closure, Platform Shutdown all operational
- [x] **Worker dashboard with zone risk heatmap** — Zone risk data exposed via `/api/admin/zone-analytics`
- [x] **Admin/insurer analytics panel** — Full KPI dashboard, loss ratio trends, fraud queue management
- [x] **Mass Disruption Mode** — Automatic threshold relaxation when >40% of zone workers claim simultaneously during confirmed severe events
- [x] **5-minute demo video** — [Google Drive Link](https://drive.google.com/file/d/1zz-yuvQiXDUXV6Kw7jli5TPDJxtmQy0Z/view?usp=sharing)
- [x] **Final pitch deck** — [PDF Submitted]

---

## 🌟 What Makes SafeShift Different

| Dimension | Industry Standard | SafeShift |
|-----------|------------------|-----------|
| Trigger granularity | City or district level | 2km micro-zone level |
| Claim process | Worker files a claim | Zero worker action required |
| Fraud defense | GPS check only | 6-signal behavioral fingerprint + ring detection |
| Premium cycle | Annual or monthly | Weekly — matches gig income cycle exactly |
| Persona focus | Generic delivery workers | Q-commerce only — highest-impact, least-served |
| Payout speed | Days to weeks | Under 90 seconds |
| Compliance | Bolt-on | Built in from Day 1 with immutable audit trail |

---

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9 *(optional — only needed for ML microservice)*
- ⚡ **No database installation required** — SQLite runs out of the box

### Step 1 — Install Dependencies

```bash
# Install server dependencies
cd safeshift/server
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2 — Start the Backend Server

```bash
cd safeshift/server
npm run dev
```
✅ Server runs at **http://localhost:4000**
✅ SQLite database auto-created at `server/data/safeshift.db`
✅ Demo data (worker + admin + policies + claims) seeded automatically

### Step 3 — Start the Frontend

```bash
cd safeshift/frontend
npm run dev
```
✅ Frontend runs at **http://localhost:5173**

### Step 4 — *(Optional)* Start the ML Service

```bash
cd safeshift/ml
pip install -r requirements.txt
python app.py
```
✅ ML service runs at **http://localhost:8000**
> The app works without the ML service — it falls back to rule-based pricing.

---

## 🔑 Demo Credentials

| Role | Phone Number | Password | What You'll See |
|------|-------------|----------|-----------------|
| **Worker** | `9876543210` | `demo123` | Worker dashboard, policy shop, claim history, payouts |
| **Admin** | `9999999999` | `admin123` | Insurer dashboard, KPIs, fraud queue, zone analytics |

> 💡 Click the **"Demo Worker"** or **"Demo Admin"** buttons on the login page to auto-fill credentials.

---

## 🔧 API Reference

### 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Worker login with phone + password |
| `POST` | `/api/auth/admin/login` | Admin login with phone + password |
| `POST` | `/api/auth/register` | Register new worker account |
| `GET`  | `/api/auth/me` | Get current user profile |
| `POST` | `/api/auth/ekyc` | Aadhaar eKYC verification (mock) |

### 📋 Policies

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/policies/quote` | Get AI-driven premium quote for zone |
| `POST` | `/api/policies/create` | Purchase a weekly policy |
| `GET`  | `/api/policies/active` | Get worker's current active policy |
| `GET`  | `/api/policies/history` | Get worker's policy history |
| `POST` | `/api/policies/:id/cancel` | Cancel an active policy |

### 📑 Claims

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claims/process` | Process claims for a trigger event |
| `GET`  | `/api/claims/my` | Get worker's claim history |
| `GET`  | `/api/claims/all` | Admin: get all claims (filterable) |
| `POST` | `/api/claims/:id/review` | Admin: approve or reject a claim |
| `POST` | `/api/claims/:id/recheck` | Re-evaluate a soft-held claim |

### 🌦️ Triggers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/triggers/zones` | Get all zones with risk levels |
| `POST` | `/api/triggers/simulate` | Simulate a trigger event (demo) |
| `POST` | `/api/triggers/checkin` | Worker GPS check-in |

### 📊 Admin Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/admin/dashboard` | KPI metrics (premiums, payouts, loss ratio) |
| `GET`  | `/api/admin/loss-ratio` | Weekly loss ratio trend data |
| `GET`  | `/api/admin/fraud-queue` | Claims pending fraud review |
| `GET`  | `/api/admin/zone-analytics` | Zone-level risk & claims analytics |

---

## 💾 Database Design

SafeShift uses **SQLite** via `better-sqlite3` for persistent storage.

**Why SQLite?**
- ✅ Zero configuration — no server to install
- ✅ Single file — `server/data/safeshift.db`
- ✅ Auto-initialized on first run with schema + demo data
- ✅ Data persists across server restarts

### Schema Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `workers` | Worker profiles | phone, password_hash, name, platform, zone_id, upi_id |
| `admins` | Admin accounts | phone, password_hash, name |
| `policies` | Weekly insurance policies | worker_id, tier, premium_inr, coverage_inr, status |
| `claims` | Parametric claim records | worker_id, trigger_id, trust_score, status, payout_inr |
| `trigger_events` | Weather/hazard trigger events | zone_id, trigger_type, threshold_value |
| `fraud_flags` | Fraud detection flags | claim_id, flag_type, flag_detail, resolved |
| `zone_risk_scores` | ML-computed zone risk data | zone_id, risk_score, premium tiers |

---

## 🔐 Authentication & Security

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | bcryptjs with 10 salt rounds |
| **Token System** | JWT with 7-day expiry |
| **Role-Based Access** | Worker and Admin roles |
| **Route Protection** | Bearer token middleware on all protected routes |
| **Duplicate Prevention** | Unique phone constraint prevents duplicate accounts |

### Auth Flow

```
Worker/Admin opens app
        │
        ▼
  Enter Phone + Password
        │
        ▼
  Server validates credentials (bcrypt compare)
        │
        ├── ✅ Valid → Issue JWT token → Redirect to Dashboard
        │
        └── ❌ Invalid → Show error message
```

---

## 🤖 ML & AI Components

### Risk Scoring Engine
- **Algorithm:** XGBoost (Gradient Boosting)
- **Features:** Zone base risk, season, claims history, zone density, infrastructure score, forecast severity
- **Output:** Risk score (0–100) → dynamic premium tier (Basic / Standard / Pro)
- **Retraining:** Every Sunday at 10 PM before new policy cycle

### 6-Signal Trust Engine

| Signal | Weight | What It Checks |
|--------|--------|----------------|
| GPS Jitter | 20% | Location consistency — natural vs. spoofed drift |
| Network Match | 15% | Cell tower type matches expected storm conditions |
| Signal Strength | 15% | dBm range consistent with outdoor/storm environment |
| Accelerometer | 15% | Movement patterns (riding vs. suspiciously stationary) |
| Zone History | 20% | 30-day confirmed GPS check-ins in this zone |
| Platform Active | 15% | Delivery app was open and active during shift |

### Fraud Detection
- **Isolation Forest:** Unsupervised anomaly detection — no labelled fraud examples needed
- **Ring Detection:** DBSCAN clustering to find coordinated claim groups
- **Device Sharing:** Multiple workers using same device hash flagged and silently linked
- **Enrollment Surge:** 3× spike in zone registrations in 48h before a forecast event → elevated-risk flag
- **Flash Mob Pattern:** Claim arrival rate > 3× zone baseline in under 2 min → Ring Alert Mode

---

## 📱 User Flows

### Worker Flow
```
Register → Login → View Dashboard → Buy Policy → Trigger Occurs →
Auto Claim → Trust Score Check → UPI Payout (< 90 sec)
```

### Admin Flow
```
Login → View KPIs → Monitor Loss Ratio → Review Fraud Queue →
Approve/Reject Flagged Claims → Analyze Zone Risk
```

### Claim Pipeline
```
Trigger Event (Rain / AQI / Heat / Closure / Shutdown)
        │
        ▼
Find Active Policies in Affected Zone
        │
        ▼
Run 6-Signal Trust Scoring (< 15 sec per claim)
        │
        ├── Score ≥ 70 → ✅ Auto-Approve → UPI Payout (< 90 sec)
        ├── Score 40–69 → ⏸️ Soft Hold → Silent re-check every 5 min
        └── Score < 40  → 🚩 Flagged → Admin Review Queue
```

---

---
 
## 📦 Phase 1 Submission Checklist
 
| Item | Status | Link |
|------|--------|------|
| README.md in GitHub repo | ✅ Submitted | [https://github.com/ssomasekhar018/safeshift_team_mj5](https://github.com) |
| 2-minute strategy video | ✅ Submitted | [https://drive.google.com/file/d/14caiuheXJxX-Qme1j0BKmaAhlhDH9Wna/view?usp=drivesdk] |
| Figma prototype (Try It Out) | ✅ Live | [https://build-pixel-63412272.figma.site/] |
| Adversarial Defense section | ✅ Included | See section above |
| Market Crash compliance | ✅ Addressed | Immutable audit trail + IRDAI alignment |
 
---

## 📦 Phase 2 Submission Checklist

| Item | Status | Notes |
|------|--------|-------|
| Try It Out Link (Live Demo) | ✅ Live | [https://safeshift-team-mj5.vercel.app/](https://safeshift-team-mj5.vercel.app/) |
| Demo Video | ✅ Submitted | [Google Drive Link](https://drive.google.com/file/d/1zz-yuvQiXDUXV6Kw7jli5TPDJxtmQy0Z/view?usp=sharing) |
| Worker Registration & OTP Login | ✅ Complete | `Register.jsx` + `Login.jsx` + `routes/auth.js` |
| Multi-step Onboarding (eKYC + zone + shift) | ✅ Complete | `Onboarding.jsx` — zone selection, shift hours, UPI ID |
| Worker Dashboard (live coverage + payouts) | ✅ Complete | `WorkerDashboard.jsx` — real-time policy + payout feed |
| Policy Shop with AI-priced tiers | ✅ Complete | `PolicyShop.jsx` — Basic/Standard/Pro with zone risk score |
| Claim History screen | ✅ Complete | `ClaimHistory.jsx` — trust score badges + payout status |
| Payout Notification screen | ✅ Complete | `PayoutNotification.jsx` — 90-second alert flow |
| Admin / Insurer Dashboard | ✅ Complete | `AdminDashboard.jsx` — fraud queue, zone heatmap, loss ratios |
| All 5 Parametric Triggers (Rain, AQI, Heat, Closure, Shutdown) | ✅ Complete | `services/triggerMonitor.js` — polls every 5 min across 8 zones |
| 6-Signal Fraud Trust Scorer | ✅ Complete | `services/fraudScorer.js` — GPS, network, signal, accel, zone history, platform active |
| Ring Detector (DBSCAN + device fingerprint + enrollment surge) | ✅ Complete | `services/ringDetector.js` |
| Razorpay Sandbox Payout Flow | ✅ Complete | `services/payoutService.js` — simulated UPI credits |
| XGBoost Premium Model (trained + serialized) | ✅ Complete | `ml/models/premium_model.pkl` |
| Isolation Forest Fraud Model (trained + serialized) | ✅ Complete | `ml/models/fraud_model.pkl` |
| ML Flask API (`/score` + `/fraud-check`) | ✅ Complete | `ml/app.py` |
| Full PostgreSQL Schema | ✅ Complete | `server/db/schema.sql` — 6 tables with audit trail |
| GitHub Actions CI/CD Pipeline | ✅ Complete | `.github/workflows/deploy.yml` |
| GitHub Repo | ✅ Live | [github.com/ssomasekhar018/safeshift_team_mj5](https://github.com/ssomasekhar018/safeshift_team_mj5) |

---

## 📦 Phase 3 Submission Checklist

| Item | Status | Notes |
|------|--------|-------|
| **Dual-Portal Architecture** — PWA Worker + Web Admin separation | ✅ Complete | `.pwa-mode` CSS class, `useIsPWA()` hook, AnimatedWrapper PWA-awareness |
| **AnimatedWrapper** — PWA-aware framer-motion components | ✅ Complete | `AnimatedPage/Crad/Card/Button/Text/List/ListItem/Icon` — hover/tap disabled in PWA |
| **Three.js 3D Background** on auth pages | ✅ Complete | `ThreeBackground.jsx` — particle mesh; disabled in PWA for performance |
| **Glassmorphism Design System** — CSS variable system (1274 lines) | ✅ Complete | `styles/glassmorphism.css` + `useGlassmorphism.js` hook |
| **ThemeContext** — Dark/light theme with localStorage persistence | ✅ Complete | `context/ThemeContext.jsx` — live CSS variable swap |
| **Performance Monitor** — FPS watchdog with auto-degrade | ✅ Complete | `utils/performanceMonitor.js` |
| **AppShell** — PWA shell with no-scroll enforcement | ✅ Complete | `components/AppShell.jsx` — BottomTabBar + PageHeader; `overflow-hidden` for workers |
| **Login Portal Switch** — Worker/Admin segmented control | ✅ Complete | `pages/Login.jsx` — `.pwa-mode` toggled on body before login |
| **Register PWA Enforcement** | ✅ Complete | `pages/Register.jsx` — unconditionally applies `.pwa-mode` |
| **Password Visibility Toggle** — Fixed eye icon with native browser suppression | ✅ Complete | `index.css` — all `::-webkit-reveal/::-ms-reveal` hidden; `z-index: 30` on button |
| **Phone Input Digit Filtering** | ✅ Complete | `Login.jsx` + `Register.jsx` — strips non-digits, caps at 10 |
| **Password Strength Meter** | ✅ Complete | `Register.jsx` — animated 4-bar + rule checklist |
| **ConsentScreen** — GDPR-style consent capture | ✅ Complete | `pages/ConsentScreen.jsx` — worker must accept before dashboard |
| **Profile Page** — Worker profile + logout | ✅ Complete | `pages/Profile.jsx` |
| **Storytelling Overlay** — "How SafeShift Works" 5-step guided modal | ✅ Complete | `WorkerDashboard.jsx` — animated step cards, dismissable once |
| **Live Weather Pills** — Real-time conditions from API | ✅ Complete | `WorkerDashboard.jsx` — Rain/AQI/Temp/Feels-like with conditional tint |
| **Zone Heatmap** — Color-coded zone risk visualization | ✅ Complete | `components/ZoneHeatmap.jsx` — CSS grid + Recharts trend lines |
| **Trigger Simulation Console** (Worker + Admin) | ✅ Complete | One-tap simulation of all 5 triggers for demo |
| **Fraud Queue Panel** — Sortable table with approve/reject | ✅ Complete | `AdminDashboard.jsx` + `components/FraudQueue.jsx` — trust score color badges |
| **Recharts Integration** — Bar/Line/Pie/Area charts | ✅ Complete | `AdminDashboard.jsx` — loss ratios, payout trends, zone analytics |
| **KPI Animated Cards** — Live counters + change indicators | ✅ Complete | `AdminDashboard.jsx` — glassmorphism cards with stagger animations |
| **GitHub Repo** | ✅ Live | [github.com/ssomasekhar018/safeshift_team_mj5](https://github.com/ssomasekhar018/safeshift_team_mj5) |

---

*Built for Guidewire DEVTrails 2026 · Team MJ5 · SRMAP University*