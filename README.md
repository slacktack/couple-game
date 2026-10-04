# Game Club

A cozy, clue-led game night for two. Built with React and Vite; ready to deploy to Vercel.

## Run it

```bash
npm install
npm run dev
```

The player routes are `/his` for Player A and `/hers` for Player B. Both have separate clue books, progressive hints, and a read-aloud button. The game routes are `/play/protocol`, `/play/case`, and `/play/observatory`. `/library` contains the page-by-page player packs, private cards, and host guides.

## Build and deploy

```bash
npm run build
```

Import this repository into Vercel and use the default Vite settings. The included `vercel.json` sends direct visits to the player routes back through the app.

## How progress and privacy work

Clue answers and progress stay in the current browser's `localStorage`; player routes do not sync state between separate devices. Use a call or chat to share the information each route is meant to share. The private-page interstitials are spoiler guards, not account security: this static frontend also contains the reading content needed to show each page. The source PDFs are kept at the project root for local reference and are ignored by Git and Vercel.

The Message extraction in the original Distance Protocol player pack has an inconsistency. The playable version uses a lightly corrected final five-sentence layer so its intended answer is unambiguous. The Observatory Lock source sheet mentions a missing poem in Lock 04; the playable version follows the host guide's complete Caesar-shift route to COMET.
