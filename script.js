/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");
// Ensure hidden initially
if (latestQuestion) latestQuestion.hidden = true;

/* Set initial message */
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* New: helper to escape HTML and updated form handler */

// Escape user-provided text to avoid injecting HTML into the page
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* Optional: put your public Cloudflare Worker URL here for convenience.
   This URL is public (it doesn't contain secrets), so it's safe to add here.
   Example: const LOCAL_WORKER_URL = 'https://my-worker.example.workers.dev';
*/
const LOCAL_WORKER_URL_RAW = "https://project.rtorre79.workers.dev/"; // <-- replace with your Worker URL
// Normalize: remove any trailing slash so endpoint concatenation is predictable
const LOCAL_WORKER_URL = LOCAL_WORKER_URL_RAW
  ? LOCAL_WORKER_URL_RAW.replace(/\/+$/, "")
  : "";

// Helper to resolve the worker endpoint in this order:
// 1) LOCAL_WORKER_URL set above
// 2) WORKER_URL provided by secrets.js (optional, local file)
// 3) null (meaning fallback to direct OpenAI API)
function resolveWorkerEndpoint() {
  if (LOCAL_WORKER_URL && LOCAL_WORKER_URL.startsWith("http"))
    return LOCAL_WORKER_URL;
  if (
    typeof WORKER_URL !== "undefined" &&
    WORKER_URL &&
    WORKER_URL.startsWith("http")
  ) {
    // normalize any value from secrets.js too
    return WORKER_URL.replace(/\/+$/, "");
  }
  return null;
}

// New helper: try to extract assistant text from a variety of response shapes
function extractAssistantContent(data) {
  // Typical OpenAI chat completion
  if (
    data &&
    data.choices &&
    Array.isArray(data.choices) &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content
  ) {
    return data.choices[0].message.content;
  }

  // Some proxies/workers might return the assistant content under `assistant`, `reply`, or nested `body`
  if (data && typeof data.assistant === "string") return data.assistant;
  if (data && typeof data.reply === "string") return data.reply;
  if (data && data.body) {
    // worker forwarded the raw OpenAI response in `body`
    try {
      const parsed =
        typeof data.body === "string" ? JSON.parse(data.body) : data.body;
      if (
        parsed &&
        parsed.choices &&
        parsed.choices[0] &&
        parsed.choices[0].message &&
        parsed.choices[0].message.content
      ) {
        return parsed.choices[0].message.content;
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  // If worker returned an error object with message, return that for clearer UI
  if (data && data.error && data.error.message) {
    const serverMsg = data.error.message;
    // Detect common misconfiguration where the worker has no OpenAI key and forwards "undefined"
    if (
      serverMsg.includes("Incorrect API key provided") &&
      serverMsg.includes("undefined")
    ) {
      return "Cloudflare Worker misconfigured: the worker's OpenAI API key is missing (shows 'undefined'). Store your OpenAI key in Cloudflare Worker Variables & Secrets and redeploy.";
    }
    return `Error from server: ${serverMsg}`;
  }
  if (data && data.message && typeof data.message === "string")
    return `Server message: ${data.message}`;

  return null;
}

/* Conversation history for multi-turn context */
const conversationHistory = [
  // start with system prompt if available, otherwise a safe placeholder
  {
    role: "system",
    content:
      typeof SYSTEM_PROMPT !== "undefined"
        ? SYSTEM_PROMPT
        : "You are a helpful assistant focused on L'Oréal products and beauty topics.",
  },
];

// Build the messages array to send: system prompt + last N items (user/assistant)
function buildMessagesToSend(maxTurns = 20) {
  // If SYSTEM_PROMPT is defined later (fallback), ensure the system entry is current
  if (typeof SYSTEM_PROMPT !== "undefined") {
    conversationHistory[0] = { role: "system", content: SYSTEM_PROMPT };
  }
  // Keep only the most recent maxTurns of user/assistant entries (exclude system at index 0)
  const turns = conversationHistory.slice(1);
  const lastTurns = turns.slice(-maxTurns);
  return [conversationHistory[0], ...lastTurns];
}

/* Handle form submit: capture input, call OpenAI Chat Completions API, display reply */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get and trim input
  const text = userInput.value.trim();
  if (!text) return;

  // Display the latest question above the chat response (resets each submit)
  if (latestQuestion) {
    latestQuestion.hidden = false;
    latestQuestion.innerHTML = `<div class="latest-label">Your question</div><div class="latest-text">${escapeHtml(
      text
    )}</div>`;
  }

  // Show the user's message in the chat window
  chatWindow.innerHTML += `<div class="message user"><strong>You:</strong> ${escapeHtml(
    text
  )}</div>`;
  userInput.value = "";
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Add user's message to conversation history (so it's included in next request)
  conversationHistory.push({ role: "user", content: text });

  // Add a temporary "thinking" indicator
  const typingId = `typing-${Date.now()}`;
  chatWindow.innerHTML += `<div id="${typingId}" class="message bot"><em>Thinking...</em></div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Build messages array from conversationHistory (system + last N turns)
    const messages = buildMessagesToSend(20);

    // Call the OpenAI Chat Completions API using fetch and async/await
    // Note: OPENAI_API_KEY must be defined in secrets.js and included before this script in index.html
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o", // course uses gpt-4o by default
        messages: messages, // send full messages array so the model has history
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    // Parse JSON response
    const data = await resp.json();

    // Extract assistant content following OpenAI chat completion shape
    const content =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't get a response. Please try again.";

    // Add assistant reply to conversation history for future turns
    conversationHistory.push({ role: "assistant", content });

    // Trim conversationHistory to keep payload reasonable (keep system + last 40 entries)
    const maxHistory = 41; // 1 system + 40 entries => ~20 turns
    if (conversationHistory.length > maxHistory) {
      const keep = conversationHistory.slice(-(maxHistory - 1)); // exclude system
      conversationHistory.length = 0;
      conversationHistory.push({
        role: "system",
        content:
          typeof SYSTEM_PROMPT !== "undefined"
            ? SYSTEM_PROMPT
            : "You are a helpful assistant focused on L'Oréal products and beauty topics.",
      });
      conversationHistory.push(...keep);
    }

    // Replace the typing indicator with the assistant's message
    const typingElem = document.getElementById(typingId);
    if (typingElem) {
      typingElem.outerHTML = `<div class="message bot"><strong>L'Oréal Assistant:</strong> ${escapeHtml(
        content
      )}</div>`;
    } else {
      chatWindow.innerHTML += `<div class="message bot"><strong>L'Oréal Assistant:</strong> ${escapeHtml(
        content
      )}</div>`;
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
  } catch (err) {
    // Show error message in the chat window
    const typingElem = document.getElementById(typingId);
    const msg = err && err.message ? err.message : String(err);
    const errorHtml = `<div class="message bot error">Error: ${escapeHtml(
      msg
    )}</div>`;
    if (typingElem) {
      typingElem.outerHTML = errorHtml;
    } else {
      chatWindow.innerHTML += errorHtml;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
});

// Fallback: if SYSTEM_PROMPT isn't provided via system_prompt.js, define a safe default.
// This prevents the "SYSTEM_PROMPT is not defined" error and enforces L'Oréal-only behavior.
// If you add system_prompt.js, it should be included before script.js and will override this.
if (typeof SYSTEM_PROMPT === "undefined") {
  window.SYSTEM_PROMPT = `
You are a helpful conversational assistant focused ONLY on L'Oréal products and beauty topics.
Answer questions about L'Oréal makeup, skincare, haircare, fragrances, product details, comparisons, and personalized beauty routines or recommendations. Be concise, factual, and polite.

If a user asks about topics outside L'Oréal products or general beauty care (for example politics, illegal activities, unrelated technical questions, or requests about non-beauty brands not relevant to L'Oréal), politely refuse and state that you can only help with L'Oréal product information, routines, and beauty-related advice. If a question requires medical or professional diagnosis, recommend consulting a qualified professional.
  `.trim();
}
