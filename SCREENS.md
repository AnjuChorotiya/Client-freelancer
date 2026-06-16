# Client-freelancer — Screen Docs

Purpose and flow for each screen in this repo. Live pages:
`https://anjuchorotiya.github.io/Client-freelancer/<file>`.

---

## home.html

**Purpose:** The signed-in client workspace home **before setup** ("Good Morning, Aman!") — the onboarding state. Shows the "Account setup" progress card and the 6-step checklist that the client works through before the portal is fully active. (`dashboard.html` is the same home **after setup**.)

**Flow:**
1. Left sidebar provides the WORKSPACE nav: Home, Freelancers, Invoices, Time. The header has a Quick actions command palette (Ctrl/Cmd K), notifications and the user chip.
2. Until setup is complete, an "Account setup" progress card ("You're 17% there", 1 of 6 steps) and a 6-step checklist render: Verify your email, About you, People behind the business, Documents, Your work, Features you'd like to use.
3. The "Start" button on the active checklist step launches client onboarding.
4. Other tabs (Freelancers, Invoices, Leaves) swap in card views with empty states, a "Needs your approval" panel (payment/reimbursement requests with Approve/Deny), and a Recent Activity feed.

**Notes:** Freelancers view links to `add-freelancer.html` and a "Run compliance check" to `compliance.html`; invoice rows expose a "Pay now" action. Shares the COR-comparison and Talk-to-sales modals used across the portal.

---

## login.html

**Purpose:** Entry screen for the portal ("Welcome back"), offering Google SSO or work-email sign-in.

**Flow:**
1. User can "Continue with Google" or enter a work email.
2. Submitting the email form forwards to `check-inbox.html` (passing the email as a query param).

**Validations:**
- Email: input is `type="email" required` with a "Please enter a valid email address" field-error message, but the form is marked `novalidate` and the submit handler does not re-check — it forwards whether or not an email is entered (falls back to `check-inbox.html` with no param), so nothing is actually enforced.

**Notes:** A "Use a different email / Log in" link sits in the top bar. This is the first step of the auth journey: login → check-inbox → signup-role → signup-country.

---

## signup-role.html

**Purpose:** Account-type chooser ("What kind of account would you like to create?") splitting users into client vs. freelancer paths.

**Flow:**
1. Two role cards: "I want to pay & manage freelancers" (client) and "I'm looking to get paid" (freelancer).
2. Selecting a card continues to `signup-country.html?role=client` or `?role=freelancer`.

**Notes:** A Back link returns to `check-inbox.html`. Comes after email verification in the signup flow.

---

## signup-country.html

**Purpose:** Captures the user's country of residence/registration ("Where are you based?") to configure tax and payment options.

**Flow:**
1. A searchable country dropdown (defaulting to India) lets the user pick a country.
2. "Continue" proceeds with the selection.

**Notes:** Copy adapts to the role passed in the URL — for clients the heading becomes "Where is your business based?" and the label "Country of registration". Back link returns to `signup-role.html`.

---

## dashboard.html

**Purpose:** The same client workspace home **after setup** — the completed "You're all set, Aman!" state (6 of 6 steps, "Setup complete") with day-to-day work and "What's next" suggestions. (`home.html` is the same home **before setup**, showing the onboarding checklist.)

**Flow:**
1. Same sidebar (Home, Freelancers, Invoices, Time) and header pattern as `home.html`.
2. While pending, shows the "You're 17% there" progress card and the 6-step setup checklist; the active step's "Start" links to `client-onboarding.html`.
3. When complete, a "You're all set, Aman!" card (6 of 6 steps, "Setup complete" pill) replaces it, followed by "What's next" cards (e.g. Add your first freelancer → `add-freelancer.html`).
4. Tab views mirror home: Freelancers, Freelancer invoices and Leaves tables with empty states.

**Notes:** Functionally close to `home.html`; the distinguishing feature is the explicit completed-setup ("setupDone") variant.

---

## client-onboarding.html

**Purpose:** Multi-step KYC/onboarding wizard for a client business ("Set up your account"), collecting identity, ownership, documents, work profile and feature/compliance choices.

**Flow:**
1. Step 1 — Tell us about yourself (legal name, phone number).
2. Step 2 — Tell us about the people behind your business (directors: name, DOB, country, % ownership; ultimate beneficial owner).
3. Step 3 — Provide your documents (certificate of incorporation, business registration, tax registration / Business Registration Number, Tax ID).
4. Step 4 — Tell us about your work (brand/business name, work description, online presence such as LinkedIn/social/website, business address).
5. Step 5 — Features & compliance (module selection plus AML/CFT, sanctions, PEP and prohibited-activity confirmation checkboxes).
6. Step 6 — Review and confirm (final accuracy/authorization confirmation).

**Validations:** Each step is validated by `collectStepErrors()` before advancing; per-field inline error messages are shown and the active step scrolls to the first error.
- Step 1 legal name: required; min 2 characters; letters/spaces/`.'-` only (`/^[\p{L}][\p{L} .'-]*$/u`).
- Step 1 phone: required; digits only; min length per dial code (`PHONE_MIN`, default 7).
- Step 2 directors (each): name required; date of birth required and must be in the past, director must be ≥ 18 (computed age); country of residence required; % ownership required and 0–100.
- Step 2 combined ownership: total across directors cannot exceed 100%.
- Step 2 UBO: must add ≥ 1 director, then select an ultimate beneficial owner.
- Step 3 documents: in manual mode, business registration number and tax ID required; in upload mode, registration document required; a proof-of-business document upload is always required.
- Step 4: brand/business name required; work description required and ≥ 50 characters; online-presence URL required and must match `https?://…` with a TLD; any remaining `data-must` fields required.
- Step 5: all five declaration checkboxes (c1–c5: AML/CFT, sanctions, PEP, prohibited-activity) must be checked.
- Step 6: the review-confirm checkbox must be checked before submitting.

**Notes:** A progress footer advances through the 6 steps; reached from the home/dashboard setup checklist.

---

## contractor-onboarding.html

**Purpose:** Five-step wizard for a client to add a contractor ("Add a contractor"), capturing details, contract/payment terms, tax applicability, the signed agreement and invoicing preference.

**Flow:**
1. Step 1 — Add a contractor (company, full name, email, phone).
2. Step 2 — Contract & payment terms (start/end date, notice period, role and description, currency, payment rate, frequency, special clauses).
3. Step 3 — GST & Tax applicability (state of jurisdiction, signatory full legal name, email, designation).
4. Step 4 — Set up your contractor agreement (view/sign the template or upload a signed agreement; accuracy + terms checkboxes).
5. Step 5 — How should invoices be raised? (auto-generate monthly vs. on contractor request).

**Validations:** A `validateStep()` gate exists that disables "Save & continue" when any `input/textarea/select[data-must]` is empty or any `checkbox[data-must]` is unchecked, but in this page no inputs and neither agreement checkbox (`agree1`/`agree2`) carry `data-must` — so `validateStep()` always passes and no field is actually enforced.

**Notes:** Closely related to `add-freelancer.html`; this variant folds the invoicing-method choice in as a final wizard step rather than a separate page.

---

## add-freelancer.html

**Purpose:** Four-step wizard for a client to add a freelancer/contractor, covering details, contract & payment terms, tax applicability and the contractor agreement.

**Flow:**
1. Step 1 — Add a freelancer (contractor company, full name, email, phone).
2. Step 2 — Contract & payment terms (start/end date, notice period, role and description, currency, payment rate, frequency, special clauses).
3. Step 3 — GST & Tax applicability (state of jurisdiction, signatory full legal name, email, designation).
4. Step 4 — Set up your contractor agreement (view/sign template or upload signed agreement; accuracy + Wisemonk-terms checkboxes).

**Validations:** `validateStep()` disables "Save & continue" until every `data-must` field in the active step is filled (non-empty `.value.trim()`) and every `data-must` checkbox is checked; re-checked live on input/change. Required (`data-must`, marked with `*`) fields per step:
- Step 1: contractor's full name, email (`type="email"`), phone (`type="tel"`), start date (`type="date"`), role, scope-of-work description. (Contractor company, end date and notice period are optional.)
- Step 2: currency, payment rate (`type="number"`), frequency. (Special clauses optional.)
- Step 3: state of jurisdiction, signatory full legal name, signatory email (`type="email"`), designation. (Service-location/property choice cards are pre-selected, not gated.)
- Step 4: both agreement checkboxes (`agree1` accuracy/authorization, `agree2` Wisemonk terms) must be checked.
- A "no company website" toggle adds/removes `required` on the website field, but `validateStep()` only checks `data-must` (not `required`), so the website field is never gated.

**Notes:** Launched from the Freelancers view / command palette ("Add freelancer"). A progress footer drives the 4 steps. The invoicing-method step appears separately as `raise-invoices.html`.

---

## freelancers.html

**Purpose:** Roster of the client's freelancers and full-time employees with status filtering and add/compliance actions.

**Flow:**
1. Header actions: "Run compliance check" (→ `compliance.html`) and "Add freelancer" (→ `add-freelancer.html`).
2. A search box plus a status dropdown (All / Active / Inactive / Pending invite, with counts) filter the list.
3. A table lists each person by Name, Contract type, Rate and Status, with a row actions menu.

**Notes:** Includes the shared COR-comparison ("Switch to Contractor of Record") and Talk-to-sales modals.

---

## compliance.html

**Purpose:** Compliance audit screen that checks contracts, invoices and tax records for India contractor payments against Indian regulations.

**Flow:**
1. An intro ("Compliance audit") explains the check.
2. The audit tool itself is embedded via an iframe pointing to `https://legal.wisemonk.io/`.

**Notes:** Carries the standard sidebar/header chrome plus the shared command palette, COR-comparison and Talk-to-sales modals.

---

## invoices.html

**Purpose:** Freelancer-invoice inbox where the client reviews and pays invoices submitted by freelancers ("Freelancer invoices").

**Flow:**
1. "Generate invoice" opens a modal to raise an invoice on a contractor's behalf (select contractor, amount, due date, work description, with a fee breakdown showing what the contractor receives).
2. Search and a status dropdown (All / Due / Overdue / Paid / Draft) filter the table.
3. The table shows Invoice, Freelancer, Submitted, Due, Amount and Status; "Pay now" links forward to `pay.html?inv=…`.

**Notes:** Sits in the invoicing journey: invoicing-setup / raise-invoices → invoices → pay. Includes the shared COR and Talk-to-sales modals.

---

## invoicing-setup.html

**Purpose:** Per-freelancer invoicing configuration ("Set up invoicing") choosing how invoices flow each month for a specific freelancer.

**Flow:**
1. A breadcrumb (Freelancers / freelancer name / Set up invoicing) and freelancer context chip identify who is being configured.
2. An invoicing-mode selector toggles between "Auto-generate monthly" and "Wait for freelancer".
3. The Auto panel collects amount per cycle, currency, frequency, send-on day, start/end dates, description/line items, plus a behavior toggle (auto-approve and pay).

**Notes:** Entered from the Freelancers list. Distinct from `raise-invoices.html` (a wizard step), this is a richer per-freelancer settings screen and the first step of the invoicing journey.

---

## raise-invoices.html

**Purpose:** Single-step screen ("How should invoices be raised?") to pick a contractor's invoicing method during/after setup.

**Flow:**
1. Two option cards: "Auto-generate each month" (Wisemonk creates and sends on the 1st) vs. "On contractor request" (the contractor submits and the client approves).
2. "Finish setup" returns to `freelancers.html`.

**Notes:** Mirrors the invoicing-method step embedded in `contractor-onboarding.html`. Part of the invoicing journey: invoicing-setup / raise-invoices → invoices → pay.

---

## pay.html

**Purpose:** Three-stage payout flow ("Pay now") guiding the client through transferring funds for an invoice and tracking confirmation.

**Flow:**
1. Step 1 — Ready to Pay: shows the receiving bank account (bank, beneficiary, account number, routing/SWIFT with Swift/Wire toggle), amount, and a payment reference to copy. A "See what your freelancer gets" payout calculator is available; "I've made the payment" advances.
2. Step 2 — Matching your payment: a waiting state showing reference, date and amount while the transfer is verified.
3. Step 3 — Payment transfer initiated: confirmation that the payment was received and is being processed for payout.

**Notes:** Reached via "Pay now" links from `invoices.html` / `home.html` (carries the invoice number in the query string). Breadcrumb labels the screen "Pay now". Final step of the invoicing journey.

---

## check-inbox.html

**Purpose:** Post-sign-in confirmation ("Check your inbox") telling the user a verification email was sent.

**Flow:**
1. Displays the email address the link was sent to (from the query param).
2. Offers a "Resend" button and spam-folder guidance; "Resend" continues to `signup-role.html`.

**Notes:** A "Use a different email" link returns to `login.html`. Step between login and role selection in the signup flow.

---

## time.html

**Purpose:** Redirect stub for the Time section.

**Flow:**
1. Immediately redirects (meta refresh + JS) to `time-leaves.html`.

**Notes:** Holds no content of its own; it just routes the "Time" nav entry to the Leaves view.

---

## time-attendance.html

**Purpose:** Attendance tracking screen for the team ("Attendance") with work logs and attendance requests.

**Flow:**
1. Sub-nav links between Leaves and Attendance; header actions include "Clock in" and "Request WFH".
2. Tabs switch between "Logs" and "Attendance requests", with an "All time" date filter.
3. The Logs table shows Dates, Clock-in, Clock-out, Hours worked, Status and Actions; the requests table shows Dates, Reason, Status and Actions.

**Notes:** Part of the Time module alongside `time-leaves.html`; shares the COR-comparison and Talk-to-sales modals.

---

## time-leaves.html

**Purpose:** Leave management screen ("Leaves") for tracking and approving the team's time off.

**Flow:**
1. Sub-nav links between Leaves (active) and Attendance; a "Request leave" button opens a request panel.
2. A stats strip summarizes leaves taken this month, upcoming leaves and leaves pending approval.
3. A "Leave requests" table (search + All time / All status filters) lists Dates, Leave type, Reason, Status and Actions.

**Notes:** Default landing target of `time.html`. Part of the Time module with `time-attendance.html`; shares the COR-comparison and Talk-to-sales modals.
