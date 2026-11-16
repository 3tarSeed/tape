# Tape

Live LED market ticker for the bottom of a Mac or Windows desk.

## Netlify

1. In Netlify, choose **Add new site** → **Import an existing project** → **GitHub**.
2. Pick this repository.
3. Confirm these build settings (they also live in `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node: 22
4. Deploy. Open the site URL Netlify gives you.

Then in Chrome or Edge, use **Install** in the address bar. In Safari on a Mac, use **File → Add to Dock**. In Tape, turn on **Bar only** and resize the window to the bottom of the screen.
