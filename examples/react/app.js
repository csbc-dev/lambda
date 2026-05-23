import React, { useEffect, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { bootstrapLambda } from "../../dist/index.js";
import { createMockLambdaProvider, formatExampleError, formatValue, parsePayloadText, resolveRemoteEndpoint } from "../shared/mockLambdaProvider.js?v=2";

bootstrapLambda();

const h = React.createElement;

function snapshot(element) {
  return {
    invoking: element?.invoking ?? false,
    streaming: element?.streaming ?? false,
    result: element?.result ?? null,
    error: element?.error ?? null,
    requestId: element?.requestId ?? null,
    duration: element?.duration ?? null,
    text: element?.text ?? "",
  };
}

function App() {
  const lambdaRef = useRef(null);
  const [functionName, setFunctionName] = useState("demo-function");
  const [mode, setMode] = useState("buffered");
  const [remoteUrl, setRemoteUrl] = useState("/api/lambda");
  const [useRemote, setUseRemote] = useState(false);
  const [payloadText, setPayloadText] = useState('{"name":"Ada","task":"react example"}');
  const [localError, setLocalError] = useState(null);
  const [state, setState] = useState(() => snapshot(null));

  useEffect(() => {
    const element = lambdaRef.current;
    element.setProvider(createMockLambdaProvider());
    setState(snapshot(element));

    const update = () => setState(snapshot(element));
    const events = [
      "lambda-invoke:invoking-changed",
      "lambda-invoke:streaming-changed",
      "lambda-invoke:result-changed",
      "lambda-invoke:error",
      "lambda-invoke:request-id-changed",
      "lambda-invoke:duration-changed",
      "lambda-invoke:text-changed",
      "lambda-invoke:stream-error",
    ];

    for (const eventName of events) {
      element.addEventListener(eventName, update);
    }

    return () => {
      for (const eventName of events) {
        element.removeEventListener(eventName, update);
      }
    };
  }, []);

  const invoke = async (event) => {
    event.preventDefault();
    const element = lambdaRef.current;
    setLocalError(null);

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

    setState(snapshot(element));
  };

  return h("main", { className: "shell" },
    h("header", { className: "masthead" },
      h("div", null,
        h("p", { className: "eyebrow" }, "React"),
        h("h1", null, "Lambda invoke through refs"),
        h("p", { className: "summary" }, "React keeps view state in hooks while the Web Component owns invocation state and async command behavior."),
      ),
      h("span", { className: "badge" }, "custom element bridge"),
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
          h("button", { type: "submit", disabled: state.invoking }, "Invoke"),
          h("button", { className: "secondary", type: "button", onClick: () => lambdaRef.current.abort() }, "Abort"),
          h("button", { className: "secondary", type: "button", onClick: () => { setLocalError(null); lambdaRef.current.reset(); } }, "Reset"),
        ),
      ),
      h("section", { className: "panel" },
        h("div", { className: "stats" },
          h("div", { className: "stat" }, h("span", null, "Status"), h("strong", null, state.invoking ? "invoking" : state.streaming ? "streaming" : "ready")),
          h("div", { className: "stat" }, h("span", null, "Request"), h("strong", null, state.requestId ?? "-")),
          h("div", { className: "stat" }, h("span", null, "Duration"), h("strong", null, state.duration === null ? "-" : `${Math.round(state.duration)}ms`)),
        ),
        h("div", { className: "output-grid" },
          h("pre", null, formatValue(state.result)),
          h("pre", null, state.text || "stream text will appear here"),
          h("pre", { className: "error" }, localError ?? (state.error ? `${state.error.code}: ${state.error.message}` : "no error")),
        ),
      ),
    ),
    h("lambda-invoke", { ref: lambdaRef, mode }, h("lambda-stream")),
  );
}

createRoot(document.querySelector("#root")).render(h(App));