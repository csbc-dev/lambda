import { bootstrapLambda } from "@csbc-dev/lambda";
import { createMockLambdaProvider, formatExampleError, formatValue, parsePayloadText, resolveRemoteEndpoint } from "../shared/mockLambdaProvider.js";

bootstrapLambda();

const lambda = document.querySelector("#lambda");
const controls = document.querySelector("#controls");
const functionName = document.querySelector("#functionName");
const mode = document.querySelector("#mode");
const remoteUrl = document.querySelector("#remoteUrl");
const useRemote = document.querySelector("#useRemote");
const payload = document.querySelector("#payload");
const invokeButton = document.querySelector("#invoke");
const status = document.querySelector("#status");
const requestId = document.querySelector("#requestId");
const duration = document.querySelector("#duration");
const result = document.querySelector("#result");
const stream = document.querySelector("#stream");
const error = document.querySelector("#error");

let localError = null;

lambda.setProvider(createMockLambdaProvider());

const refresh = () => {
  invokeButton.disabled = lambda.invoking;
  status.textContent = lambda.invoking ? "invoking" : lambda.streaming ? "streaming" : "ready";
  requestId.textContent = lambda.requestId ?? "-";
  duration.textContent = lambda.duration === null ? "-" : `${Math.round(lambda.duration)}ms`;
  result.textContent = formatValue(lambda.result);
  stream.textContent = lambda.text || "stream text will appear here";
  error.textContent = localError ?? (lambda.error ? `${lambda.error.code}: ${lambda.error.message}` : "no error");
};

for (const eventName of [
  "lambda-invoke:invoking-changed",
  "lambda-invoke:streaming-changed",
  "lambda-invoke:result-changed",
  "lambda-invoke:error",
  "lambda-invoke:request-id-changed",
  "lambda-invoke:duration-changed",
  "lambda-invoke:text-changed",
  "lambda-invoke:stream-error",
]) {
  lambda.addEventListener(eventName, refresh);
}

controls.addEventListener("submit", async (event) => {
  event.preventDefault();
  localError = null;

  try {
    lambda.functionName = functionName.value;
    lambda.mode = mode.value;
    lambda.payload = parsePayloadText(payload.value);

    if (useRemote.checked) {
      lambda.attachRemote(resolveRemoteEndpoint(remoteUrl.value));
    } else {
      lambda.setProvider(createMockLambdaProvider());
    }

    await lambda.invoke();
  } catch (error) {
    localError = formatExampleError(error);
  }

  refresh();
});

document.querySelector("#abort").addEventListener("click", () => {
  lambda.abort();
  refresh();
});

document.querySelector("#reset").addEventListener("click", () => {
  localError = null;
  lambda.reset();
  refresh();
});

refresh();