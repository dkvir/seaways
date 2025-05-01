import { Pane } from "tweakpane";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component("tweakpane", Pane);
});
