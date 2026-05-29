# Wisemonk — Signup Flow & Client Portal

Static HTML mockups for the Wisemonk signup flow and client dashboard.

## Pages

### Signup flow
- **`login.html`** — entry point · email + Continue with Google
- **`check-inbox.html`** — verification email screen
- **`signup-role.html`** — role selection (Pay & manage talent / Get paid)
- **`signup-country.html`** — country picker with searchable dropdown

### Onboarding
- **`dashboard.html`** — 5-step onboarding checklist (Verify email · Personal details · Tax · Payment · First contractor)

### Client portal
- **`home.html`** — dashboard with stats + "Needs your approval" payment requests + Recent Activity feed
- **`freelancers.html`** — team management table with status filter dropdown
- **`invoices.html`** — invoices table with status filter + side-panel detail view + Pay now CTA
- **`time.html`** — hours-by-day chart + by-contractor breakdown + entries table
- **`pay.html`** — 3-step payment flow (Ready to pay → Matching → Initiated)

## Design system

- **Font:** Satoshi (headings/body) + Open Sans Light (labels/tags)
- **Primary blue:** `#2684FF`
- **Page bg:** `#F1F8FF`
- **Shared table chrome:** `wm-table.css`

## Flow

```
login.html
   ↓ (Sign up)
check-inbox.html
   ↓ (Resend)
signup-role.html
   ↓ (pick role)
signup-country.html
   ↓ (Continue)
dashboard.html (onboarding)
   ↓ (Start)
home.html (post-setup dashboard)
   ↔ freelancers.html · invoices.html · time.html
   ↓ (Pay now on an invoice)
pay.html
```

Open `login.html` in a browser to walk through the entire flow.
