export interface Country {
  id: string;
  name: string;
  visited: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  visitedCountries: string[]; // array of country IDs
}
