# SkellingChat

SkellingChat is a **fully client-side character chat app**. You open it in a
browser, choose a persona, and chat with a local language model that runs
directly on your machine using Transformers.js + ONNX.

No backend server, no API keys, and no cloud inference are required.

---

## What this project does

- Runs a chat UI with multiple built-in personas (Jack Skellington, Midnight
  Witch, Mad Scientist, and more).
- Uses the model **`onnx-community/Qwen2.5-0.5B-Instruct`** in the browser.
- Formats prompts in ChatML so the model can maintain multi-turn conversation context.
- Lets you stop generation, switch personas, and continue chatting instantly.

---

## Quick start (recommended)

### 1) Clone the repo

```bash
git clone <your-repo-url>
cd SkellingChat
```

### 2) Serve the files locally

You must run this as a local web server (opening `index.html` directly via
`file://` is not recommended).

If you have Node.js installed:

```bash
npx http-server .
```

Then open the URL shown in your terminal (usually `http://127.0.0.1:8080`).

### 3) Start chatting

1. Pick a character card at the top.
2. Type your message in the input area.
3. Press **Enter** to send (**Shift+Enter** for newline).

---

## Requirements

- A modern desktop browser (latest Chrome/Edge/Firefox recommended).
- Internet access on first run to download model assets from Hugging Face/CDN.
- Enough RAM/VRAM for browser-based inference (light model, but still non-trivial).

> First load can take a while because model files are downloaded and initialized.

---

## How it works

### Runtime

- `@xenova/transformers` is loaded in `js/chat.js` from jsDelivr.
- A text-generation pipeline is created in-browser.
- Inference is executed locally in the user’s browser session.

### Model

Default model constant in `js/chat.js`:

- `onnx-community/Qwen2.5-0.5B-Instruct`

You can swap this by changing `LOCAL_MODEL` in `js/chat.js`.

### Prompting

- Conversation is assembled with ChatML tokens (`<|im_start|>`, `<|im_end|>`).
- Persona-specific system prompts are prepended.
- Previous turns are included for context before each generation.

---

## Project structure

```text
SkellingChat/
├── index.html          # Main app shell and persona UI
├── js/
│   ├── chat.js         # Persona logic, prompt building, local generation
│   ├── jquery-3.3.1.min.js
│   └── autosize.min.js
├── css/
│   ├── style.css       # App styling
│   └── bootstrap.min.css
├── img/                # Static image assets
├── _headers            # COOP/COEP/CORP response headers for deployments
└── README.md
```

---

## Deployment notes

This repo includes a `_headers` file with cross-origin policies:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`

These headers are useful for browser runtime compatibility/performance
patterns related to local model execution.

If you deploy on a static host (e.g., Netlify/Cloudflare Pages), make sure
these headers are actually applied in production.

---

## Configuration

All core generation settings are in `js/chat.js`:

- `max_new_tokens`
- `temperature`
- `top_p`
- `do_sample`
- `repetition_penalty`

If responses are too random, lower `temperature`.
If responses are too short, increase `max_new_tokens`.

---

## Troubleshooting

### App loads but model doesn’t respond

- Check browser console errors.
- Refresh once after initial model download.
- Try a Chromium-based browser if your current browser has runtime limitations.

### Very slow generation

- This is expected on lower-power devices.
- Close heavy tabs/apps to free memory.
- Use a smaller model by updating `LOCAL_MODEL`.

### Out-of-memory / crashes

- Reload the page and retry.
- Reduce model size.
- Keep fewer memory-intensive tabs open.

### CORS / cross-origin errors in deployment

- Verify `_headers` is being honored by your host.
- Confirm static assets are served with required policies.

---

## Development workflow

Because this is a static app, iteration is simple:

1. Edit HTML/CSS/JS files.
2. Refresh the browser.
3. Repeat.

No build step is required.

---

## FAQ

### Does this send chat messages to a backend?

No app backend is included here. Inference is designed to run in-browser.

### Do I need an API key?

No.

### Can I add my own persona?

Yes. Add a new entry in the `PERSONAS` object in `js/chat.js` and a matching
button in `index.html`.

---

## License

See [LICENSE](./LICENSE).
