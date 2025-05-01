import { defineStore } from "pinia";

export const useCanvasStore = defineStore("canvasStore", {
  state: () => ({
    showButtons: false,
    isLoaded: false,
  }),
  actions: {
    changeShowButtons(status) {
      this.showButtons = status;
    },
    changeIsLoaded(status) {
      this.isLoaded = status;
    },
  },
});
