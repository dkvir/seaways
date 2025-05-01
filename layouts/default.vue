<template>
  <div class="default-layout">
    <slot />
  </div>
</template>

<script setup>
onBeforeMount(() => {
  useLenisScroll().lenisInitial();
});
</script>

<style lang="scss" scoped>
.default-layout {
  width: 100svw;
  min-height: 100svh;
  height: auto;
}
</style>
