# FridgeWise 🍐

A smart, community-powered kitchen inventory assistant that helps reduce food waste, track what's in your fridge, and get AI-generated recipe ideas from what you actually have on hand.

**Live app:** https://fridgewise.ai.studio

*A project for Summer Training Week 2 at KAU HPC Center.*

---

## Key Features

### 🔑 Multi-User Fridge Access
- **8-Character Fridge ID** — Generate or enter a code (mixed upper/lowercase letters and numbers, e.g. `A9x7K2pQ`) to access a personal kitchen inventory.
- **Automatic Sign-In** — A secure cookie and local storage remember your Fridge ID, so returning users are signed in instantly without re-entering it.
- **Shared Access** — Multiple people can use the same Fridge ID on different devices to manage one household inventory together.

### 📦 Shared Barcode Database
- Scanning or entering a barcode saves its name, category, unit, and unit size to a shared table.
- The next user who scans that same barcode gets those details auto-filled, so entry gets faster the more people use the app.

### 📷 Camera Barcode Scanner
- Camera access is requested only when you tap "Scan Barcode" — never on page load.
- The camera closes automatically as soon as a barcode is read or the scanner is closed.
- Powered by Google ML Kit for barcode detection.

### 🥗 Expiry Tracking & AI Recipes
- Shows each item's status (e.g. *expiring tomorrow*, *expired 2 days ago*).
- Automatically highlights ingredients that are close to expiring.
- Generates recipe suggestions from your current fridge contents using an AI model, called through OpenRouter.

---

## Tech Stack
- **Frontend** — React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend** — Node.js, Express, Vite Middleware (port `3000`, with CORS/CSP headers)
- **AI** — OpenRouter API (model set via environment variable — see `.env.example`)
- **Barcode Scanning** — Google ML Kit
- **Storage** — Server-side JSON flat-file database for fridges and the shared barcode table

---

## How This Was Built
FridgeWise was built in Google AI Studio through an iterative, natural-language development process ("vibecoding") rather than hand-written code. It went through several rounds of testing and refinement — fixing the AI integration, the barcode scanner, and the database schema — as gaps were found through real use.

---

## About
Smart food tracking & personalized AI recipe generation.
🔗 [fridgewise.ai.studio](https://fridgewise.ai.studio)
