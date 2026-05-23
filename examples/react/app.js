import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useWcBindable } from "@wc-bindable/react";
import { bootstrapLambda } from "@csbc-dev/lambda";
import { formatValue, parsePayloadText } from "../shared/format.js";

bootstrapLambda();

const h = React.createElement;

function App() {
  const lambdaElement = useRef(null);
  // Parent <lambda-invoke> surface (buffered / meta state + commands).
  const [bindLambdaRef, lambdaValues] = useWcBindable();
  // Child <lambda-stream> surface (streaming projection).
  const [bindStreamRef, streamValues] = useWcBindable();
  const [functionName, setFunctionName] = useState("demo-function");
  const [mode, setMode] = useState("buffered");
  const [remoteUrl, setRemoteUrl] = useState("/api/lambda");
  const [payloadText, setPayloadText] = useState('{"name":"Ada","task":"react example"}');

  const setLambdaRef = (element) => {
    lambdaElement.current = element;
    bindLambdaRef(element);
  };

  // Remote-first: the remote-url attribute attaches a server-owned Core, so AWS
  // credentials never reach the browser. Re-attaches whenever the endpoint changes.
  useEffect(() => {
    if (lambdaElement.current) {
      lambdaElement.current.remoteUrl = remoteUrl;
    }
  }, [remoteUrl]);

  const invoke = async (event) => {
    event.preventDefault();
    const element = lambdaElement.current;
    if (!element) {
      return;
    }

    element.functionName = functionName;
    element.mode = mode;
    element.payload = parsePayloadText(payloadText);
    element.remoteUrl = remoteUrl;

    await element.invoke();
  };

  const err = lambdaValues.error || streamValues.streamError;

  return h("main", { className: "shell" },
    h("header", { className: "masthead" },
      h("div", null,
        h("p", { className: "eyebrow" }, "React"),
        h("h1", null, "Lambda invoke with useWcBindable"),
        h("p", { className: "summary" }, "React observes the custom element's wc-bindable surface while LambdaCore owns invocation state and async command behavior. Remote-first: remote-url attaches a server-owned Core."),
      ),
      h("span", { className: "badge" }, "@wc-bindable/react"),
    ),
    h("section", { className: "workspace" },
      h("form", { className: "panel controls", onSubmit: invoke },
        h("label", null, "Function name", h("input", { value: functionName, onChange: (event) => setFunctionName(event.target.value) })),
        h("div", { className: "row" },
          h("label", null, "Mode", h("select", { value: mode, onChange: (event) => setMode(event.target.value) },
            h("option", { value: "buffered" }, "buffered"),
            h("option", { value: "stream" }, "stream"),
          )),
          h("label", null, "Remote endpoint", h("input", { value: remoteUrl, onChange: (event) => setRemoteUrl(event.target.value) })),
        ),
        h("label", null, "Payload", h("textarea", { value: payloadText, onChange: (event) => setPayloadText(event.target.value) })),
        h("div", { className: "actions" },
          h("button", { type: "submit", disabled: lambdaValues.invoking }, "Invoke"),
          h("button", { className: "secondary", type: "button", onClick: () => lambdaElement.current?.abort() }, "Abort"),
          h("button", { className: "secondary", type: "button", onClick: () => lambdaElement.current?.reset() }, "Reset"),
        ),
      ),
      h("section", { className: "panel" },
        h("div", { className: "stats" },
          h("div", { className: "stat" }, h("span", null, "Status"), h("strong", null, lambdaValues.invoking ? "invoking" : streamValues.streaming ? "streaming" : "ready")),
          h("div", { className: "stat" }, h("span", null, "Request"), h("strong", null, lambdaValues.requestId ?? "-")),
          h("div", { className: "stat" }, h("span", null, "Duration"), h("strong", null, lambdaValues.duration == null ? "-" : `${Math.round(lambdaValues.duration)}ms`)),
        ),
        h("div", { className: "output-grid" },
          h("pre", null, formatValue(lambdaValues.result)),
          h("pre", null, streamValues.text || "stream text will appear here"),
          h("pre", { className: "error" }, err ? `${err.code}: ${err.message}` : "no error"),
        ),
      ),
    ),
    h("lambda-invoke", { ref: setLambdaRef, mode }, h("lambda-stream", { ref: bindStreamRef })),
  );
}

createRoot(document.querySelector("#root")).render(h(App));
