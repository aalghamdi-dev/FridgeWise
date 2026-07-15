# FridgeWise 🍐

A smart, community-powered kitchen inventory assistant designed to reduce domestic food waste, organize active ingredients, and suggest recipes powered by Artificial Intelligence.
## visit the live app : https://fridgewise.ai.studio
---

## 📅 Project Activity: Week 2

This project was developed as part of **Week 2** coursework and practical learning. The objective was to design, specify, and implement a fully-functional AI-driven application from scratch using modern automated methodologies:

1. **AI Application Specification**: Drafted a comprehensive blueprint detailing full-stack requirements, shared data tables, instant authorization, and local-first caching strategies.
2. **Implementation via Vibecoding**: Developed the complete frontend, backend proxy, shared persistence database, and QR/Barcode hardware scanner using collaborative natural language iteration (vibecoding) with an agentic coder.
3. **Primary Tech Stack**: Built entirely using **Google AI Studio** with the state-of-the-art **Gemini 3.5 Flash** model guiding the design, execution, linting, and server-side integrations.

---

## 🌟 Key Features

### 🔑 Multi-User Database & Instant Logins
* **Dynamic 8-Digit Fridge IDs**: Users can generate or enter an 8-character code containing uppercase, lowercase, and numeric characters (e.g., `A9x7K2pQ`) to access their personal kitchen inventory.
* **Instant Automatic Sign-In**: The application uses synchronized **Secure Cookies** (persisting up to 365 days) and **HTML5 Local Storage** to verify and instantly log users into their respective Fridges without requiring complex manual credentials on return visits.
* **Seamless Cross-Device Collaboration**: Multiple household members can enter the exact same Fridge ID on separate smartphones, tablets, or laptops to manage a unified physical kitchen inventory.

### 📦 Crowdsourced Barcode Memory Database
* **Shared UPC Lookup Table**: Includes a server-side shared barcode catalog. When any user scans or inputs a custom barcode, the item's name, category, and default shelf-life are stored globally.
* **Collective Intelligence**: All subsequent users who scan that exact barcode instantly benefit from the pre-populated item details, accelerating manual entries for the entire community.

### 📷 Smart Camera Barcode Scanner
* **On-Demand Camera Access**: Strictly respects browser privacy regulations. The application requests camera access **only** when the user actively clicks "Scan Barcode with Camera".
* **Auto-Teardown Hardware Controls**: The video stream, media tracks, and camera device are instantly terminated and released the moment a barcode is scanned or the modal is closed.

### 🥗 Dynamic Expiry Advisory & AI Recipe Generation
* **Active Shelf-life Trackers**: Displays real-time status banners with relative indicators (e.g., *expiring tomorrow*, *expired 2 days ago*).
* **Smart Ingredients Extraction**: Automatically pre-selects ingredients nearing expiration.
* **Gemini AI Recipe Builder**: Queries generative models to compose customizable, step-by-step recipes utilizing whatever ingredients are currently resting inside your fridge.

---

## 🛠️ Technology & Architecture

* **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, and Framer Motion.
* **Backend Server**: Node.js, Express, and Vite Middleware (on port `3000` with strict CORS and CSP headers).
* **Camera Integration**: HTML5-Qrcode SDK for environment-facing active lens tracking.
* **Persistent Storage**: Server-side JSON-flatfile DB managing relational structures for multi-user fridges and shared barcode maps.
