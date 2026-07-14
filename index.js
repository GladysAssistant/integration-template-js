// -----------------------------------------------------------------------------
// Point d'entrée de l'intégration externe Gladys.
//
// Rôle de ce fichier : brancher le SDK sur le catalogue d'appareils
// (src/devices.js). Il ne contient AUCUNE logique matérielle — tout le
// « travail » de contrôle est dans les blueprints. Ce fichier ne fait que :
//   1. instancier le SDK (connexion, auth, reconnexion : géré pour vous) ;
//   2. enregistrer les gestionnaires d'événements AVANT connect() ;
//   3. se connecter et publier les appareils découverts.
//
// Variables d'environnement fournies par le superviseur Gladys au conteneur :
//   - GLADYS_HOST_API_URL        (URL de l'API hôte)
//   - GLADYS_INTEGRATION_TOKEN   (JWT propre à l'intégration)
//   - GLADYS_INTEGRATION_SELECTOR(identifiant de l'intégration)
// Le SDK les lit automatiquement : `new GladysIntegration()` suffit.
// -----------------------------------------------------------------------------

import { GladysIntegration } from '@gladysassistant/integration-sdk';
import { logger } from './src/logger.js';
import { normalizeConfig } from './src/config.js';
import {
  DEVICE_BLUEPRINTS,
  buildDiscoveredDevices,
  findBlueprintByDevice,
} from './src/devices.js';

const gladys = new GladysIntegration();

// Configuration courante (mise à jour à chaud via onConfigUpdated).
let config = normalizeConfig();

// Fonctions de nettoyage des abonnements « push » (ex : détecteur de mouvement).
let pushCleanups = [];

// --- Découverte : Gladys demande la liste des appareils -----------------------
gladys.onScanRequest(async () => {
  logger.info('onScanRequest → publication des appareils découverts');
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
});

// --- Commande : l'utilisateur agit sur une feature pilotable ------------------
gladys.onSetValue(async (device, feature, value) => {
  logger.info(`onSetValue ← ${feature.external_id} = ${value}`);
  const blueprint = findBlueprintByDevice(gladys, device);
  if (!blueprint || typeof blueprint.onSetValue !== 'function') {
    // On `throw` : le SDK renvoie un accusé success:false à Gladys.
    throw new Error(`Aucun gestionnaire de commande pour ${device.external_id}`);
  }
  await blueprint.onSetValue(gladys, { device, feature, value, config });
});

// --- Polling : Gladys demande de rafraîchir un appareil -----------------------
gladys.onPoll(async (device) => {
  const blueprint = findBlueprintByDevice(gladys, device);
  if (!blueprint || typeof blueprint.onPoll !== 'function') {
    logger.debug(`onPoll ignoré (pas de polling) pour ${device.external_id}`);
    return;
  }
  await blueprint.onPoll(gladys, config);
});

// --- Configuration mise à jour par l'utilisateur ------------------------------
gladys.onConfigUpdated(async (newConfig) => {
  logger.info('onConfigUpdated → nouvelle configuration reçue');
  config = normalizeConfig(newConfig);
  // On republie les appareils : certaines propriétés (unité, fréquence) en
  // dépendent. `publishDiscoveredDevices` est idempotent (upsert par external_id).
  await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));
});

// --- Cycle de vie de la connexion --------------------------------------------
gladys.on('connected', async () => {
  logger.info('WebSocket connectée à Gladys ✅');
  try {
    // 1) On récupère la config saisie par l'utilisateur.
    config = normalizeConfig(await gladys.getConfig());

    // 2) On (re)publie tous les appareils dès la connexion.
    await gladys.publishDiscoveredDevices(buildDiscoveredDevices(gladys, config));

    // 3) On démarre les abonnements temps réel (capteurs « push »).
    stopPushSubscriptions();
    pushCleanups = DEVICE_BLUEPRINTS.filter((bp) => typeof bp.startPush === 'function').map(
      (bp) => bp.startPush(gladys, config),
    );
  } catch (err) {
    logger.error('Initialisation post-connexion échouée', err);
  }
});

gladys.on('disconnected', () => {
  logger.warn('WebSocket déconnectée — le SDK va tenter de se reconnecter');
  stopPushSubscriptions();
});

function stopPushSubscriptions() {
  for (const cleanup of pushCleanups) {
    try {
      cleanup?.();
    } catch (err) {
      logger.error('Nettoyage abonnement push échoué', err);
    }
  }
  pushCleanups = [];
}

// --- Arrêt propre -------------------------------------------------------------
async function shutdown(signal) {
  logger.info(`Signal ${signal} reçu → arrêt propre`);
  stopPushSubscriptions();
  try {
    await gladys.disconnect();
  } catch {
    // on ignore : on s'arrête de toute façon
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// --- Démarrage ----------------------------------------------------------------
logger.info('Démarrage de l\'intégration template…');
gladys.connect().catch((err) => {
  logger.error('Connexion initiale impossible', err);
  process.exit(1);
});
