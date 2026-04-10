<script setup lang="ts">
interface Props {
  text: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

withDefaults(defineProps<Props>(), {
  tag: 'h1'
});
</script>

<template>
  <component 
    :is="tag" 
    class="font-display font-normal text-white uppercase drop-shadow-2xl"
  >
    {{ text }}
  </component>
</template>

<style scoped>
.font-display {
  font-family: 'Boldonse', sans-serif;
}
</style>
