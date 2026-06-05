const PRODUCT = "Webhook Delivery Failure Briefs";
const STORAGE_PREFIX = "webhookdeliveryfailurebriefs";
const ISSUE_URL = "https://github.com/ert93333-ops/webhook-delivery-failure-briefs/issues/new?template=demo_request.md&labels=early-access%2Cpurchase-intent%2Cdemo-request&title=Early%20access%20request%3A%20Webhook%20Delivery%20Failure%20Briefs";

const fields = {
  failure: document.querySelector("#failure-notes"),
  scope: document.querySelector("#scope-notes"),
  event: document.querySelector("#event-notes"),
  reason: document.querySelector("#reason-notes"),
  retry: document.querySelector("#retry-notes"),
  action: document.querySelector("#action-notes"),
  recovery: document.querySelector("#recovery-notes"),
  caveat: document.querySelector("#caveat-notes"),
  owner: document.querySelector("#owner-notes"),
  tone: document.querySelector("#tone-notes"),
};

const output = document.querySelector("#brief-output");
const outputStatus = document.querySelector("#output-status");
const workflowError = document.querySelector("#workflow-error");
const copyButton = document.querySelector("#copy-brief");
const copyStatus = document.querySelector("#copy-status");
const intentForm = document.querySelector("#intent-form");
const intentStatus = document.querySelector("#intent-status");
const remoteIntent = document.querySelector("#remote-intent");
const remoteIntentLink = document.querySelector("#remote-intent-link");
const remoteCopyButton = document.querySelector("#copy-remote-intent");
const remoteCopyStatus = document.querySelector("#remote-copy-status");

let lastBriefText = "";
let selectedPlan = "Starter";
let lastRemoteBody = "";

function track(event, detail = {}) {
  const payload = {
    event,
    detail,
    page: window.location.pathname,
    utm: Object.fromEntries(new URLSearchParams(window.location.search)),
    at: new Date().toISOString(),
  };
  const key = `${STORAGE_PREFIX}_analytics_events`;
  const events = JSON.parse(localStorage.getItem(key) || "[]");
  events.push(payload);
  localStorage.setItem(key, JSON.stringify(events.slice(-200)));
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function fieldText() {
  return Object.fromEntries(Object.entries(fields).map(([key, element]) => [key, element.value.trim()]));
}

function combinedText(values) {
  return Object.values(values).join("\n").toLowerCase();
}

function missingChecks(values) {
  const all = combinedText(values);
  const scopeText = `${values.failure} ${values.scope}`.toLowerCase();
  const eventText = `${values.failure} ${values.event}`.toLowerCase();
  const retryText = `${values.failure} ${values.retry}`.toLowerCase();
  const recoveryText = `${values.recovery} ${values.caveat}`.toLowerCase();
  const replayDiscussed = hasAny(`${retryText} ${recoveryText}`, [/\b(retry|retried|redeliver|redelivery|resend|replay|backfill|manual resend|reconcile|reconciliation)\b/]);
  const dataLossImplied = hasAny(all, [/\b(lost|missing event|missed event|dropped|data loss|data-loss|backfill|exhausted|failed after|all retries failed)\b/]);

  const checks = [
    {
      label: "missing affected webhook endpoint, destination, app, workspace, or customer integration scope:",
      ok: hasAny(scopeText, [/\b(webhook endpoint|endpoint url|destination|destination id|customer-api|integration|workspace|app|tenant|production endpoint|customer-owned endpoint|delivery endpoint)\b/, /https?:\/\/[^\s]+/]),
    },
    {
      label: "missing event type, object/entity scope, or delivery window:",
      ok: hasAny(eventText, [/\b(event type|event id|delivery window|object|entity|invoice\.|payment_intent|checkout\.|customer\.|order\.|subscription\.|repository\.|push|issue|created|updated|deleted|from \d{1,2}:\d{2}|to \d{1,2}:\d{2}|utc)\b/]),
    },
    {
      label: "missing failure reason or delivery outcome:",
      ok: hasAny(`${values.failure} ${values.reason}`.toLowerCase(), [/\b(non-2xx|non 2xx|status code|400|401|403|404|405|410|429|500|502|503|504|timeout|timed out|tls|ssl|redirect|3xx|4xx|5xx|disabled endpoint|network error|connection refused|unable to connect|waf|firewall)\b/]),
    },
    {
      label: "missing attempt count, latest attempt timestamp, next retry time, retry cadence, or retry exhaustion state:",
      ok: hasAny(retryText, [/\b(attempt|attempts|latest attempt|last attempt|next retry|retry at|retry window|retry cadence|backoff|exponential|exhausted|failed after|delivery attempts|redelivery|manual resend|utc|within \d+|after \d+)\b/]),
    },
    {
      label: "missing customer action for endpoint availability, POST method, 2xx response, TLS, allowlist, or endpoint owner review:",
      ok: hasAny(`${values.failure} ${values.action}`.toLowerCase(), [/\b(customer action|check endpoint|endpoint owner|available|publicly accessible|return 2xx|respond with 2xx|post method|accepts post|tls|ssl|allowlist|allow-list|firewall|waf|update endpoint|fix endpoint|acknowledge|respond within)\b/]),
    },
    {
      label: "missing replay, manual resend, backfill, reconciliation, or support handoff path:",
      ok: hasAny(`${values.failure} ${values.recovery}`.toLowerCase(), [/\b(replay|redeliver|redelivery|resend|manual resend|manual retry|backfill|reconcile|reconciliation|missed events|support handoff|support ticket|request replay|delivery log|event deliveries)\b/]),
    },
    {
      label: "missing duplicate/idempotency/out-of-order caveat when replay or retry is discussed:",
      ok: !replayDiscussed || hasAny(recoveryText, [/\b(idempotent|idempotency|duplicate|dedupe|already processed|processed once|out of order|ordering|safe to ignore|ignore duplicate|event id)\b/]),
    },
    {
      label: "missing data-loss/no-data-loss caveat when the draft implies one:",
      ok: !dataLossImplied || hasAny(`${values.caveat} ${values.recovery}`.toLowerCase(), [/\b(no evidence of data loss|data loss under review|not a data-loss guarantee|reconcile|backfill|missed events|delivery log|do not overstate|under review)\b/]),
    },
    {
      label: "missing owner, reviewer, escalation, customer-safe support path, or next update time:",
      ok: hasAny(`${values.failure} ${values.owner}`.toLowerCase(), [/\b(owner|owns|reviewer|approver|support lead|devrel|platform team|integration support|escalat|next update|update at|by \d{1,2}:\d{2}|utc|support path|ticket)\b/]),
    },
  ];

  const toneRisk = hasAny(all, [/\b(your fault|you broke|obviously broken|guaranteed|definitely delivered|no problem|nothing to worry|lost your data|never fails|always works|panic|catastrophic|blame|you must have)\b/]);
  const privateRisk = hasAny(all, [/\b(raw payload|payload body|authorization header|webhook secret|signing secret|api key|bearer token|token|password|secret|credential|customer endpoint secret|customer list|internal log|stack trace|database dump|personal email|ssn|credit card|private customer|x-signature|stripe-signature)\b/]);

  const warnings = checks.filter((check) => !check.ok).map((check) => check.label);
  if (toneRisk) warnings.push("vague, blame-heavy, panic-inducing, unsupported guarantee, customer-fault, or overconfident wording:");
  if (privateRisk) warnings.push("private payloads, webhook secrets, signing secrets, raw headers, tokens, customer endpoint secrets, customer lists, internal logs, stack traces, or personal data risk:");
  return warnings;
}

function line(label, value, fallback) {
  return `<li><strong>${label}:</strong> ${escapeHtml(value || fallback)}</li>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function buildBrief(values) {
  const warnings = missingChecks(values);
  const noticeOutline = [
    "Name the affected customer-owned endpoint or integration scope without exposing private URLs or secrets.",
    "State the event type, delivery window, and latest delivery outcome.",
    "Explain the next automatic retry or retry-exhausted state.",
    "Give the customer action needed to make the endpoint accept a successful 2xx response.",
    "Describe the replay, backfill, or reconciliation path with an idempotency caveat.",
  ];

  output.innerHTML = `
    <h3>Webhook delivery failure brief ready</h3>
    <h4>Parse summary</h4>
    <ul>
      ${line("Affected scope", values.scope, "Needs endpoint, destination, workspace, app, or integration scope.")}
      ${line("Event and window", values.event, "Needs event type, object/entity scope, or delivery window.")}
      ${line("Failure reason", values.reason, "Needs status code, timeout, TLS, redirect, 4xx/5xx, or network outcome.")}
      ${line("Retry state", values.retry, "Needs attempt count, latest attempt, next retry, cadence, or exhaustion state.")}
      ${line("Customer action", values.action, "Needs endpoint availability, POST/2xx/TLS/allowlist/owner action.")}
    </ul>
    <h4>Missing context and risk warnings</h4>
    ${warnings.length ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : "<p>No major missing context detected in the public-safe fields.</p>"}
    <h4>Customer-safe failure notice outline</h4>
    <ol>${noticeOutline.map((item) => `<li>${item}</li>`).join("")}</ol>
    <h4>Retry/backfill and idempotency handoff</h4>
    <p>${escapeHtml(values.recovery || "State whether automatic retry is pending, whether manual replay is available, and how missed events should be reconciled.")}</p>
    <p>${escapeHtml(values.caveat || "If retry, replay, or backfill is discussed, add an idempotency/duplicate-processing caveat and avoid data-loss guarantees.")}</p>
    <h4>Owner and support path</h4>
    <p>${escapeHtml(values.owner || "Set a named integration/support owner, reviewer, escalation path, and next-update time.")}</p>
  `;

  lastBriefText = output.innerText;
  outputStatus.textContent = warnings.length ? `${warnings.length} issue(s) to review` : "Brief ready";
  copyButton.disabled = false;
  track("brief_generated", { warningCount: warnings.length });
  track("core_action_completed", { warningCount: warnings.length });
}

function generateBrief() {
  workflowError.textContent = "";
  const values = fieldText();
  if (!values.failure) {
    workflowError.textContent = "Paste failed webhook notes or a draft customer notice first.";
    track("brief_generation_failed", { reason: "empty_failure_notes" });
    return;
  }
  track("core_action_started", { triggerSource: "generate_button" });
  buildBrief(values);
}

async function copyText(text, statusElement, success) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  statusElement.textContent = success;
}

function loadSample() {
  fields.failure.value = "Webhook delivery failed for customer-api-prod destination at 09:42 UTC. Latest delivery attempt returned HTTP 503 and timed out after retrying.";
  fields.scope.value = "Production webhook endpoint destination for Acme workspace integration customer-api-prod.";
  fields.event.value = "Event type invoice.paid for payment object scope; delivery window 09:30-09:45 UTC.";
  fields.reason.value = "Latest attempt returned 503 timeout; prior attempt returned non-2xx status code.";
  fields.retry.value = "3 delivery attempts so far; next retry at 10:05 UTC using exponential backoff; automatic retries are not exhausted.";
  fields.action.value = "Customer should verify endpoint availability, accept POST requests, return 2xx quickly, and review TLS/WAF allowlist rules with the endpoint owner.";
  fields.recovery.value = "If automatic retry fails, integration support can manual resend missed events and provide a reconciliation list for the delivery window.";
  fields.caveat.value = "Manual replay can create duplicate events, so the customer should process by event id idempotently; no evidence of data loss, but missed-event reconciliation is under review.";
  fields.owner.value = "Integration support lead owns the customer update; reviewer is DevRel; next update by 10:15 UTC or sooner if the endpoint returns 2xx.";
  fields.tone.value = "No customer blame, no data-loss guarantee, no raw payloads, no signing secrets, no Authorization headers.";
  track("sample_loaded", { sample: "invoice_paid_webhook_failure" });
}

const pathName = window.location.pathname;
track("page_view");
if (pathName === "/" || pathName.endsWith("/") || pathName.endsWith("/index.html")) track("landing_viewed");
if (pathName.endsWith("failed-webhook-delivery-email-template.html")) {
  track("template_opened");
  track("seo_page_viewed");
}

if (document.querySelector("#generate-button")) {
  document.querySelector("#generate-button").addEventListener("click", generateBrief);
  document.querySelector("#sample-button").addEventListener("click", loadSample);
  copyButton.addEventListener("click", () => {
    copyText(lastBriefText, copyStatus, "Copied webhook failure brief.");
    track("copy_brief_clicked");
  });

  document.querySelectorAll(".plan-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.plan;
      document.querySelector("#plan-interest").value = selectedPlan;
      track("plan_selected", { plan: selectedPlan });
      track("pricing_viewed", { plan: selectedPlan });
      intentForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  intentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    track("signup_started", { plan: selectedPlan });
    const intent = {
      email: document.querySelector("#intent-email").value.trim(),
      role: document.querySelector("#intent-role").value.trim(),
      volume: document.querySelector("#failure-volume").value.trim(),
      process: document.querySelector("#current-process").value.trim(),
      plan: document.querySelector("#plan-interest").value,
      willingness: document.querySelector("#willingness").value.trim(),
      at: new Date().toISOString(),
    };
    const key = `${STORAGE_PREFIX}_purchase_intents`;
    const intents = JSON.parse(localStorage.getItem(key) || "[]");
    intents.push(intent);
    localStorage.setItem(key, JSON.stringify(intents.slice(-50)));
    lastRemoteBody = [
      "Public early access request for Webhook Delivery Failure Briefs.",
      "",
      `Role/team: ${intent.role || "[not provided]"}`,
      `Webhook failure volume: ${intent.volume || "[not provided]"}`,
      `Current failure notice process: ${intent.process || "[not provided]"}`,
      `Plan interest: ${intent.plan}`,
      `Willingness to pay: ${intent.willingness || "[not provided]"}`,
      "",
      "Do not include private payloads, endpoint URLs, signing secrets, raw headers, customer data, or email addresses in this public issue.",
    ].join("\n");
    remoteIntentLink.href = `${ISSUE_URL}&body=${encodeURIComponent(lastRemoteBody)}`;
    remoteIntent.hidden = false;
    intentStatus.textContent = "You are on the early access list. Open or copy the public request if you want remote follow-up.";
    track("purchase_intent_submitted", { plan: intent.plan, hasEmail: Boolean(intent.email) });
    track("waitlist_submitted", { plan: intent.plan });
    track("signup_completed", { plan: intent.plan });
    track("remote_intent_ready", { includesEmail: false });
  });

  remoteCopyButton.addEventListener("click", () => {
    copyText(lastRemoteBody, remoteCopyStatus, "Copied request details.");
    track("remote_intent_copied");
  });

  document.querySelectorAll('a[href="#workflow"]').forEach((link) => {
    link.addEventListener("click", () => track("cta_clicked", { triggerSource: "workflow_anchor" }));
  });
}
