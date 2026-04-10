import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMapStore = defineStore('map', () => {
  const visitedCountries = ref<string[]>([]);
  const selectedCountry = ref<string | null>(null);

  function markVisited(countryId: string) {
    if (!visitedCountries.value.includes(countryId)) {
      visitedCountries.value.push(countryId);
    }
  }

  function selectCountry(countryId: string | null) {
    selectedCountry.value = countryId;
  }

  return { visitedCountries, selectedCountry, markVisited, selectCountry };
});
