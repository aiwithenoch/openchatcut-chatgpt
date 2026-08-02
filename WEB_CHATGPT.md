# OpenChatCut + ChatGPT login prototype

This fork adds two ChatGPT subscription paths:

- Desktop: the upstream OpenAI Codex CLI login already present in OpenChatCut.
- Web: per-browser Login with ChatGPT sessions through the experimental
  `@opencoredev/loginwithchatgpt-*` packages.

## Run the web MVP

Use Node 24 and create a stable 32-byte-or-longer secret:

```bash
nvm use 24
export LWC_SECRET="$(openssl rand -hex 32)"
npm install
npm run build
npm run start:web
```

Open <http://127.0.0.1:5199>, click **Login with ChatGPT**, review the consent
screen, and authorize. Models available to that ChatGPT account are added to
the editor's model selector.

## Deploy on Vercel

The repository includes a Vercel serverless route for `/api/chatgpt/*`. Set
`LWC_SECRET` to a stable random value of at least 32 characters in the Vercel
project for Production, Preview, and Development before deploying.

The browser editor and ChatGPT login work on Vercel. Server-side video jobs
that need persistent local files or long-running FFmpeg processes still require
a separate worker and object storage before a public multi-user launch.

## Production warning

This is a private MVP, not a safe multi-tenant deployment yet. Before exposing
it to public users, replace the in-memory ChatGPT session and rate-limit stores
with Redis or a database, isolate projects/uploads/exports per application
account, protect administrative settings, add application authentication,
publish privacy/terms pages, and complete an independent security review.

The ChatGPT login SDK is unofficial and may stop working if OpenAI changes its
subscription-backed endpoints. Keep another model route available.
