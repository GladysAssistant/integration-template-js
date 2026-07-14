// -----------------------------------------------------------------------------
// Configuration de l'intégration.
//
// La configuration est saisie par l'utilisateur dans Gladys à partir du
// `config_schema` déclaré dans `gladys-assistant-integration.json`.
// Le SDK la récupère pour vous (`gladys.getConfig()`) et vous notifie de
// chaque changement via `gladys.onConfigUpdated()`.
//
// Ce module se contente de fournir des valeurs par défaut et de normaliser
// l'objet reçu, pour que le reste du code n'ait jamais à gérer `undefined`.
// -----------------------------------------------------------------------------

// Valeurs par défaut : elles DOIVENT rester cohérentes avec les `default`
// déclarés dans le `config_schema` du manifeste.
export const DEFAULT_CONFIG = {
  latitude: 48.8566, // Paris
  longitude: 2.3522,
  unit: 'celsius', // 'celsius' | 'fahrenheit'
  poll_frequency: 300, // secondes, fréquence de rafraîchissement des capteurs
};

/**
 * Fusionne la config utilisateur avec les valeurs par défaut.
 * @param {Record<string, unknown>} raw config renvoyée par le SDK
 */
export function normalizeConfig(raw = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    // On force les types : la config peut arriver en string depuis un formulaire.
    latitude: Number(raw.latitude ?? DEFAULT_CONFIG.latitude),
    longitude: Number(raw.longitude ?? DEFAULT_CONFIG.longitude),
    poll_frequency: Number(raw.poll_frequency ?? DEFAULT_CONFIG.poll_frequency),
  };
}
