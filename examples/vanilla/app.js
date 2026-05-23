import { bootstrapLambda } from "@csbc-dev/lambda";
import { formatValue, parsePayloadText } from "../shared/format.js";

bootstrapLambda();

const lambda = document.querySelector("#lambda");
// Stream output is projected by the <lambda-stream> child; read it from there.
const streamEl = lambda.querySelector("lambda-stream");
const controls = document.querySelector("#controls");
const functionName = document.querySelector("#functionName");
const mode = document.querySelector("#mode");
const remoteUrl = document.querySelector("#remoteUrl");
const payload = document.querySelector("#payload");
const invokeButton = document.querySelector("#invoke");
const status = document.querySelector("#status");
const requestId = document.querySelector("#requestId");
const duration = document.querySelector("#duration");
const result = document.querySelector("#result");
const stream = document.querySelector("#stream");
const error = document.querySelector("#error");

// Remote-first: the remote-url attribute attaches a server-owned Core, so AWS
// credentials never reach the browser. Setting it re-attaches; editing the
// endpoint field re-attaches too.
lambda.remoteUrl = remoteUrl.value;
remoteUrl.addEventListener("input", () => {
  lambda.remoteUrl = remoteUrl.value;
});

const refresh = () => {
  invokeButton.disabled = lambda.invoking;
  status.textContent = lambda.invoking ? "invoking" : streamEl.streaming ? "streaming" : "ready";
  requestId.textContent = lambda.requestId ?? "-";
  duration.textContent = lambda.duration === null ? "-" : `${Math.round(lambda.duration)}ms`;
  result.textContent = formatValue(lambda.result);
  stream.textContent = streamEl.text || "stream text will appear here";
  const err = lambda.error || streamEl.streamError;
  error.textContent = err ? `${err.code}: ${err.message}` : "no error";
};

// Buffered / meta state comes from <lambda-invoke>.
for (const eventName of [
  "lambda-invoke:invoking-changed",
  "lambda-invoke:result-changed",
  "lambda-invoke:error",
  "lambda-invoke:request-id-changed",
  "lambda-invoke:duration-changed",
]) {
  lambda.addEventListener(eventName, refresh);
}

// Streaming state comes from the <lambda-stream> child.
for (const eventName of [
  "lambda-stream:streaming-changed",
  "lambda-stream:text-changed",
  "lambda-stream:error",
]) {
  streamEl.addEventListener(eventName, refresh);
}

controls.addEventListener("submit", async (event) => {
  event.preventDefault();

  lambda.functionName = functionName.value;
  lambda.mode = mode.value;
  lambda.payload = parsePayloadText(payload.value);
  lambda.remoteUrl = remoteUrl.value;

  await lambda.invoke();
  refresh();
});

document.querySelector("#abort").addEventListener("click", () => {
  lambda.abort();
  refresh();
});

document.querySelector("#reset").addEventListener("click", () => {
  lambda.reset();
  refresh();
});

refresh();
