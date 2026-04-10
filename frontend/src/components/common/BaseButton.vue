<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
      variantClass
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <slot name="icon" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'outline', 'ghost'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

defineEmits(['click']);

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-blue-600 text-white hover:bg-blue-700 shadow-md h-10 px-4 py-2';
    case 'secondary':
      return 'bg-gray-200 text-gray-900 hover:bg-gray-300 h-10 px-4 py-2';
    case 'outline':
      return 'border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-900 h-10 px-4 py-2';
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 text-gray-900 px-4 py-2';
    default:
      return '';
  }
});
</script>
