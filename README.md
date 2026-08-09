# Bramble & Co. — booking demo

A test/demo booking website: pick a service, pick an open time slot, and book it. Sign in to see your own bookings, or sign in as the studio admin to see every booking made across the site.

**This is a front-end-only demo.** There is no server and no database — everything (accounts, sessions, bookings) is stored in your browser's `localStorage`. Passwords are stored in plain text. Don't reuse a real password here, and don't treat this as production-ready auth.

## Running it

It's static HTML/CSS/JS — no build step, no dependencies. Either:

- Open `index.html` directly in a browser, or
- Serve the folder with any static server, e.g. `npx serve .` or GitHub Pages.

## Demo accounts

| Role   | Email                 | Password      |
|--------|------------------------|----------------|
| Admin  | admin@bramble.test     | admin123       |
| Client | jordan@example.com     | password123    |

You can also create a new account from the sign-in screen — it becomes a regular client account.

## What's in it

- **Book** (`#/book`) — service picker, a 7-day date strip, and a live grid of open/booked time slots. Booking works whether you're signed in or not (guest bookings just need a name and email).
- **My bookings** (`#/account`) — every booking tied to the signed-in email, with cancel.
- **Dashboard** (`#/admin`) — visible only to the admin account: stats for today/this week, and a filterable table of every booking with mark-complete / cancel actions.
- A light/dark theme toggle in the header, persisted across visits.

## Files

- `index.html` — page shell and header/nav
- `styles.css` — design tokens and all styling
- `app.js` — routing, state, and rendering (vanilla JS, no framework)
