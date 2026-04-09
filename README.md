# SkellingChat
Demo of Hivemind/Petals distributed inference by chatting with The Pumpkin King.

## Usage
```bash
npx http-server
```

## Headers
This repo now includes a `_headers` file to set the following cross-origin policies for all routes:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: cross-origin`
