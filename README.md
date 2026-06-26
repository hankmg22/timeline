# Timeline Studio

A dark, minimalist timeline editor that runs entirely in the browser. It is designed to be easy to put on GitHub Pages and easy to share with a collaborator through exported JSON timeline files.

## Features

- Horizontal timeline starting at the current date.
- Adaptive tick marks for days, weeks, months, quarters, and years.
- Spacebar drag panning, trackpad/mouse wheel panning, and Ctrl/Cmd + wheel zoom.
- Double-click the canvas to create an event at a date.
- Draggable, resizable event cards connected to their original timeline anchor.
- Event text styling, image upload, colors, and card sizing.
- Multiple projects with create, rename, duplicate, and delete actions.
- Local browser saving plus JSON import/export for GitHub-friendly collaboration.

## Run Locally

Open `index.html` in a browser.

For a local server, you can also run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

1. Commit `index.html`, `styles.css`, `app.js`, and `README.md`.
2. Push the repository to GitHub.
3. In the repository settings, open **Pages**.
4. Choose the branch you pushed, usually `main`, and select the repository root.
5. Save. GitHub will publish the app as a static site.

## Collaboration

Use the export button to download a `.timeline.json` file. Commit that file to GitHub or send it to your partner. They can import it with the import button, edit it, export it again, and commit the updated JSON.

The app saves locally in the browser automatically. Export JSON whenever you want a version-controlled checkpoint.
