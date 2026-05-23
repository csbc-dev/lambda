import { createApp, h, reactive, ref, onMounted } from "vue";
import { useWcBindable } from "@wc-bindable/vue";
import { bootstrapLambda } from "@csbc-dev/lambda";
import { createMockLambdaProvider, formatExampleError, formatValue, parsePayloadText, resolveRemoteEndpoint } from "../shared/mockLambdaProvider.js";

bootstrapLambda();

createApp({
  setup() {
    const lambdaBinding = useWcBindable();
    const lambda = lambdaBinding.ref;
    const values = lambdaBinding.values;
    const localError = ref(null);
    const form = reactive({
      functionName: "demo-function",
      mode: "buffered",
      remoteUrl: "/api/lambda",
      useRemote: false,
      payloadText: '{"name":"Ada","task":"vue example"}',
    });

    onMounted(() => {
      lambda.value?.setProvider(createMockLambdaProvider());
    });

    const invoke = async () => {
      const element = lambda.value;
      if (!element) {
        return;
      }

      localError.value = null;

      try {
        element.functionName = form.functionName;
        element.mode = form.mode;
        element.payload = parsePayloadText(form.payloadText);

        if (form.useRemote) {
          element.attachRemote(resolveRemoteEndpoint(form.remoteUrl));
        } else {
          element.setProvider(createMockLambdaProvider());
        }

        await element.invoke();
      } catch (error) {
        localError.value = formatExampleError(error);
      }
    };

    const reset = () => {
      localError.value = null;
      lambda.value?.reset();
    };

    return () => h("main", { class: "shell" }, [
      h("header", { class: "masthead" }, [
        h("div", null, [
          h("p", { class: "eyebrow" }, "Vue"),
          h("h1", null, "Lambda invoke with useWcBindable"),
          h("p", { class: "summary" }, "Vue mirrors the custom element's wc-bindable surface into reactive state while LambdaCore keeps async decisions outside the framework."),
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
          h("label", { class: "toggle" }, [
            h("input", {
              type: "checkbox",
              checked: form.useRemote,
              onChange: (event) => { form.useRemote = event.target.checked; },
            }),
            "Use remote Core endpoint",
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
            h("button", { class: "secondary", type: "button", onClick: reset }, "Reset"),
          ]),
        ]),
        h("section", { class: "panel" }, [
          h("div", { class: "stats" }, [
            h("div", { class: "stat" }, [h("span", null, "Status"), h("strong", null, values.invoking ? "invoking" : values.streaming ? "streaming" : "ready")]),
            h("div", { class: "stat" }, [h("span", null, "Request"), h("strong", null, values.requestId ?? "-")]),
            h("div", { class: "stat" }, [h("span", null, "Duration"), h("strong", null, values.duration == null ? "-" : `${Math.round(values.duration)}ms`)]),
          ]),
          h("div", { class: "output-grid" }, [
            h("pre", null, formatValue(values.result)),
            h("pre", null, values.text || "stream text will appear here"),
            h("pre", { class: "error" }, localError.value ?? (values.error ? `${values.error.code}: ${values.error.message}` : "no error")),
          ]),
        ]),
      ]),
      h("lambda-invoke", { ref: lambda, mode: form.mode }, [h("lambda-stream")]),
    ]);
  },
}).mount("#app");