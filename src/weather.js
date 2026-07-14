// -----------------------------------------------------------------------------
// Exemple de "driver" pour un capteur RÉEL, sans matériel : l'API Open-Meteo.
//
// C'est ici qu'on parle au monde extérieur (une API HTTP publique et gratuite,
// sans clé). Dans une vraie intégration, ce fichier serait remplacé par
// l'appel à votre passerelle domotique, votre broker MQTT, votre API cloud
// constructeur, votre port série, etc.
//
// Node 20+ fournit `fetch` nativement : aucune dépendance nécessaire.
// -----------------------------------------------------------------------------

import { logger } from './logger.js';

/**
 * Récupère la température et l'humidité actuelles pour une position.
 * @param {{ latitude: number, longitude: number, unit: string }} config
 * @returns {Promise<{ temperature: number, humidity: number }>}
 */
export async function fetchWeather({ latitude, longitude, unit }) {
  const temperatureUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
    `&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&temperature_unit=${temperatureUnit}`;

  logger.debug('Open-Meteo request →', url);

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    // On propage l'erreur : l'appelant décidera s'il republie l'ancienne
    // valeur ou s'il marque le capteur comme injoignable.
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }

  const body = await response.json();
  const current = body.current ?? {};

  return {
    temperature: Number(current.temperature_2m),
    humidity: Number(current.relative_humidity_2m),
  };
}
