// Public deployment-friendly config file.
// IMPORTANT: This file is safe to commit and deploy because it DOES NOT contain your OpenAI secret.
// Store your real OpenAI API key in your Cloudflare Worker (Variables & Secrets) or another secure secret manager.

// Put your deployed Cloudflare Worker URL here (public endpoint). Example:
// const WORKER_URL = 'https://my-worker.example.workers.dev';
const WORKER_URL = "https://project.rtorre79.workers.dev/";

// OPTIONAL: keep a placeholder for OPENAI_API_KEY for local testing only.
// Leave empty for deployments (do NOT commit a real key).
const OPENAI_API_KEY =
  "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"; // <-- empty by default. For local testing only (not recommended).

// Notes:
// - To keep your API key secret, add it in Cloudflare dashboard → Workers → Variables & Secrets (name it OPENAI_API_KEY)
//   and ensure your worker reads it (e.g., env.OPENAI_API_KEY) before forwarding requests to OpenAI.
// - If you must test locally without a worker, temporarily set OPENAI_API_KEY here, then remove it before committing.
