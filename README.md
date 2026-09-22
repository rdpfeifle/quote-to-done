# Quote-to-Done

A lightweight job tracker for a small HVAC company, from quote to done, built with Next.js and Airtable.

**Live app:** [quote-to-done.vercel.app](https://quote-to-done.vercel.app)
**Airtable base (read-only):** [View the base](https://airtable.com/appLT4Tusjw667IpU/shrNhFwZuGJT5PQsG)

## Who it's for

Office staff who take incoming service calls and need to see where every job stands, without working inside Airtable's grid view.

## Features

- **New job form:** log a request with customer, equipment, job type, priority, and optional schedule, quote, and notes.
- **Job board:** every job grouped by status: Requested → Quoted → Scheduled → Done.
- **Move jobs your way:** drag a card on desktop, or pick a status from a dropdown on mobile (also keyboard friendly).

## Tech stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS v4 with custom design tokens
- dnd-kit for drag and drop
- lucide-react icons
- Archivo + IBM Plex Sans, self-hosted with `next/font`
- Airtable as the database, via its REST API
- Deployed on Vercel

## Design decisions

- **The token never reaches the browser.** All Airtable calls go through server-side route handlers, using a personal access token scoped to this one base with only the permissions the app needs.
- **Airtable controls the options.** The form's dropdowns (job type, equipment, priority) are read from the base schema at runtime, so editing a select field in Airtable updates the app with no code change.
- **Built for one niche.** Fields are specific to HVAC.
- **Drag and drop plus a dropdown.** Dragging is fast on desktop, and the dropdown covers mobile and keyboard users.

## Data model

| Table   | Key fields                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Clients | Name, Email, Phone, Address                                                                          |
| Jobs    | Title, Customer (linked), Job Type, Equipment, Priority, Status, Quote Amount, Scheduled Date, Notes |

`Title` is a formula — `Equipment & " " & Job Type & " - " & Customer` — so it is read-only. The app never writes it, and the new job form previews the computed name instead.

## Running locally

Requires Node 20.9 or newer.

```bash
git clone https://github.com/rdpfeifle/quote-to-done.git
cd quote-to-done
npm install
```

Create a `.env` file:

```
AIRTABLE_API_KEY=your_personal_access_token
AIRTABLE_BASE_ID=your_base_id
```

The token needs `data.records:read`, `data.records:write`, and `schema.bases:read`.

```bash
npm run dev
```

## What I'd add next

- A public request form for customers
- Customer search and duplicate detection by email
- Notifications when a job is scheduled
