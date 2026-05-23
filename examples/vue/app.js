import { createApp, h } from "https://esm.sh/vue@3.5.13";
import { bootstrapLambda } from "../../dist/index.js";
import { createMockLambdaProvider, formatExampleError, formatValue, parsePayloadText, resolveRemoteEndpoint } from "../shared/mockLambdaProvider.js?v=2";

bootstrapLambda();

async function resolveLambdaElement() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const element = document.querySelector("#vue-lambda");
    if (element) {
      return element;
    }
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }

  throw new Error("#vue-lambda was not found");
}

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

createApp({
  data() {
    return {
      lambda: null,
      form: {
        functionName: "demo-function",
        mode: "buffered",
        remoteUrl: "/api/lambda",
        useRemote: false,
        payloadText: '{"name":"Ada","task":"vue example"}',
      },
      state: {
        invoking: false,
        streaming: false,
        result: null,
        error: null,
        requestId: null,
        duration: null,
        text: "",
        localError: null,
      },
    };
  },

  async mounted() {
    await this.ensureLambda();
  },

  unmounted() {
    if (!this.lambda) {
      return;
    }

    for (const eventName of events) {
      this.lambda.removeEventListener(eventName, this.sync);
    }
  },

  methods: {
    async ensureLambda() {
      if (this.lambda) {
        return;
      }

      this.lambda = await resolveLambdaElement();
      this.lambda.setProvider(createMockLambdaProvider());
      for (const eventName of events) {
        this.lambda.addEventListener(eventName, this.sync);
      }
      this.sync();
    },

    sync() {
      if (!this.lambda) {
        return;
      }

      Object.assign(this.state, {
        invoking: this.lambda.invoking,
        streaming: this.lambda.streaming,
        result: this.lambda.result,
        error: this.lambda.error,
        requestId: this.lambda.requestId,
        duration: this.lambda.duration,
        text: this.lambda.text,
      });
    },

    async invoke() {
      await this.ensureLambda();
      this.state.localError = null;

      try {
        this.lambda.functionName = this.form.functionName;
        this.lambda.mode = this.form.mode;
        this.lambda.payload = parsePayloadText(this.form.payloadText);

        if (this.form.useRemote) {
          this.lambda.attachRemote(resolveRemoteEndpoint(this.form.remoteUrl));
        } else {
          this.lambda.setProvider(createMockLambdaProvider());
        }

        await this.lambda.invoke();
      } catch (error) {
        this.state.localError = formatExampleError(error);
      }

      this.sync();
    },

    reset() {
      this.state.localError = null;
      this.lambda?.reset();
      this.sync();
    },
  },

  render() {
    return h("main", { class: "shell" }, [
      h("header", { class: "masthead" }, [
        h("div", null, [
          h("p", { class: "eyebrow" }, "Vue"),
          h("h1", null, "Lambda invoke with render functions"),
          h("p", { class: "summary" }, "Vue mirrors custom-element events into reactive state while LambdaCore keeps invocation decisions and async state outside the framework."),
        ]),
        h("span", { class: "badge" }, "render function"),
      ]),
      h("section", { class: "workspace" }, [
        h("div", { class: "panel controls" }, [
          h("label", null, [
            "Function name",
            h("input", {
              value: this.form.functionName,
              onInput: (event) => { this.form.functionName = event.target.value; },
            }),
          ]),
          h("div", { class: "row" }, [
            h("label", null, [
              "Mode",
              h("select", {
                value: this.form.mode,
                onChange: (event) => { this.form.mode = event.target.value; },
              }, [
                h("option", { value: "buffered" }, "buffered"),
                h("option", { value: "stream" }, "stream"),
              ]),
            ]),
            h("label", null, [
              "Remote endpoint",
              h("input", {
                value: this.form.remoteUrl,
                onInput: (event) => { this.form.remoteUrl = event.target.value; },
              }),
            ]),
          ]),
          h("label", { class: "toggle" }, [
            h("input", {
              type: "checkbox",
              checked: this.form.useRemote,
              onChange: (event) => { this.form.useRemote = event.target.checked; },
            }),
            "Use remote Core endpoint",
          ]),
          h("label", null, [
            "Payload",
            h("textarea", {
              value: this.form.payloadText,
              onInput: (event) => { this.form.payloadText = event.target.value; },
            }),
          ]),
          h("div", { class: "actions" }, [
            h("button", { type: "button", disabled: this.state.invoking, onClick: () => this.invoke() }, "Invoke"),
            h("button", { class: "secondary", type: "button", onClick: () => this.lambda?.abort() }, "Abort"),
            h("button", { class: "secondary", type: "button", onClick: () => this.reset() }, "Reset"),
          ]),
        ]),
        h("section", { class: "panel" }, [
          h("div", { class: "stats" }, [
            h("div", { class: "stat" }, [h("span", null, "Status"), h("strong", null, this.state.invoking ? "invoking" : this.state.streaming ? "streaming" : "ready")]),
            h("div", { class: "stat" }, [h("span", null, "Request"), h("strong", null, this.state.requestId ?? "-")]),
            h("div", { class: "stat" }, [h("span", null, "Duration"), h("strong", null, this.state.duration === null ? "-" : `${Math.round(this.state.duration)}ms`)]),
          ]),
          h("div", { class: "output-grid" }, [
            h("pre", null, formatValue(this.state.result)),
            h("pre", null, this.state.text || "stream text will appear here"),
            h("pre", { class: "error" }, this.state.localError ?? (this.state.error ? `${this.state.error.code}: ${this.state.error.message}` : "no error")),
          ]),
        ]),
      ]),
    ]);
  },
}).mount("#app");