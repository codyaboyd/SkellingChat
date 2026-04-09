# SkellingChat
A browser-based Jack Skellington chatbot that now runs fully client-side with Transformers.js and a local ONNX model.

## Model/runtime
- Runtime: [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) loaded from jsDelivr.
- Default model: `onnx-community/SmolLM2-360M-Instruct`.
- Inference happens in the browser (no Petals/Hivemind backend required).

## Usage
Serve the repo as a static site and open it in your browser:

```bash
npx http-server
```

Then visit the local URL shown in your terminal.

## Headers
This repo includes a `_headers` file to set the following cross-origin policies for all routes:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`
