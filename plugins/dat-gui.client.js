import * as dat from "dat.gui";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide("dat", dat);
});
