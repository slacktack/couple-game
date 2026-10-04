# Game Club

A cozy, clue-led game night for two. Built with React and Vite; ready to deploy to Vercel.

## Run it

```bash
npm install
npm run dev
```

The player routes are `/his` for Player A and `/hers` for Player B. Both have separate clue books, progressive hints, and read-aloud buttons. Each game opens with its complete rules, a His/Her role picker, and a clear start button. `/library` contains the page-by-page player packs, private cards, and host guides, with a speaker button on each page. The site also has a persistent light/dark mode switch and a read-the-current-screen control. Voice playback uses the browser's built-in speech voice; no audio is uploaded.

## Build and deploy

```bash
npm run build
```

Import this repository into Vercel and use the default Vite settings. The included `vercel.json` sends direct visits to the player routes back through the app. You can also deploy from a signed-in Vercel CLI with `vercel deploy --prod`.

## How progress and privacy work

Clue answers and progress stay in the current browser's `localStorage`; player routes do not sync state between separate devices. Use a call or chat to share the information each route is meant to share. The private-page interstitials are spoiler guards, not account security: this static frontend also contains the reading content needed to show each page. The source PDFs are kept at the project root for local reference and are ignored by Git and Vercel.

The Message extraction in the original Distance Protocol player pack has an inconsistency. The playable version uses a lightly corrected final five-sentence layer so its intended answer is unambiguous. The Observatory Lock source sheet mentions a missing poem in Lock 04; the playable version follows the host guide's complete Caesar-shift route to COMET.
