import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

let loaderPromise;

export function loadGoogleMaps() {
  if (loaderPromise) return loaderPromise;

  const apiKey = (import.meta.env.VITE_MAP_API_KEY || '').trim();
  if (!apiKey) {
    loaderPromise = Promise.reject(new Error('VITE_MAP_API_KEY is not configured.'));
    return loaderPromise;
  }

  setOptions({ key: apiKey, v: 'weekly', libraries: ['places', 'geometry'] });
  loaderPromise = importLibrary('maps')
    .then(async () => {
      await Promise.all([
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('geometry')
      ]);
    });
  return loaderPromise;
}
