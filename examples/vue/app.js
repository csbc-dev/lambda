import { createApp, h, reactive, watch } from "vue";
import { useWcBindable } from "@wc-bindable/vue";
import { bootstrapLambda } from "@csbc-dev/lambda";
import { formatValue, parsePayloadText } from "../shared/format.js";

bootstrapLambda();

createApp({
  setup() {
    // Parent <lambda-invoke> surface (buffered / meta state + commands).
    const lambdaBinding = useWcBindable();
    const lambda = lambdaBinding.ref;
    const values = lambdaBinding.values;
    // Child <lambda-stream> surface (streaming projection).
    const streamBinding = useWcBindable();
    const streamRef = streamBinding.ref;
    const streamValues = streamBinding.values;
    const form = reactive({
      functionName: "demo-function",
      mode: "buffered",
      remoteUrl: "/api/lambda",
      payloadText: '{"name":"Ada","task":"vue example"}',
    });

    // Remote-first: the remote-url attribute attaches a server-owned Core, so AWS
    // credentials never reach the browser. Re-attaches when the element mounts or
    // the endpoint changes.
    watch([lambda, () => form.remoteUrl], ([element, url]) => {
      if (element) {
        element.remoteUrl = url;
      }
    }, { immediate: true });

    const invoke = async () => {
      const element = lambda.value;
      if (!element) {
        return;
      }

      element.functionName = form.functionName;
      element.mode = form.mode;
      element.payload = parsePayloadText(form.payloadText);
      element.remoteUrl = form.remoteUrl;

      await element.invoke();
    };

    return () => {
      const err = values.error || streamValues.streamError;

      return h("main", { class: "shell" }, [
        h("header", { class: "masthead" }, [
          h("div", null, [
            h("p", { class: "eyebrow" }, "Vue"),
            h("h1", null, "Lambda invoke with useWcBindable"),
            h("p", { class: "summary" }, "Vue mirrors the custom element's wc-bindable surface into reactive state while LambdaCore keeps async decisions outside the framework. Remote-first: remote-url attaches a server-owned Core."),
          ]),
          h("span", { class: "badge" }, "@wc-bindable/vue"),
        ]),
        h("section", { class: "workspace" }, [
          h("div", { class: "panel controls" }, [
            h("label", null, [
              "Function name",
              h("input", {
                value: form.functionName,
                onInput: (event) => { form.functionName = event.target.value; },
              }),
            ]),
            h("div", { class: "row" }, [
              h("label", null, [
                "Mode",
                h("select", {
                  value: form.mode,
                  onChange: (event) => { form.mode = event.target.value; },
                }, [
                  h("option", { value: "buffered" }, "buffered"),
                  h("option", { value: "stream" }, "stream"),
                ]),
              ]),
              h("label", null, [
                "Remote endpoint",
                h("input", {
                  value: form.remoteUrl,
                  onInput: (event) => { form.remoteUrl = event.target.value; },
                }),
              ]),
            ]),
            h("label", null, [
              "Payload",
              h("textarea", {
                value: form.payloadText,
                onInput: (event) => { form.payloadText = event.target.value; },
              }),
            ]),
            h("div", { class: "actions" }, [
              h("button", { type: "button", disabled: values.invoking, onClick: invoke }, "Invoke"),
              h("button", { class: "secondary", type: "button", onClick: () => lambda.value?.abort() }, "Abort"),
              h("button", { class: "secondary", type: "button", onClick: () => lambda.value?.reset() }, "Reset"),
            ]),
          ]),
          h("section", { class: "panel" }, [
            h("div", { class: "stats" }, [
              h("div", { class: "stat" }, [h("span", null, "Status"), h("strong", null, values.invoking ? "invoking" : streamValues.streaming ? "streaming" : "ready")]),
              h("div", { class: "stat" }, [h("span", null, "Request"), h("strong", null, values.requestId ?? "-")]),
              h("div", { class: "stat" }, [h("span", null, "Duration"), h("strong", null, values.duration == null ? "-" : `${Math.round(values.duration)}ms`)]),
            ]),
            h("div", { class: "output-grid" }, [
              h("pre", null, formatValue(values.result)),
              h("pre", null, streamValues.text || "stream text will appear here"),
              h("pre", { class: "error" }, err ? `${err.code}: ${err.message}` : "no error"),
            ]),
          ]),
        ]),
        h("lambda-invoke", { ref: lambda, mode: form.mode }, [h("lambda-stream", { ref: streamRef })]),
      ]);
    };
  },
}).mount("#app");
