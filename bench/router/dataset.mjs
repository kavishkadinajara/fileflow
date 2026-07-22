/**
 * ConvertBench-lite — labeled sensitivity dataset for router evaluation.
 *
 * 72 short documents, hand-labeled with:
 *   • categories — which of the 6 sensitivity categories a human annotator
 *     judges PRESENT in the text (ground truth for precision/recall)
 *   • level     — human judgment of overall sensitivity: how bad would it be
 *     if this text were sent to a third-party AI service?
 *       low      → contains no personal/confidential data
 *       moderate → some identifying or business-confidential data
 *       high     → clear PII / secrets / privileged content; must not leave
 *
 * Labels were authored from the text alone (annotator perspective), NOT from
 * the classifier's detector list — disagreements are measured, not hidden.
 * Card numbers use official test numbers (Luhn-valid); hard negatives use
 * Luhn-INVALID lookalikes and vocabulary near-misses.
 */

export const SAMPLES = [
  // ── clean (no sensitive content) ────────────────────────────────────────────
  { id: "clean-1", level: "low", categories: [],
    text: "The quarterly build pipeline now caches dependencies between stages, cutting average build time from eleven minutes to four. Cache invalidation follows the lockfile hash, and the team saw no stale-artifact incidents during the trial month." },
  { id: "clean-2", level: "low", categories: [],
    text: "Our community garden rota for the dry season assigns watering duty in two-day blocks. Compost collection moves to Saturdays. The tool shed code changes monthly and is posted on the noticeboard inside the pavilion." },
  { id: "clean-3", level: "low", categories: [],
    text: "The migration guide covers upgrading the charting library from version 4 to 5. Breaking changes: the axis configuration object is flattened, tooltip formatters receive raw datum objects, and the deprecated animation flag is removed." },
  { id: "clean-4", level: "low", categories: [],
    text: "Rainfall across the catchment was 12 percent above the seasonal average. Reservoir levels remain within operating bands. The spillway inspection scheduled for next quarter will proceed as planned, weather permitting." },
  { id: "clean-5", level: "low", categories: [],
    text: "The reading group voted to alternate between fiction and non-fiction each month. Meetings stay on the first Wednesday. Suggestions for the next cycle should be added to the shared list before the twentieth." },
  { id: "clean-6", level: "low", categories: [],
    text: "Bus route 138 will divert via the old bridge during resurfacing works. Journey times increase by roughly ten minutes at peak. Real-time updates appear on the operator's status page throughout the works." },
  { id: "clean-7", level: "low", categories: [],
    text: "The workshop compared three approaches to sourdough hydration. Higher hydration doughs needed longer bench rest but produced a more open crumb. Participants preferred the 78 percent formula for flavour balance." },
  { id: "clean-8", level: "low", categories: [],
    text: "Trail maintenance this month focused on drainage bars along the northern switchbacks. Volunteers cleared four culverts and re-benched a washed-out section. The lookout loop reopens this weekend." },

  // ── contact ────────────────────────────────────────────────────────────────
  { id: "contact-1", level: "moderate", categories: ["contact"],
    text: "Please send the revised draft to nadeesha.perera@acmeholdings.com and copy the project inbox. If anything is unclear, call me on +94 71 234 5678 after two, or drop by the Kandy office reception." },
  { id: "contact-2", level: "moderate", categories: ["contact"],
    text: "Delivery note: leave the package with the neighbour at 42/7 Temple Road, Nugegoda if nobody answers. Courier can confirm by phoning 011-234-9876. Gate code is the house number reversed." },
  { id: "contact-3", level: "moderate", categories: ["contact"],
    text: "RSVP list so far: chamari.f@gmail.com, roshan.silva@yahoo.com, and the two colleagues from the Galle branch. Chamari asked us to use her mobile, 077 555 1234, for day-of coordination rather than email." },
  { id: "contact-4", level: "moderate", categories: ["contact"],
    text: "The customer updated their contact details: primary email is now accounts@weystoneretail.lk and the billing phone is (011) 298-4567. Old records should be archived, not deleted, per the retention schedule." },
  { id: "contact-5", level: "moderate", categories: ["contact"],
    text: "Interview logistics: candidate arrives 9.30, host meets at the lobby. Send the parking pass to d.jayawardena@outlook.com the evening before and text 070 811 2233 if the slot moves." },
  { id: "contact-6", level: "moderate", categories: ["contact"],
    text: "For the reunion, the organising committee can be reached at batch2009.reunion@gmail.com. Treasurer prefers WhatsApp on +94 76 402 1188. Venue contact is the events desk at the hotel." },
  { id: "contact-7", level: "moderate", categories: ["contact"],
    text: "Support escalation path: first email helpdesk@corvidmfg.com, then ring the duty engineer on 071 990 4455 if there is no response within an hour. Weekend cover rotates monthly." },
  { id: "contact-8", level: "moderate", categories: ["contact"],
    text: "New tenant references: previous landlord Sunil Bandara, sunil.b@landmarkprops.lk, mobile 077 123 8899. Employer HR contact available on request. Utility transfer forms are attached." },

  // ── financial ──────────────────────────────────────────────────────────────
  { id: "fin-1", level: "high", categories: ["financial"],
    text: "Payment failed on the corporate card 4111 1111 1111 1111 (exp 09/27). Please retry the invoice against the backup Visa 4242 4242 4242 4242 before the supplier suspends the account." },
  { id: "fin-2", level: "high", categories: ["financial"],
    text: "Refund the deposit to IBAN GB82 WEST 1234 5698 7654 32. If the transfer bounces, the fallback is the euro account DE89 3704 0044 0532 0130 00 held at the Frankfurt branch." },
  { id: "fin-3", level: "moderate", categories: ["financial"],
    text: "The revised offer puts base salary at LKR 425,000 per month with a 12 percent retention bonus vesting over two years. Loan repayments of LKR 68,500 continue to be deducted at source." },
  { id: "fin-4", level: "high", categories: ["financial", "contact"],
    text: "Standing order setup for A. Fernando: card ending 4242 4242 4242 4242, billing email a.fernando@lankamail.com. Monthly premium LKR 18,750 debited on the 5th. Cancellation requires written notice." },
  { id: "fin-5", level: "moderate", categories: ["financial"],
    text: "Portfolio summary: the retirement account balance crossed 14.2 million after the bond ladder matured. Dividend income covered 63 percent of withdrawals. Advisor recommends rebalancing toward the index fund." },
  { id: "fin-6", level: "high", categories: ["financial"],
    text: "Card-present transactions on 5500 0055 5555 5559 were flagged in two cities on the same evening. Freeze the card, reissue, and reverse the disputed charge of USD 312.40 pending investigation." },
  { id: "fin-7", level: "moderate", categories: ["financial"],
    text: "Mortgage restructure: outstanding principal LKR 9.6 million at 11.25 percent, moving to a fixed 9.9 percent for three years. Early settlement fee waived if refinanced internally. Monthly installment drops to 96,400." },
  { id: "fin-8", level: "high", categories: ["financial"],
    text: "Wire instructions for the closing: beneficiary account IBAN LK25 7010 0000 3245 1187 62, swift CCEYLKLX. Amount due at settlement is 4,250,000 rupees. Do not share these instructions by phone." },

  // ── medical ────────────────────────────────────────────────────────────────
  { id: "med-1", level: "high", categories: ["medical"],
    text: "The patient presents with poorly controlled type 2 diabetes; HbA1c is 9.1 percent despite metformin titration. Starting insulin glargine at bedtime and referring to the diabetic clinic for structured education." },
  { id: "med-2", level: "high", categories: ["medical"],
    text: "Discharge summary: admitted with community-acquired pneumonia, treated with IV co-amoxiclav stepping down to oral. Chest X-ray on discharge shows resolving consolidation. Follow-up film in six weeks." },
  { id: "med-3", level: "high", categories: ["medical", "identity"],
    text: "Referral for M. G. Ashini Upeksha, DOB 14/03/1985: two-year history of hypertension, now with proteinuria on repeat dipstick. Please assess for secondary causes and advise on ACE inhibitor titration." },
  { id: "med-4", level: "high", categories: ["medical"],
    text: "Oncology MDT outcome: stage II carcinoma, ER positive. Plan is wide local excision followed by adjuvant radiotherapy; chemotherapy to be discussed after the Oncotype score returns. Patient counselled on options." },
  { id: "med-5", level: "high", categories: ["medical"],
    text: "Psychiatric review notes ongoing severe depression with early-morning waking and weight loss. Sertraline increased to 150mg; safety plan updated with the crisis team's contact route. Review in two weeks." },
  { id: "med-6", level: "high", categories: ["medical"],
    text: "The biopsy confirms coeliac disease with villous atrophy. Commence a strict gluten-free diet; dietician referral made. Repeat serology in six months to confirm adherence and mucosal recovery." },
  { id: "med-7", level: "high", categories: ["medical", "contact"],
    text: "Home visit request for Mrs Wickramasinghe, 88, housebound after a fall: suspected UTI with new confusion. District nurse can be reached on 071 654 3321 to coordinate the urine sample collection." },
  { id: "med-8", level: "high", categories: ["medical"],
    text: "Asthma action plan updated: peak flow baseline 410. Step up to the combination inhaler when readings fall below 330 or night symptoms occur twice a week. Prednisolone rescue course documented." },

  // ── legal ──────────────────────────────────────────────────────────────────
  { id: "legal-1", level: "moderate", categories: ["legal"],
    text: "Counsel advises that the indemnity clause as drafted exposes us to uncapped liability for consequential loss. Recommend counter-proposing a cap at twelve months of fees, consistent with the confidentiality carve-out." },
  { id: "legal-2", level: "high", categories: ["legal"],
    text: "Privileged and confidential: the settlement negotiation with the former distributor resumes Thursday. Our position remains an ex gratia payment without admission of liability, contingent on a full mutual release and non-disparagement." },
  { id: "legal-3", level: "moderate", categories: ["legal"],
    text: "The lease renewal introduces a break clause at month eighteen, exercisable with ninety days' notice. Dilapidations liability is limited to the schedule of condition annexed at signing. Rent review is upward-only." },
  { id: "legal-4", level: "high", categories: ["legal"],
    text: "Litigation hold notice: preserve all correspondence, drafts, and system logs relating to the tender dated March last year. The claimant alleges breach of contract and misrepresentation; disclosure obligations now apply." },
  { id: "legal-5", level: "moderate", categories: ["legal"],
    text: "Employment tribunal update: the respondent filed its grounds of resistance late. We will not object, to keep the tribunal's sympathy, but will note the pattern if further deadlines slip. Merits assessment unchanged." },
  { id: "legal-6", level: "moderate", categories: ["legal"],
    text: "The licensing agreement grants a non-exclusive, non-transferable right to use the software within the licensed territory. Sub-licensing is prohibited. Breach of the audit clause triggers termination for cause." },
  { id: "legal-7", level: "high", categories: ["legal", "financial"],
    text: "Under the proposed consent order, the defendant pays LKR 2.4 million in three tranches, the first within 28 days of sealing. Default accelerates the balance and revives the full pleaded claim." },
  { id: "legal-8", level: "moderate", categories: ["legal"],
    text: "Trademark opposition deadline is the 14th. Our attorney recommends filing based on prior use and likelihood of confusion in class 35. Coexistence discussions remain open in parallel." },

  // ── credentials ────────────────────────────────────────────────────────────
  { id: "cred-1", level: "high", categories: ["credentials"],
    text: "Temporary access for the contractor: API key sk-live-9f8g7h6j5k4l3m2n1p0qrstuvwx expires Friday. Rotate it after the data load completes and revoke the staging token at the same time." },
  { id: "cred-2", level: "high", categories: ["credentials"],
    text: "The deploy failed because the CI secret was stale. New AWS access key AKIAIOSFODNN7EXAMPLE is in the vault; the old one is disabled. Never paste keys into the build logs again." },
  { id: "cred-3", level: "high", categories: ["credentials"],
    text: "-----BEGIN RSA PRIVATE KEY----- MIIEowIBAAKCAQEA7bq2 ... -----END RSA PRIVATE KEY----- This is the signing key for the license server. Store it in the HSM, delete every emailed copy." },
  { id: "cred-4", level: "high", categories: ["credentials"],
    text: "Wifi at the venue: network CONF-STAFF, password Tr0ub4dor&3-stage. The admin portal login is admin with the usual passphrase from the shared vault. Change both after the event." },
  { id: "cred-5", level: "high", categories: ["credentials", "contact"],
    text: "Database credentials for the analyst: host db.internal.cendric.lk, user readonly_kavi, password W1nter!Mango#88. Reach the DBA at dba@cendric.lk if the grant is missing tables." },
  { id: "cred-6", level: "high", categories: ["credentials"],
    text: "The leaked token ghp_a1B2c3D4e5F6g7H8i9J0kLmNoPqRsTuVwXyZ was committed in a public branch. It has repo scope. Revoke immediately, audit access logs, and force-push history rewrite." },
  { id: "cred-7", level: "high", categories: ["credentials"],
    text: "OTP seed for the shared finance login is stored in the blue envelope in the safe. Interim password for the payment gateway is Paygate#2026!tmp — valid 48 hours only." },
  { id: "cred-8", level: "high", categories: ["credentials"],
    text: "Service account rotation: client secret 8Qz~pLm4Xv9._KfT2wYb6E is live from tonight. Update the connector config and confirm the old secret returns 401 before closing the ticket." },

  // ── identity ───────────────────────────────────────────────────────────────
  { id: "id-1", level: "high", categories: ["identity"],
    text: "Visa application checklist for the applicant: NIC 853421876V, passport N1234567 issued Colombo, expiry 2029. Bring originals and one photocopy set. Biometric appointment is at the consulate." },
  { id: "id-2", level: "high", categories: ["identity", "contact"],
    text: "KYC record: customer NIC 200012345678, registered address 15 Lake Crescent, Kurunegala, contact 072 445 6677. Verification photo on file. Next periodic review due in 24 months." },
  { id: "id-3", level: "high", categories: ["identity"],
    text: "The US payroll onboarding needs the new hire's SSN 987-65-4320 and I-9 documents before the first pay run. Store the scans in the restricted HR drive, not the shared folder." },
  { id: "id-4", level: "high", categories: ["identity"],
    text: "Insurance claim form: policyholder NIC 761234567V, vehicle registration CAB-4321. Assessor visit booked. Do not email the NIC copy; upload it through the secure portal only." },
  { id: "id-5", level: "high", categories: ["identity", "medical"],
    text: "Vaccination certificate reissue: passport M7654321, batch records verified against the clinic register. The corrected certificate will show the third dose date as 12 January." },
  { id: "id-6", level: "high", categories: ["identity"],
    text: "Exam registration mismatch: the candidate's NIC 991812345V does not match the name spelling on the admission card. Bring the NIC and the correction affidavit to the registrar's counter." },
  { id: "id-7", level: "high", categories: ["identity", "financial"],
    text: "Loan guarantor details: NIC 682345123V, employed 14 years, monthly income LKR 310,000 verified by employer letter. Credit bureau report shows no defaults. Proceed to documentation." },
  { id: "id-8", level: "high", categories: ["identity"],
    text: "Airport pickup manifest: passenger passport numbers N2233445 and N5566778, arriving on the late flight. Driver should carry the name board and verify documents before departure." },

  // ── mixed (multi-category) ─────────────────────────────────────────────────
  { id: "mix-1", level: "high", categories: ["medical", "financial"],
    text: "The insurance pre-authorisation for the cardiac catheterisation was approved at 85 percent coverage; patient co-payment is LKR 142,000. Diagnosis code documented as unstable angina. Admission set for Tuesday." },
  { id: "mix-2", level: "high", categories: ["legal", "medical"],
    text: "In the negligence claim, the expert report concedes the post-operative infection was recognised late. Counsel values quantum around 3.8 million including future care. Settlement conference before trial is advised." },
  { id: "mix-3", level: "high", categories: ["credentials", "financial"],
    text: "Payment gateway migration: merchant id MG-99812, live secret key pk-live-77Hh88Jj99Kk00Ll is active. Settlement account changes next cycle; treasury confirms the cutover window Saturday night." },
  { id: "mix-4", level: "high", categories: ["identity", "contact", "financial"],
    text: "Payroll correction for E. Rajapakse: NIC 872233445V, bank account 8890 revised to grade 7 scale, arrears LKR 84,300 payable this month. Confirmation goes to e.rajapakse@halden.lk." },
  { id: "mix-5", level: "moderate", categories: ["legal", "financial"],
    text: "The acquisition term sheet fixes the earn-out at 2.1 times trailing revenue, capped at 40 percent of headline price. Exclusivity runs 45 days with a break fee if either side walks." },
  { id: "mix-6", level: "high", categories: ["medical", "contact"],
    text: "Clinic recall list: three patients on the amber pathway need bloods before Friday. Coordinator will phone each on their registered mobile; results go to the duty doctor inbox clinical.duty@nhcolombo.lk." },
  { id: "mix-7", level: "high", categories: ["identity", "credentials"],
    text: "Password reset verification requires the last four of the NIC and the recovery code QX7-224-981. Agent must read the data-handling script before collecting either. Log the interaction id." },
  { id: "mix-8", level: "moderate", categories: ["financial", "legal"],
    text: "Audit finding 12: supplier advances of LKR 6.2 million lacked board approval required above the 5 million threshold under the delegation of authority. Management response due in 30 days." },

  // ── hard negatives (lookalikes that should NOT fire) ───────────────────────
  { id: "neg-1", level: "low", categories: [],
    text: "Order reference 4111 1111 1111 1112 was scanned twice at the depot, which the tracking system rejects as a duplicate. The parcel itself is fine and continues on the scheduled route." },
  { id: "neg-2", level: "low", categories: [],
    text: "The lecture on medieval trade routes covers the credit instruments merchants used centuries before modern banking. Readings discuss bills of exchange as historical artefacts, not personal finance." },
  { id: "neg-3", level: "low", categories: [],
    text: "In the orchestra, the key of the second movement shifts from D minor to F major. The conductor asked the strings to soften the passage where the theme returns." },
  { id: "neg-4", level: "low", categories: [],
    text: "Serial number 1234 5678 9012 3456 identifies the turbine housing casting batch. Quality control logs it against the furnace run. No two castings share a serial." },
  { id: "neg-5", level: "low", categories: [],
    text: "The gardening column recommends patience with citrus: a tree stressed by transplant can take two seasons to fruit. Feed monthly, water deeply but infrequently, and prune only dead wood." },
  { id: "neg-6", level: "low", categories: [],
    text: "Chapter four of the novel opens in a courtroom, but the trial is a dream sequence; the narrator wakes before the verdict. Reviewers called the device heavy-handed." },
  { id: "neg-7", level: "low", categories: [],
    text: "The chess engine sacrifices the exchange for a passed pawn. Analysis shows the position is a draw with best play, but in practice the defence is unpleasant." },
  { id: "neg-8", level: "low", categories: [],
    text: "Museum opening hours extend to eight on Fridays this summer. The ticket desk closes an hour before the galleries. School groups should book the education room in advance." },
];

export const CATEGORIES = ["identity", "contact", "financial", "medical", "legal", "credentials"];
