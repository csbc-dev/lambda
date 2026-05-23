import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useWcBindable } from "@wc-bindable/react";
import { bootstrapLambda } from "@csbc-dev/lambda";
import { createMockLambdaProvider, formatExampleError, formatValue, parsePayloadText, resolveRemoteEndpoint } from "../shared/mockLambdaProvider.js";

bootstrapLambda();

const h = React.createElement;

function App() {
  const lambdaElement = useRef(null);
  const [bindLambdaRef, lambdaValues] = useWcBindable();
  const [functionName, setFunctionName] = useState("demo-function");
  const [mode, setMode] = useState("buffered");
  const [remoteUrl, setRemoteUrl] = useState("/api/lambda");
  const [useRemote, setUseRemote] = useState(false);
  const [payloadText, setPayloadText] = useState('{"name":"Ada","task":"react example"}');
  const [localError, setLocalError] = useState(null);

  const setLambdaRef = (element) => {
    lambdaElement.current = element;
    bindLambdaRef(element);
  };

  useEffect(() => {
    const element = lambdaElement.current;
    if (!element) {
      return;
    }

    element.setProvider(createMockLambdaProvider());
  }, []);

  const invoke = async (event) => {
    event.preventDefault();
    const element = lambdaElement.current;
    setLocalError(null);

    if (!element) {
      return;
    }

    try {
      element.functionName = functionName;
      element.mode = mode;
      element.payload = parsePayloadText(payloadText);

      if (useRemote) {
        element.attachRemote(resolveRemoteEndpoint(remoteUrl));
      } else {
        element.setProvider(createMockLambdaProvider());
      }

      await element.invoke();
    } catch (error) {
      setLocalError(formatExampleError(error));
    }
  };

  return h("main", { className: "shell" },
    h("header", { className: "masthead" },
      h("div", null,
        h("p", { className: "eyebrow" }, "React"),
        h("h1", null, "Lambda invoke with useWcBindable"),
        h("p", { className: "summary" }, "React observes the custom element's wc-bindable surface while LambdaCore owns invocation state and async command behavior."),
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
        h("label", { className: "toggle" },
          h("input", { type: "checkbox", checked: useRemote, onChange: (event) => setUseRemote(event.target.checked) }),
          "Use remote Core endpoint",
        ),
        h("label", null, "Payload", h("textarea", { value: payloadText, onChange: (event) => setPayloadText(event.target.value) })),
        h("div", { className: "actions" },
          h("button", { type: "submit", disabled: lambdaValues.invoking }, "Invoke"),
          h("button", { className: "secondary", type: "button", onClick: () => lambdaElement.current?.abort() }, "Abort"),
          h("button", { className: "secondary", type: "button", onClick: () => { setLocalError(null); lambdaElement.current?.reset(); } }, "Reset"),
        ),
      ),
      h("section", { className: "panel" },
        h("div", { className: "stats" },
          h("div", { className: "stat" }, h("span", null, "Status"), h("strong", null, lambdaValues.invoking ? "invoking" : lambdaValues.streaming ? "streaming" : "ready")),
          h("div", { className: "stat" }, h("span", null, "Request"), h("strong", null, lambdaValues.requestId ?? "-")),
          h("div", { className: "stat" }, h("span", null, "Duration"), h("strong", null, lambdaValues.duration == null ? "-" : `${Math.round(lambdaValues.duration)}ms`)),
        ),
        h("div", { className: "output-grid" },
          h("pre", null, formatValue(lambdaValues.result)),
          h("pre", null, lambdaValues.text || "stream text will appear here"),
          h("pre", { className: "error" }, localError ?? (lambdaValues.error ? `${lambdaValues.error.code}: ${lambdaValues.error.message}` : "no error")),
        ),
      ),
    ),
    h("lambda-invoke", { ref: setLambdaRef, mode }, h("lambda-stream")),
  );
}

createRoot(document.querySelector("#root")).render(h(App));