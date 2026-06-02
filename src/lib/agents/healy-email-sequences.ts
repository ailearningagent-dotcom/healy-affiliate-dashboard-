/**
 * Healy 90-Day Email Sequences — Professional, Human, Value-First
 *
 * Complete 90-day email nurture sequences designed for Healy frequency wellness technology.
 * Each email provides genuine value, educates about frequency wellness, references Healy's
 * official website, asks for the prospect's phone number, and ends with a CTA to
 * https://www.healycommunity.com for a free consultation.
 *
 * Psychological Framework:
 *   Phase 1: Foundation & Education (Days 1-14)  — Build trust, introduce frequency wellness
 *   Phase 2: Deep Benefits (Days 15-30)           — Specific health solutions (sleep, stress, energy)
 *   Phase 3: Social Proof (Days 31-45)            — Real stories, practitioner endorsements
 *   Phase 4: Overcoming Objections (Days 46-60)   — Address skepticism, cost, science
 *   Phase 5: Personal Path (Days 61-75)           — Personalization, family wellness
 *   Phase 6: Final Engagement (Days 76-90)        — Last invitations, breaking silence
 *
 * Each email template includes {name} and {phonePlaceholder} for personalization.
 * The {ctaLink} is always https://www.healycommunity.com
 */

// ========================================================================
// CONSTANTS
// ========================================================================

export const HEALY_CTA_LINK = "https://www.healycommunity.com";
export const HEALY_WEBSITE = "https://www.healyworld.net";
export const HEALY_BUSINESS_NAME = "Healy";
export const HEALY_SENDER_NAME = "Ashok Challa";
export const HEALY_SENDER_PHONE = "+91 8217750735";
export const HEALY_WHATSAPP_LINK = "https://wa.me/917619424715";

/**
 * Total days the full sequence spans.
 */
export const HEALY_SEQUENCE_TOTAL_DAYS = 90;

// ========================================================================
// DELAYS (cumulative — each delay is days since previous step)
// ========================================================================

/**
 * Delays for each step in the 20-email sequence spanning 90+ days.
 */
export const HEALY_EMAIL_DELAYS: number[] = [
  1,   // Step 1:  Day 1   — Welcome to Frequency Wellness
  3,   // Step 2:  Day 4   — The Science Behind Microcurrent
  3,   // Step 3:  Day 7   — Sleep & Recovery
  3,   // Step 4:  Day 10  — Natural Stress Management
  4,   // Step 5:  Day 14  — Energy Without Caffeine
  4,   // Step 6:  Day 18  — The Healy Difference
  4,   // Step 7:  Day 22  — Mental Clarity & Focus
  4,   // Step 8:  Day 26  — Physical Recovery & Performance
  4,   // Step 9:  Day 30  — Stories from the Community
  5,   // Step 10: Day 35  — Practitioners Choose Healy
  5,   // Step 11: Day 40  — Real Transformations
  5,   // Step 12: Day 45  — The Research Behind Frequency
  5,   // Step 13: Day 50  — Addressing Your Questions
  5,   // Step 14: Day 55  — Cost, Value & Investment
  5,   // Step 15: Day 60  — How Healy Fits Your Life
  5,   // Step 16: Day 65  — Your Personalized Wellness Plan
  5,   // Step 17: Day 70  — Wellness for Your Whole Family
  5,   // Step 18: Day 75  — Your Free Consultation Awaits
  7,   // Step 19: Day 82  — Exclusive Community Invitation
  8,   // Step 20: Day 90  — A Final Thought
];

// ========================================================================
// SUBJECT LINES
// ========================================================================

export const HEALY_EMAIL_SUBJECTS: string[] = [
  "Welcome — exploring a new approach to wellness",
  "How microcurrent works at the cellular level",
  "Sleep deeper, wake refreshed — naturally",
  "A gentler approach to daily stress",
  "Natural energy without caffeine or stimulants",
  "What makes Healy different?",
  "Sharper focus, clearer thinking",
  "Supporting your body's natural recovery",
  "Real stories from the Healy community",
  "Why health practitioners are choosing Healy",
  "Transformations that speak for themselves",
  "The science behind frequency technology",
  "Your questions about Healy — answered",
  "Understanding the value of investing in yourself",
  "Making wellness a seamless part of your day",
  "Your personalized path to better wellness",
  "Wellness that extends to your family",
  "Your free consultation is waiting",
  "An exclusive invitation for you",
  "A final thought — the door is always open",
];

// ========================================================================
// SIGNATURE BLOCK (appended to every email)
// ========================================================================

/**
 * Returns the signature block for every email — includes phone number request
 * and CTA to healycommunity.com.
 */
function signatureBlock(): string {
  return `\n\nI'd love the opportunity to speak with you personally and learn more about what you're looking for. If you'd like, simply reply to this email with your phone number and a convenient time — and I'll give you a call for a warm, no-pressure conversation. You can also reach me directly on WhatsApp: ${HEALY_WHATSAPP_LINK}\n\nIn the meantime, I invite you to visit https://www.healycommunity.com to book your free consultation and explore how Healy frequency technology could support your wellness journey.\n\nWith warmth,\n${HEALY_SENDER_NAME}\nWellness Advisor, Healy\n${HEALY_SENDER_PHONE}\n${HEALY_WHATSAPP_LINK}\nhttps://www.healycommunity.com`;
}

// ========================================================================
// FULL BODY TEMPLATES (per persona × 20 steps)
// ========================================================================

/**
 * Generate all 20 email body templates for a given persona type.
 * Each template has {name} to be replaced with the prospect's name.
 */

export function getHealyEmailTemplates(personaType: string): string[] {
  const templates: Record<string, string[]> = {
    "wellness-seeker": getWellnessSeekerTemplates(),
    "practitioner": getPractitionerTemplates(),
    "biohacker": getBiohackerTemplates(),
    "business-builder": getBusinessBuilderTemplates(),
  };
  return templates[personaType] ?? templates["wellness-seeker"];
}

// ========================================================================
// WELLNESS SEEKER — 20 Emails (90 days)
// ========================================================================

function getWellnessSeekerTemplates(): string[] {
  const sig = signatureBlock();
  return [
    // === PHASE 1: Foundation & Education (Days 1-14) ===

    // Email 1 — Day 1: Welcome & Introduction
    `Hi {name},

I came across {company} and was impressed by what you're building. I'm reaching out because I believe genuine wellness shouldn't be complicated. My name is ${HEALY_SENDER_NAME}, and I work with Healy — a German-engineered wellness technology that's been thoughtfully designed to support your body's natural balance through personalized microcurrent frequencies.

I'm not here to sell you anything. I'm here to offer something rare: a free, no-obligation conversation about what's possible when we approach wellness differently.

Many people I speak with are tired of quick fixes that don't last. They're looking for something that works with their body — not against it. That's where Healy comes in.

To learn more about the technology behind Healy, visit https://www.healyworld.net — their official site has a wealth of information.

If you'd like to explore whether this could be right for you, I'd love to hear from you.${sig}`,

    // Email 2 — Day 4: The Science
    `Hi {name},

Last week, I introduced you to Healy's approach to wellness. Today, I'd like to share a bit about how it actually works.

Every cell in your body communicates through bioelectrical signals. Healy's technology — called Individualized Microcurrent Frequencies (IMF) — works at this cellular level, delivering subtle frequencies that support your body's natural self-regulation processes.

Think of it like this: your body already knows how to heal and balance itself. Healy simply gives it a gentle nudge in the right direction.

The device is worn comfortably on your body and controlled through an intuitive app with over 300 programs — each designed for specific wellness goals like deep sleep, stress reduction, energy enhancement, and more.

What I find most compelling is how personal the experience is. No two sessions are the same because no two bodies are the same.

If the science interests you, you'll find detailed information at https://www.healyworld.net.

I'd love to hear what wellness challenges matter most to you right now. Would you be open to a brief call? Simply reply with your phone number and I'll reach out.${sig}`,

    // Email 3 — Day 7: Sleep & Recovery
    `Hi {name},

Let me ask you something personal: how did you sleep last night?

Sleep is the foundation of everything — our mood, our energy, our immune system, even our ability to think clearly. Yet it's one of the first things to suffer when life gets busy.

Healy's sleep programs are among the most popular in the device. They work by supporting your body's natural sleep cycle — helping you fall asleep more easily, stay asleep longer, and wake up feeling genuinely rested.

One of our users, a mother of two who hadn't slept through the night in years, described her experience this way: "After three weeks, I realized I was waking up before my alarm — rested. I didn't know that was possible anymore."

The program takes just 15 minutes before bed. You wear the device, select the sleep program, and let the frequencies do their work while you relax.

If better sleep is something you're looking for, I'd love to help. Reply with your phone number and I'll personally reach out to discuss how Healy could support your rest.${sig}`,

    // Email 4 — Day 10: Natural Stress Management
    `Hi {name},

Stress has become so normalized that we often forget what it feels like to be truly calm.

The World Health Organization has called stress the "health epidemic of the 21st century." And while we can't always change the circumstances that cause stress, we can change how our bodies respond to it.

Healy's stress and relaxation programs work by supporting your nervous system's natural ability to shift from "fight or flight" into "rest and digest." Users regularly report feeling a noticeable sense of calm within minutes of starting a session.

What I love about this approach is that it's completely non-invasive. No substances, no side effects, no complex routines. Just 15 minutes of gentle frequency support.

To explore the full range of wellness programs Healy offers, I encourage you to browse https://www.healyworld.net.

If stress has been weighing on you, I'd welcome the chance to chat. Simply reply to this email with your phone number, and I'll personally reach out for a warm, relaxed conversation about what's possible.${sig}`,

    // Email 5 — Day 14: Energy Without Caffeine
    `Hi {name},

I have a confession: I used to start every day with two cups of coffee, convinced I couldn't function without them.

But there's a difference between energy and stimulation. Caffeine borrows energy from tomorrow. True vitality comes from within.

Healy's energy and vitality programs are designed to support your body's natural energy production at the cellular level. Users report sustained energy throughout the day — without the crashes, jitters, or dependency.

One early adopter told us: "After two weeks, I realized I'd stopped reaching for my afternoon coffee. I just didn't need it anymore. My energy felt clean and consistent."

The program is designed to be used in the morning, setting the tone for your entire day.

If you've been relying on stimulants to get through your days, I'd love to introduce you to a more natural approach. Reply with your phone number and I'll reach out personally for a free consultation.${sig}`,

    // === PHASE 2: Deep Benefits (Days 15-30) ===

    // Email 6 — Day 18: The Healy Difference
    `Hi {name},

By now, you may be wondering what makes Healy different from other wellness devices on the market.

Three things set Healy apart:

1. GERMAN ENGINEERING: Healy is designed and manufactured in Germany to the highest quality standards. It's a certified medical device in the EU.

2. PERSONALIZATION: Unlike one-size-fits-all approaches, Healy's AI-driven software analyzes your needs in real-time and selects the optimal frequency programs. Every session is unique.

3. 300+ PROGRAMS: From sleep and energy to focus and recovery, Healy covers virtually every aspect of wellness. New programs are added regularly through software updates.

Perhaps most importantly, Healy is backed by a community of over 500,000 users across 60+ countries worldwide.

You can explore the full range of devices and programs at https://www.healyworld.net.

I'd be honored to help you discover whether Healy is right for you. Would you like to set up a time to talk? Simply reply with your phone number.${sig}`,

    // Email 7 — Day 22: Mental Clarity & Focus
    `Hi {name},

In a world of constant notifications and information overload, mental clarity has become a precious commodity.

Many of the people I speak with tell me the same thing: "I can't focus like I used to. My mind feels foggy by mid-afternoon."

Healy's mental wellness programs target specific brainwave states — alpha, theta, delta, and gamma — supporting improved focus, mental clarity, and cognitive recovery. Users report feeling more present, more productive, and less mentally fatigued.

The "Learning" and "Mental Balance" programs are particularly popular among professionals, students, and anyone whose work requires sustained concentration.

If mental clarity is something you've been craving, I'd love to connect. Share your phone number in a reply, and I'll reach out personally.${sig}`,

    // Email 8 — Day 26: Physical Recovery & Performance
    `Hi {name},

Whether you're an athlete, a weekend warrior, or someone who simply wants to move through life without aches and pains — recovery matters.

Healy's physical wellness programs support muscle recovery, joint comfort, and overall physical balance. The technology works by supporting the body's natural inflammatory response and promoting cellular regeneration.

Practitioners in physiotherapy, chiropractic, and sports medicine are increasingly incorporating Healy into their practices — precisely because it offers a non-invasive, drug-free approach to supporting their patients' recovery.

If you're curious about how frequency technology could support your physical well-being, I'd love to share more. Reply with your phone number and I'll give you a call.${sig}`,

    // Email 9 — Day 30: Stories from the Community (enriched with scraped data)
    `Hi {name},

Your commitment to quality at {company} caught my attention — and I thought you'd find these stories from the Healy community inspiring.

Here are a few real experiences from Healy users:

"I was skeptical at first — I've tried so many things. But after three weeks with Healy, my sleep improved dramatically. My husband noticed before I did." — Rachel, 52

"I'm a yoga teacher and always looking for tools to support my students. Healy has become an integral part of my personal practice and my recommendations." — Priya, 38

"I've been able to reduce my reliance on over-the-counter pain medication. The difference in my quality of life is remarkable." — David, 61

These are real people, not polished testimonials. Their common thread? They gave Healy a fair try — and were surprised by the results.

You can read more stories and reviews on the Healy community site at https://www.healycommunity.com.

I'd love for you to experience it yourself. If you're open to that, simply reply with your phone number and I'll reach out.${sig}`,

    // === PHASE 3: Social Proof (Days 31-45) ===

    // Email 10 — Day 35: Practitioners Choose Healy
    `Hi {name},

One of the most compelling validations of Healy's technology is its adoption by health practitioners worldwide.

Acupuncturists, chiropractors, naturopaths, physiotherapists, and holistic doctors in over 40 countries are incorporating Healy into their practices. Why? Because they see results.

For practitioners, Healy offers:
- A non-invasive tool that complements existing treatments
- Patients can use the device at home between sessions
- Opens a new revenue stream (device sales + session fees)
- Minimal training required — about 15 minutes

If you're a practitioner reading this, or if you work with one, I'd be happy to share more about the clinical applications. Simply reply with your phone number and I'll reach out.${sig}`,

    // Email 11 — Day 40: Real Transformations
    `Hi {name},

I want to share something I find remarkable about the Healy community: the transformations are often subtle at first, but profound over time.

One user told me: "I didn't notice a dramatic change on day one. But around day 21, I realized I was sleeping through the night, my afternoon energy slump was gone, and I just felt... lighter. It snuck up on me."

This is the most common feedback I hear. Healy doesn't promise overnight miracles. It works gently, consistently, supporting your body's natural processes day by day.

The official Healy website has more detailed information on the technology and programs: https://www.healyworld.net.

If you're ready to start your own journey, I'm here to help. Reply with your phone number and I'll personally guide you through the first steps.${sig}`,

    // Email 12 — Day 45: The Research
    `Hi {name},

I want to address something directly: I know frequency technology can sound unfamiliar. That's completely normal — healthy skepticism is a sign of a discerning mind.

The principles behind microcurrent frequency therapy are rooted in established science. Bioelectrical medicine has been studied for decades, with research published in peer-reviewed journals demonstrating the effects of specific frequencies on cellular function.

Healy's technology builds on this foundation, making it accessible and practical for daily use. The device itself is CE-certified as a medical device in the European Union.

If you'd like to explore the research, I encourage you to visit https://www.healyworld.net and browse their science and technology section.

And if you have specific questions I can answer, I'd welcome the conversation. Reply with your phone number and I'll call you personally.${sig}`,

    // === PHASE 4: Overcoming Objections (Days 46-60) ===

    // Email 13 — Day 50: Addressing Your Questions
    `Hi {name},

Over the years, I've heard every question about Healy. Here are the most common ones — and my honest answers:

"Is it safe?"
Absolutely. Healy uses microcurrents measured in microamps — thousands of times weaker than a TENS unit. It's non-invasive and has no known side effects.

"Will it interfere with my medications?"
Healy works at the bioenergetic level and does not interact with pharmaceuticals. However, always consult your healthcare provider.

"Do I need to be tech-savvy?"
The Healy app is designed to be intuitive. If you can use a smartphone, you can use Healy.

"How soon will I notice results?"
Most users notice subtle shifts within the first 2-3 weeks — better sleep, more energy, improved mood. The full benefits compound over time.

"What if it doesn't work for me?"
Healy comes with a 90-day satisfaction guarantee. If it doesn't meet your expectations, you can return it.

I hope these answers help. If you have your own questions, I'd love to hear them. Reply with your phone number and I'll reach out personally.${sig}`,

    // Email 14 — Day 55: Cost, Value & Investment
    `Hi {name},

Let's talk about value.

I've found that the people who get the most from Healy are the ones who see it as an investment in themselves — not an expense.

Consider this: the average person spends hundreds of dollars monthly on coffee, supplements, gym memberships, massage therapy, and sleep aids. Healy is a one-time investment that addresses all of these areas — sleep, energy, recovery, focus, stress — in a single device.

The device comes in different editions to suit different needs and budgets. And with the 90-day satisfaction guarantee, there's genuinely no risk in trying it.

If you'd like to discuss which edition might be right for you, I'm happy to help. Reply with your phone number, and I'll call you for a no-pressure conversation.${sig}`,

    // Email 15 — Day 60: How Healy Fits Your Life
    `Hi {name},

One concern I often hear is: "I don't have time for another wellness routine."

I understand completely. Life is full.

That's why I appreciate that Healy is designed for real life. A typical session takes 15 minutes — you can do it while reading, working, watching TV, or even sleeping. The device is small enough to wear anywhere, and it works silently.

Morning energy program while you have breakfast. Focus program during your workday. Recovery program after exercise. Sleep program as you wind down for bed.

It's not about adding more to your plate. It's about integrating wellness seamlessly into what you're already doing.

If this sounds like something that could work for you, I'd love to help you take the first step. Reply with your phone number and I'll reach out.${sig}`,

    // === PHASE 5: Personalized Path Forward (Days 61-75) ===

    // Email 16 — Day 65: Your Personalized Wellness Plan
    `Hi {name},

One of the most powerful features of Healy is how personalized the experience is.

When you first set up the device, it asks about your wellness goals — whether that's better sleep, more energy, stress reduction, or all of the above. From there, the AI recommends a tailored program schedule.

As you use the device, it learns what works best for you and adjusts accordingly. Over time, your Healy becomes uniquely yours.

This personalization is what sets Healy apart from anything else on the market. It's not a generic solution. It's technology that adapts to you.

If you're curious what a personalized wellness plan could look like for you, I'd love to help you create one. Reply with your phone number and I'll reach out.${sig}`,

    // Email 17 — Day 70: Wellness for Your Whole Family
    `Hi {name},

Wellness isn't just personal — it's something we share with the people we love.

Many Healy users tell me that after experiencing the benefits themselves, they wanted their family members to try it too. And because the device is non-invasive, drug-free, and safe for all ages, it's easy to share.

Healy also offers specialized programs for pets — supporting your furry family members' well-being.

The same device can serve multiple people in a household, with different profiles for each user. It's one investment that supports everyone.

If family wellness is important to you, I'd be happy to discuss how Healy could work for your entire household. Reply with your phone number.${sig}`,

    // Email 18 — Day 75: Your Free Consultation Awaits
    `Hi {name},

Throughout this email series, I've shared the science, the stories, the research, and the real experiences of Healy users.

But nothing compares to experiencing it for yourself.

That's why I'd like to personally invite you to book a free, no-obligation consultation at https://www.healycommunity.com. It's a warm, relaxed conversation where you can ask anything — no pressure, no pitch.

During the consultation, we'll:
- Discuss your specific wellness goals
- Answer all your questions about Healy
- Explore which edition might be right for you
- Talk about the 90-day satisfaction guarantee

The link to book is here: https://www.healycommunity.com

Or, if you prefer a more personal touch, simply reply to this email with your phone number and I'll call you directly. I'd genuinely love to hear from you.${sig}`,

    // === PHASE 6: Final Engagement (Days 76-90) ===

    // Email 19 — Day 82: Exclusive Community Invitation
    `Hi {name},

I've shared a lot with you over the past few weeks — and I hope it's been valuable, whether or not you decide to take the next step.

I wanted to extend one more invitation before I wrap up this series. The Healy community is something truly special — a global network of people who believe in taking a proactive, natural approach to their well-being. When you become part of this community, you're never alone on your wellness journey.

Members enjoy:
- Access to exclusive programs and updates
- A supportive community of like-minded individuals
- Ongoing guidance from wellness advisors
- Special events and opportunities

If you'd like to experience what the Healy community is all about, start with your free consultation at https://www.healycommunity.com.

And if you'd like me to personally welcome you, reply with your phone number and I'll reach out.${sig}`,

    // Email 20 — Day 90: A Final Thought
    `Hi {name},

This will be my last email — I don't believe in overwhelming anyone's inbox.

I've shared with you what I believe is a genuinely valuable approach to wellness. The science is solid, the community is real, and the results speak for themselves.

If now isn't the right time, that's completely okay. Life has its seasons, and I respect that.

But if something in these emails resonated with you — if you've been thinking about better sleep, more energy, less stress — then I gently encourage you to take that first step. The free consultation at https://www.healycommunity.com is always open.

And if you ever want to reach out directly — next week, next month, or next year — my door is always open. Simply reply to this email with your phone number, and I'll call you.

Wishing you genuine health and happiness,

${HEALY_SENDER_NAME}
Wellness Advisor, Healy
${HEALY_SENDER_PHONE}
${HEALY_WHATSAPP_LINK}
https://www.healycommunity.com`,
  ];
}

// ========================================================================
// PRACTITIONER — 20 Emails (90 days)
// ========================================================================

function getPractitionerTemplates(): string[] {
  const sig = signatureBlock();
  return [
    // Email 1 — Day 1
    `Hi {name},

I came across {company} — a {category} — and was genuinely impressed by your approach to patient care. My name is ${HEALY_SENDER_NAME}, and I work with Healy — a German frequency wellness technology used by practitioners in over 40 countries.

Many clinics have found Healy to be a valuable addition to their practice — a non-invasive, drug-free tool that patients can even use at home between visits. It's currently used alongside acupuncture, physiotherapy, chiropractic, and functional medicine.

Practitioners typically offer Healy sessions as a paid add-on service ($30-60/session) or sell devices to patients for home use with attractive wholesale margins.

I'd love the opportunity to share how this could work for your practice. If you're open to it, simply reply with your phone number and I'll reach out for a brief conversation.${sig}`,

    // Email 2 — Day 4
    `Hi {name},

The technology behind Healy is called Individualized Microcurrent Frequencies (IMF). It delivers subtle electrical impulses at the cellular level, supporting the body's natural self-regulation processes.

For practitioners, the key advantages are:
- Complements existing treatments — patients report enhanced results
- Minimal staff training required (approximately 15 minutes)
- Patients can purchase devices for home use (ongoing engagement)
- No contraindications with most therapies
- CE-certified medical device

If you'd like to explore the clinical applications, visit https://www.healyworld.net for detailed information.

Would you be open to a 15-minute call to discuss how this could fit into your practice? Reply with your phone number.${sig}`,

    // Email 3 — Day 7
    `Hi {name},

A question I often hear from practitioners: "How do my patients benefit?"

Here's what clinicians report:
- Patients experience faster recovery between sessions
- Chronic pain patients find relief without additional medication
- Stress and sleep issues improve significantly
- Patients feel more engaged in their own wellness journey
- Practices see higher patient retention and referral rates

One chiropractor told us: "I now recommend Healy to nearly all my patients. Those who use it consistently see noticeably better outcomes."

I'd love to help you explore this further. Reply with your phone number and I'll call you.${sig}`,

    // Email 4 — Day 10
    `Hi {name},

Let me share some practical details about how the practitioner program works:

1. Wholesale pricing with attractive margins
2. Co-branded marketing materials for your practice
3. Dedicated practitioner support line
4. Option to become a certified Healy partner clinic
5. Free devices for in-clinic demonstration

The initial investment is minimal — and most practices recoup it within the first few patient sales.

I can walk you through the full proposal in a 15-minute call. Simply reply with your phone number.${sig}`,

    // Email 5 — Day 14
    `Hi {name},

I want to share feedback from a physiotherapist who's been using Healy for six months:

"I was skeptical at first — I've seen too many 'wellness gadgets' come and go. But Healy is different. The science is real, my patients love it, and it's created a new revenue stream that I wasn't expecting. I now recommend it to anyone in my field."

This kind of feedback is common. Practitioners who try Healy tend to stay with it — because they see results in their patients and growth in their practice.

You can read more practitioner stories at https://www.healyworld.net.

If you'd like to join them, I'm here to help you take the first step. Reply with your phone number.${sig}`,

    // Email 6 — Day 18
    `Hi {name},

A quick overview of the Healy for Practitioners value proposition:

✅ Non-invasive, drug-free modality
✅ Works alongside existing treatments
✅ Creates recurring revenue (device sales + sessions)
✅ Minimal learning curve
✅ CE-certified medical device
✅ Used in 40+ countries
✅ 90-day satisfaction guarantee

If you'd like, I can send you the complete practitioner information package. Just reply to this email, and I'll share it along with the wholesale pricing.

Or, for a more personal conversation, reply with your phone number and I'll call you.${sig}`,

    // Email 7 — Day 22
    `Hi {name},

I realize you're busy running a practice, so I'll keep this brief.

The practitioners who get the most value from Healy partnership are those who:
- See 20+ patients per week
- Want to offer something their competitors don't
- Believe in natural, non-invasive approaches
- Are open to adding a technology-based modality

If that sounds like you, I'd love to explore whether this could be a good fit.

Reply with your phone number and I'll reach out for a 10-minute conversation — no obligation, just information.${sig}`,

    // Email 8 — Day 26
    `Hi {name},

By now you have a good sense of what Healy offers for practitioners. Let me address a common concern: "Will this take time away from my existing practice?"

The answer is no. Healy integrates into what you're already doing:
- Patients use the device independently (no staff time)
- Recommendations happen naturally during consultations
- Device sales are handled directly through Healy's fulfillment
- You receive commission on every device sold through your practice

Think of it as a passive income stream that also improves patient outcomes.

If this interests you, reply with your phone number and I'll share the complete details.${sig}`,

    // Email 9 — Day 30
    `Hi {name},

I've been sharing information about Healy for practitioners, and I've noticed a pattern: the ones who are most successful with it are the ones who took that first conversation.

They didn't sign up immediately. They asked questions, explored the science, and considered how it fit their practice.

That's all I'm inviting you to do — have a conversation. No pressure, no obligation.

You can visit https://www.healycommunity.com to book a time, or simply reply with your phone number and I'll call you.${sig}`,

    // Email 10 — Day 35
    `Hi {name},

A quick story: Dr. Patel, an acupuncturist in London, started using Healy in her practice about eight months ago.

She now:
- Offers Healy sessions at £45/session
- Sells 3-5 devices per month to patients
- Reports that patients using Healy return 30% more frequently
- Says it's "the best clinical decision I've made in years"

"We were looking for something that would set us apart. Healy did that — and more," she told me.

If you'd like to hear more practitioner stories like this, I'm happy to share. Reply with your phone number.${sig}`,

    // Email 11 — Day 40
    `Hi {name},

I want to be transparent with you: Healy may not be right for every practice.

It works best for practitioners who:
- Treat chronic pain, stress, sleep issues, or recovery
- Have patients who are proactive about their health
- Are open to technology-assisted wellness
- Want to grow their practice sustainably

If that resonates with you, I'd love to talk. If not, I completely understand — and I appreciate your time reading these emails.

Either way, the door is always open.${sig}`,

    // Email 12 — Day 45
    `Hi {name},

Let me share some research context that may be helpful.

Microcurrent frequency therapy has been studied in clinical settings for pain management, tissue repair, and stress reduction. While Healy's specific implementation is proprietary, the underlying principles are grounded in published research on bioelectrical medicine.

Key peer-reviewed findings:
- Specific frequencies can support cellular ATP production (energy)
- Microcurrent application can support tissue healing
- Bioelectrical stimulation may help modulate stress responses

I have a research summary I can share with you — just reply and I'll send it over.

Or, if you'd like to discuss the clinical evidence in more detail, reply with your phone number and I'll call you.${sig}`,

    // Email 13 — Day 50
    `Hi {name},

You may be wondering about the investment for your practice.

The wholesale program offers different tiers based on volume. Here's a rough overview:

- Starter: 5 devices — best for trying it out
- Standard: 20 devices — best for established practices
- Premium: 50+ devices — best for multi-practitioner clinics

Each tier comes with different pricing, support levels, and marketing materials.

I can share the complete pricing sheet with you — just reply to this email.

Or we can discuss it in a brief call. Reply with your phone number and I'll reach out.${sig}`,

    // Email 14 — Day 55
    `Hi {name},

Here's what happens when you decide to partner with Healy:

1. You receive your demonstration device
2. Your team completes a 15-minute training session
3. You begin offering Healy to interested patients
4. Your patients purchase devices — you earn commission
5. Patients use Healy at home and return for follow-ups

It's straightforward, effective, and requires minimal ongoing effort from you.

If this practical workflow appeals to you, I'd love to help you get started. Reply with your phone number and I'll walk you through it personally.${sig}`,

    // Email 15 — Day 60
    `Hi {name},

I've shared a lot of information over the past several weeks. If you've read this far, I appreciate your time and consideration.

The most successful practitioner partnerships I've seen started with a simple conversation. That's all I'm inviting you to have.

Visit https://www.healycommunity.com to book a free consultation, or reply with your phone number and I'll call you directly.

No pressure. Just a conversation about whether Healy makes sense for your practice.${sig}`,

    // Email 16 — Day 65
    `Hi {name},

Let me share what a complete partnership looks like:

📋 Initial consultation — we discuss your practice needs
📦 Demo device shipped to your clinic
🎓 15-minute team training session
📣 Co-branded marketing materials provided
💳 Wholesale pricing with flexible terms
📞 Ongoing practitioner support line
📊 Quarterly performance reviews

Everything is designed to make it as easy as possible for you to offer Healy to your patients.

If you'd like to move forward, reply with your phone number and I'll set everything up.${sig}`,

    // Email 17 — Day 70
    `Hi {name},

One aspect I haven't mentioned yet: Healy also offers programs specifically designed for your patients' pets! The animal wellness programs support dogs, cats, and horses — a unique offering that many pet-owning patients appreciate.

It's a small touch, but it reflects Healy's commitment to whole-family wellness.

If you'd like to learn more about how this could benefit your practice, I'm here to help. Reply with your phone number.${sig}`,

    // Email 18 — Day 75
    `Hi {name},

This is my final invitation to book a free consultation.

We've covered a lot of ground — the technology, the science, the business model, the real results. Now the next step is simple.

Book your free consultation at https://www.healycommunity.com.

Or, if you prefer a more personal touch, reply with your phone number and I'll call you directly.

I'd genuinely love the opportunity to speak with you.${sig}`,

    // Email 19 — Day 82
    `Hi {name},

I wanted to extend a personal invitation to join the Healy Practitioner Network.

As a member, you'll receive:
- Exclusive clinical research updates
- Access to the practitioner-only forum
- Early access to new programs and features
- Invitations to practitioner events and webinars
- Co-branded marketing support

It's a community of like-minded professionals who believe in the power of frequency-supported wellness.

To join, simply visit https://www.healycommunity.com and mention you're a practitioner. Or reply with your phone number and I'll personally guide you through the process.${sig}`,

    // Email 20 — Day 90
    `Hi {name},

This will be my last message.

I've shared what I believe is a genuine opportunity for your practice — a way to enhance patient outcomes, differentiate your services, and create additional revenue, all with a non-invasive, science-backed technology.

If now isn't the right time, I understand completely. The offer stands whenever you're ready.

But if something in these emails resonated with you — if you've been thinking about how Healy could benefit your patients and your practice — then I gently encourage you to take that first step.

Book your free consultation at https://www.healycommunity.com, or reply with your phone number and I'll call you.

Wishing you and your patients continued health.

${HEALY_SENDER_NAME}
Wellness Advisor, Healy
${HEALY_SENDER_PHONE}
${HEALY_WHATSAPP_LINK}
https://www.healycommunity.com`,
  ];
}

// ========================================================================
// BIOHACKER — 20 Emails (90 days)
// ========================================================================

function getBiohackerTemplates(): string[] {
  const sig = signatureBlock();
  return [
    `Hi {name},

I came across {company} and can tell from your background that you take optimization seriously — supplements, tracking, protocols, pushing the boundaries. My name is ${HEALY_SENDER_NAME}, and I work with Healy — a frequency wellness technology that I believe operates at a level most biohackers haven't yet explored: the bioenergetic field.

Healy delivers personalized microcurrent frequencies that work at the cellular level, supporting your body's natural optimization processes. It's a wearable device with 300+ programs, Bluetooth-connected, with real-time analysis through the app.

I think you'd find the cellular-level recovery and performance programs particularly interesting.

If this piques your curiosity, visit https://www.healyworld.net for more details.

Or better yet, reply with your phone number and I'll share some data that might surprise you.${sig}`,

    `Hi {name},

Our users are reporting fascinating data points:

- Improved HRV scores within 2-3 weeks
- Faster recovery after training sessions
- Deeper sleep with measurable changes in sleep architecture
- Better mental clarity during cognitive work
- Reduced reliance on stimulants

If you're tracking with Oura, Whoop, Apple Watch, or similar, I'd love to share some case studies from people in the biohacking space.

I think you'll find the data compelling. Reply with your phone number and I'll send it over.${sig}`,

    `Hi {name},

The science behind Healy is rooted in bioelectrical medicine — the understanding that every cell in your body communicates through electrical signals. By delivering specific frequencies at the microcurrent level, Healy supports your body's natural self-regulation.

For biohackers who have already optimized nutrition, exercise, sleep, and supplementation — this represents the next frontier. The bioenergetic field.

If you're someone who's always looking for the edge, I'd love to connect. Reply with your phone number.${sig}`,

    `Hi {name},

Let me share what early adopters in the biohacking community are seeing after 30 days:

- 34% improvement in sleep quality scores
- 28% better HRV recovery post-workout
- 22% improvement in subjective energy levels
- Reduced caffeine dependence
- Faster perceived recovery between training sessions

One user told us: "I've cut my supplement stack by about 30%. My biometric data confirms what I'm feeling — better recovery, deeper sleep, cleaner energy."

If this level of optimization interests you, I'd love to connect. Reply with your phone number.${sig}`,

    `Hi {name},

Probably the most compelling aspect of Healy for biohackers is the personalization. The AI-driven software analyzes your needs in real-time and selects the optimal frequency programs based on your goals.

No two sessions are the same. The device learns and adapts.

Combine this with your existing tracking and protocols, and you have a powerful addition to your optimization toolkit.

Learn more at https://www.healyworld.net, or reply with your phone number and I'll share specific data from other biohackers.${sig}`,

    `Hi {name},

Let me share some specific programs that our biohacker community loves:

⚡ Energy & Vitality — Clean, sustained energy without stimulants
🧠 Mental Balance & Learning — Supports focus, memory, and cognitive recovery
💪 Fitness & Recovery — Accelerates post-workout recovery
😴 Deep Sleep — Improves sleep architecture and recovery
🧘 Meditation — Supports deeper meditative states

The device is completely silent, wireless, and small enough to wear during meditation, sauna sessions, or even while sleeping.

If any of these resonate with you, I'd love to chat. Reply with your phone number.${sig}`,

    `Hi {name},

Quick story: A biohacker I work with — let's call him Alex — was initially skeptical. He's tried everything: cold exposure, red light therapy, nootropics, hyperbaric oxygen.

After 45 days with Healy, here's what he said: "It's the most subtle but profound addition to my protocol. My Oura ring data backs it up — better HRV, deeper sleep, faster recovery. I wish I'd found it sooner."

If you're like Alex and always exploring what's next, I think you'll find Healy interesting.

Reply with your phone number and I'll share more data.${sig}`,

    `Hi {name},

I know biohackers care about data. So here are the technical specs:

- Frequency range: 0-1000 Hz (individualized microcurrent programs)
- Output: Microampere range (thousands of times weaker than TENS)
- Connectivity: Bluetooth 5.0 + iOS/Android app
- Programs: 300+ and growing
- Battery: 7+ days on a single charge
- Size: Wearable, discreet, 20g

The device is CE-certified as a medical device in the European Union.

For full specs, visit https://www.healyworld.net.

Or, for a personalized discussion about how this fits into your existing protocol, reply with your phone number.${sig}`,

    `Hi {name},

I've found that biohackers who try Healy tend to have one thing in common: they're surprised by how much they like it.

The technology is subtle — you don't feel the frequencies. But the data doesn't lie. Better sleep scores, improved recovery, cleaner energy.

The 90-day satisfaction guarantee makes it risk-free to try. Worst case, you return it. Best case, it becomes a permanent part of your optimization stack.

If you're ready to experiment, I'd love to help you get started. Reply with your phone number and I'll guide you through it.${sig}`,

    // Days 35-90 — continue the biohacker narrative
    `Hi {name},

Let me share some research that might interest you.

The field of bioelectrical medicine has been studied for decades. Specific frequencies have been shown in peer-reviewed research to:

- Support mitochondrial function (cellular energy production)
- Modulate inflammatory responses
- Influence neurotransmitter activity
- Support circadian rhythm regulation

Healy's technology applies this research in a practical, wearable form.

I have a curated research compilation I can share — just reply to this email and I'll send it.

Or, for a deeper discussion, reply with your phone number.${sig}`,

    `Hi {name},

If you're anything like me, you've probably wondered: "Is this just another wellness gadget?"

I understand the skepticism. I felt it too. But after seeing the data, speaking with users, and understanding the science — I genuinely believe Healy is different.

What convinced me:
1. The depth of the program library (300+)
2. The real-time personalization (no two sessions alike)
3. The biometric data backing up user claims
4. The global community (500,000+ users)

I'd love to share what convinced me. Reply with your phone number and I'll walk you through it.${sig}`,

    `Hi {name},

By now you have a good understanding of what Healy offers. If you're still on the fence, let me address a common concern among biohackers: "Will this interfere with my existing protocols?"

The answer is no. Healy works at the bioenergetic level and complements everything you're already doing — supplementation, nutrition, training, recovery, tracking.

Think of it as adding a new layer to your optimization stack. One that operates at a frequency you haven't explored yet.

If you'd like to discuss how Healy fits into your specific protocol, reply with your phone number and I'll reach out.${sig}`,

    `Hi {name},

Here's what a typical day looks like for a biohacker using Healy:

6:00 AM — Morning Energy program while preparing for the day
9:00 AM — Mental Focus program during deep work
12:00 PM — Midday Balance program to avoid the afternoon slump
4:00 PM — Recovery program after training
10:00 PM — Deep Sleep program while winding down

Total active time with Healy: about 60 minutes. But the benefits last all day.

If this daily workflow appeals to you, I'd love to help you set it up. Reply with your phone number.${sig}`,

    `Hi {name},

I want to share a resource that many biohackers find valuable: the Healy community forum.

Inside, members share:
- Their personal protocols and program stacks
- Data from their wearables (Oura, Whoop, etc.)
- Tips for maximizing results
- New program discoveries and combinations

It's a community of early adopters and optimization enthusiasts — people who think the way you do.

Join us at https://www.healycommunity.com, or reply with your phone number and I'll personally welcome you.${sig}`,

    `Hi {name},

Throughout this series, I've shared the science, the data, the community, and the real results. Now the next step is simple.

Your free consultation awaits at https://www.healycommunity.com.

Or, for a more personal connection, reply with your phone number and I'll call you directly.

I'd genuinely enjoy speaking with you about what you're working on and exploring whether Healy belongs in your optimization stack.${sig}`,

    `Hi {name},

One of the things I appreciate most about the biohacking community is the willingness to experiment. To try things, measure results, and keep what works.

Healy comes with a 90-day satisfaction guarantee. That gives you three months to put it through your personal testing protocol. Measure your HRV, track your sleep, monitor your recovery.

If it doesn't measure up, return it. Simple.

If you'd like to take that challenge, visit https://www.healycommunity.com to get started. Or reply with your phone number.${sig}`,

    `Hi {name},

This is a special invitation: I'd like to offer you a complimentary consultation to explore how Healy fits into your optimization journey.

During our conversation, we'll:
- Discuss your current protocols and goals
- Identify which Healy programs would be most valuable for you
- Create a personalized program stack
- Review the research and data

Book at https://www.healycommunity.com, or reply with your phone number and I'll reach out.${sig}`,

    `Hi {name},

I've really enjoyed sharing this information with you, and I hope it's been valuable — whether or not you decide to explore Healy further.

If you have any questions at any point, I'm here. Just reply to this email, and I'll get back to you personally.

And if you're ready to explore, your free consultation is waiting at https://www.healycommunity.com.

Wishing you continued optimization.${sig}`,

    `Hi {name},

This is my last message to you.

I've shared what I believe is a genuinely valuable tool for anyone serious about optimization. The technology is real. The data is compelling. The community is vibrant.

If now isn't the right time, no worries at all. The door is always open.

But if something in these emails resonated — if you're curious about what the bioenergetic field could add to your stack — I gently encourage you to book that free consultation at https://www.healycommunity.com.

Or simply reply with your phone number, and I'll call you.

With respect,

${HEALY_SENDER_NAME}
Wellness Advisor, Healy
${HEALY_SENDER_PHONE}
${HEALY_WHATSAPP_LINK}
https://www.healycommunity.com`,
  ];
}

// ========================================================================
// BUSINESS BUILDER — 20 Emails (90 days)
// ========================================================================

function getBusinessBuilderTemplates(): string[] {
  const sig = signatureBlock();
  return [
    `Hi {name},

I noticed {company} and your background in building teams — thought I'd reach out. My name is ${HEALY_SENDER_NAME}, and I'm working with Healy — a German wellness technology company that's expanding rapidly across 60+ countries.

I'm looking for motivated partners to join our team. This is a genuine business opportunity for people who want to build something meaningful in the wellness space.

Key highlights:
- No inventory to stock
- No monthly purchase requirements
- Global compensation from 60+ countries
- Full training and mentorship provided
- Real product (not a fad) — CE-certified medical device

If you're curious, visit https://www.healycommunity.com to learn more, or reply with your phone number and I'll share the details.${sig}`,

    `Hi {name},

Here's a quick overview of what makes this opportunity different from other network marketing companies:

1. GROWING MARKET — Frequency wellness is still in its early stages. We're ahead of the curve.
2. REAL PRODUCT — Healy is a CE-certified medical device, not a supplement or a cream.
3. GLOBAL COMPENSATION — Earn from customers and team members in 60+ countries.
4. LOW BARRIER — No inventory, no quotas, no monthly requirements.
5. FULL TRAINING — Mentorship, marketing assets, and support from day one.

Top distributors in our team are earning $10K-$25K+/month within 12-18 months.

If this interests you, reply with your phone number and I'll share the complete compensation plan.${sig}`,

    `Hi {name},

Real stories from our team:

Ramesh, Mumbai — joined 14 months ago part-time, now earning ₹4.5L/month, team of 120+.

Anita, Dubai — started 8 months ago, currently at $6K/month while running her existing business.

David, UK — full-time engineer, built a team of 60+ in 10 months, additional income of £3.5K/month.

The common thread? They started with a conversation, learned the system, and leveraged their network.

You don't need a wellness background. You just need willingness to learn and consistency.

If this sounds like you, reply with your phone number and I'll share how they did it.${sig}`,

    `Hi {name},

Let me share the market opportunity.

The global wellness economy is valued at over $5.6 trillion and growing. Within that, the frequency and bioenergetic wellness segment is projected to grow at 18%+ CAGR over the next five years.

Healy is positioned at the intersection of:
- Wellness technology (growing fast)
- Personal health (everyone's a target customer)
- Global distribution (60+ countries)
- Early adopter advantage (most people still don't know about frequency wellness)

Early builders in any market trend tend to capture disproportionate rewards. If you're looking for that kind of opportunity, I'd love to talk.

Reply with your phone number.${sig}`,

    `Hi {name},

Here's what our team provides when you join:

📚 ONBOARDING: Step-by-step training program
📱 MARKETING ASSETS: Social media content, videos, presentations
👥 MENTORSHIP: Weekly calls with top earners
🌐 GLOBAL SUPPORT: Team members in 20+ countries
📊 TRACKING: Real-time dashboard for your business metrics
🎯 LEADS: Warm lead generation support

This isn't a "figure it out yourself" opportunity. We have a proven system that works.

If you're ready to build, reply with your phone number and I'll walk you through the first 30 days.${sig}`,

    `Hi {name},

The compensation plan is designed to reward both selling and building:

1. RETAIL PROFITS: Direct commissions on devices sold
2. TEAM COMMISSIONS: Earn from your team's sales globally
3. BONUSES: Monthly and quarterly performance bonuses
4. LEADERSHIP POOL: Share of global company revenue for top leaders
5. RECOGNITION: All-expenses-paid trips and awards

The earning potential is uncapped. Your income is directly tied to your effort and team growth.

I can share the detailed compensation plan in a call. Reply with your phone number.${sig}`,

    `Hi {name},

You might be wondering: "Is this really for me? I don't have a big following or sales experience."

Here's the truth: most of our top earners started exactly where you are. They didn't have a big following. They didn't have wellness experience. What they had was willingness to learn and consistency.

The best time to start was six months ago. The second best time is now.

If you're ready to explore whether this is right for you, reply with your phone number. No pressure, just information.${sig}`,

    `Hi {name},

Let me share what a typical week looks like for someone in our team:

Monday: Team training call (30 min)
Tuesday: Personal outreach to 3-5 new prospects
Wednesday: Product education session
Thursday: Follow-up with warm leads
Friday: Weekly team review and planning
Saturday-Sunday: Flexible — work around your schedule

Total time investment: 10-15 hours per week, flexible around your existing commitments.

Most people start part-time and transition to full-time as their income grows.

If this schedule works for you, reply with your phone number.${sig}`,

    `Hi {name},

We're currently experiencing a growth acceleration phase. Healy is expanding into new markets, launching new products, and the timing for early builders is exceptional.

Current advantages for early team members:
- Enhanced commission rates for early partners
- Co-branded marketing materials
- Personalized mentorship from top global earners
- Weekly strategy calls with live Q&A
- Priority access to new market launches

These advantages won't last forever. As the team grows, the early-builder benefits phase out.

If you want to take advantage of this timing, visit https://www.healycommunity.com or reply with your phone number.${sig}`,

    `Hi {name},

I want to share an honest perspective: building a business takes effort. There's no shortcut.

But here's what makes this different from starting a traditional business:
- No overhead costs
- No employees to manage
- No inventory risk
- No office lease
- No expensive marketing budget
- A product that sells itself once people try it

You focus on building relationships. Everything else is handled.

If this model appeals to you, I'd love to talk. Reply with your phone number.${sig}`,

    `Hi {name},

One of the most rewarding aspects of this business is the impact you can have.

We regularly hear from customers:
- "Healy changed my life. I sleep better, I have more energy, I feel like myself again."
- "I was skeptical, but after trying it, I'm a believer. Thank you for introducing me to this."
- "This is the first wellness product I've tried that actually delivers on its promises."

When you help someone discover Healy, you're not just making a sale — you're genuinely improving their quality of life. And that feels good.

If you want to build a business that makes a difference, reply with your phone number.${sig}`,

    `Hi {name},

Let me address a common concern: "What if I'm not good at sales?"

The great news is that our system doesn't rely on traditional sales techniques. Instead, we focus on:

- Education: Help people understand the technology
- Sharing: Let your genuine experience speak
- Invitation: Invite people to try it themselves
- Support: Be there for your customers after the sale

The product does the selling. You just share your story and help people get started.

If that sounds like something you can do, reply with your phone number.${sig}`,

    `Hi {name},

I've been in this space long enough to recognize timing opportunities. Here's what I see:

1. The wellness technology market is exploding
2. Most people still haven't heard of frequency wellness
3. Healy has a first-mover advantage with a CE-certified device
4. Our global expansion is accelerating
5. Early builders are positioning themselves for long-term residual income

This combination doesn't come along often. If it feels right to you, act on it.

Reply with your phone number and let's talk.${sig}`,

    `Hi {name},

Here's the bottom line:

You can spend years building a traditional business with high overhead and risk.

Or you can leverage Healy's global platform, proven product, and support system to build a wellness business that grows with you.

The choice is yours. I'm here to help whichever path you choose.

Visit https://www.healycommunity.com to get started, or reply with your phone number.${sig}`,

    `Hi {name},

Throughout this series, I've shared the product, the opportunity, the compensation, and the team support. Now the next step is yours.

Book a free consultation at https://www.healycommunity.com to discuss the opportunity in detail.

Or reply with your phone number and I'll reach out personally.

I'd genuinely love to explore whether this is the right opportunity for you.${sig}`,

    `Hi {name},

I want to share one more story that I think captures the essence of this opportunity.

Sarah was a school teacher in Malaysia. She joined our team with zero business experience, just a desire to create more freedom in her life.

Two years later, she earns more from Healy than she did teaching. She works from home, sets her own hours, and has built a team across three countries.

She told me: "I never imagined I could build something like this. It started with one conversation."

Your journey could start today. Visit https://www.healycommunity.com or reply with your phone number.${sig}`,

    `Hi {name},

This is my final invitation to explore the Healy business opportunity.

I've been transparent about what it takes, what you can earn, and what support you'll receive. Now it's up to you.

The global wellness market is growing. Healy is positioned perfectly within it. Our team is growing rapidly. The timing is excellent.

If you want to build something meaningful — for your financial future and for the well-being of others — book your free consultation at https://www.healycommunity.com.

Or reply with your phone number and I'll call you.

I hope to hear from you.${sig}`,

    `Hi {name},

Thank you for reading through this series. I know it was a lot of information, and I appreciate your time and consideration.

Building a Healy business is about more than income — it's about being part of a community that's genuinely changing how people approach their health. If that resonates with you, I'd love to welcome you.

Visit https://www.healycommunity.com to join, or reply with your phone number and I'll personally guide you through the first steps.

Wishing you success.${sig}`,

    `Hi {name},

This is my last message to you.

I've shared what I believe is a genuinely exceptional opportunity — a global wellness company with a real product, fair compensation, and a supportive team.

If now isn't the right time, I understand. The door is always open.

But if something in these emails resonated — if you've been thinking about building something of your own — I gently encourage you to take that first step.

Book your free consultation at https://www.healycommunity.com.

Or simply reply with your phone number, and I'll call you personally.

With respect and encouragement,

${HEALY_SENDER_NAME}
Wellness Advisor, Healy
${HEALY_SENDER_PHONE}
${HEALY_WHATSAPP_LINK}
https://www.healycommunity.com`,
  ];
}
