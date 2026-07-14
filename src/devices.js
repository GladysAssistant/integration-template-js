// -----------------------------------------------------------------------------
// Catalogue des appareils de l'intégration.
//
// C'est le cœur du template. On y déclare plusieurs TYPES d'appareils pour
// illustrer les cas les plus courants :
//
//   1. weather-station   → capteur en LECTURE SEULE, rafraîchi par polling
//                          (température + humidité, données RÉELLES via Open-Meteo)
//   2. living-room-switch→ interrupteur ON/OFF (actionneur binaire)
//   3. living-room-light → lampe VARIABLE (on/off + luminosité)
//   4. office-plug       → prise connectée (actionneur + mesure de puissance)
//   5. motion-sensor     → détecteur de mouvement (capteur PUSH, événementiel)
//
// Chaque "blueprint" expose :
//   - buildDevice(gladys, config) : la charge utile de découverte envoyée à Gladys
//   - onPoll(...)      (optionnel) : lecture périodique des valeurs
//   - onSetValue(...)  (optionnel) : exécution d'une commande utilisateur
//   - startPush(...)   (optionnel) : abonnement à un flux d'événements temps réel
//
// ⚠️  Les points marqués « FAIRE LE TRAVAIL » sont les seuls endroits que vous
//     avez à remplacer par le dialogue avec votre vrai matériel / API cloud.
//     Tout le reste (transport, auth, cycle de vie) est géré par le SDK.
// -----------------------------------------------------------------------------

import { logger } from './logger.js';
import { fetchWeather } from './weather.js';

// Constantes Gladys standard (catégories / types / unités de features).
// Référence : server/utils/constants.js dans le dépôt Gladys.
const CATEGORY = {
  TEMPERATURE_SENSOR: 'temperature-sensor',
  HUMIDITY_SENSOR: 'humidity-sensor',
  SWITCH: 'switch',
  LIGHT: 'light',
  ENERGY_SENSOR: 'energy-sensor',
  MOTION_SENSOR: 'motion-sensor',
};
const TYPE = {
  BINARY: 'binary',
  DECIMAL: 'decimal',
  INTEGER: 'integer',
  BRIGHTNESS: 'brightness',
  POWER: 'power',
};
const UNIT = {
  CELSIUS: 'celsius',
  FAHRENHEIT: 'fahrenheit',
  PERCENT: 'percent',
  WATT: 'watt',
};

// Suffixes d'external_id. On les centralise pour être SÛR d'utiliser la même
// valeur à la découverte et lors du contrôle. Le SDK préfixe automatiquement
// par `ext:<selector>:` via `gladys.externalId(suffix)`.
const SFX = {
  weatherTemperature: 'weather-station:temperature',
  weatherHumidity: 'weather-station:humidity',
  switchOnOff: 'living-room-switch:on-off',
  lightOnOff: 'living-room-light:on-off',
  lightBrightness: 'living-room-light:brightness',
  plugOnOff: 'office-plug:on-off',
  plugPower: 'office-plug:power',
  motionDetected: 'motion-sensor:detected',
};

// État "virtuel" en mémoire. Dans une vraie intégration, cet état est celui de
// votre appareil réel : vous ne le simulez pas, vous le lisez / l'écrivez.
const virtualState = {
  switchOn: false,
  lightOn: false,
  lightBrightness: 50,
  plugOn: false,
};

// =============================================================================
// 1) STATION MÉTÉO — capteur lecture seule, rafraîchi par polling
// =============================================================================
const weatherStation = {
  key: 'weather-station',

  buildDevice(gladys, config) {
    return {
      name: 'Station météo (démo Open-Meteo)',
      external_id: gladys.externalId('weather-station'),
      // poll_frequency : Gladys appellera onPoll à cet intervalle (secondes).
      poll_frequency: config.poll_frequency,
      features: [
        {
          name: 'Température',
          external_id: gladys.externalId(SFX.weatherTemperature),
          category: CATEGORY.TEMPERATURE_SENSOR,
          type: TYPE.DECIMAL,
          unit: config.unit === 'fahrenheit' ? UNIT.FAHRENHEIT : UNIT.CELSIUS,
          min: -50,
          max: 60,
          read_only: true, // capteur : pas d'action possible
          has_feedback: false,
          keep_history: true, // on garde l'historique pour tracer des courbes
        },
        {
          name: 'Humidité',
          external_id: gladys.externalId(SFX.weatherHumidity),
          category: CATEGORY.HUMIDITY_SENSOR,
          type: TYPE.INTEGER,
          unit: UNIT.PERCENT,
          min: 0,
          max: 100,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  async onPoll(gladys, config) {
    logger.info('[weather-station] Polling des valeurs météo…');

    // ------------------------------------------------------------------ //
    // FAIRE LE TRAVAIL : lire la valeur réelle du capteur.
    // Ici c'est un appel HTTP à Open-Meteo. Remplacez par votre source.
    // ------------------------------------------------------------------ //
    const { temperature, humidity } = await fetchWeather(config);

    logger.info(`[weather-station] Lu : ${temperature}° / ${humidity}%`);

    // On publie les deux valeurs en une seule requête (batch, jusqu'à 100).
    await gladys.publishStates([
      { device_feature_external_id: gladys.externalId(SFX.weatherTemperature), state: temperature },
      { device_feature_external_id: gladys.externalId(SFX.weatherHumidity), state: humidity },
    ]);
  },
};

// =============================================================================
// 2) INTERRUPTEUR — actionneur binaire ON/OFF
// =============================================================================
const livingRoomSwitch = {
  key: 'living-room-switch',

  buildDevice(gladys) {
    return {
      name: 'Interrupteur salon',
      external_id: gladys.externalId('living-room-switch'),
      features: [
        {
          name: 'Marche/Arrêt',
          external_id: gladys.externalId(SFX.switchOnOff),
          category: CATEGORY.SWITCH,
          type: TYPE.BINARY,
          read_only: false, // actionneur : l'utilisateur peut le piloter
          has_feedback: true, // l'appareil confirme son nouvel état
          keep_history: true,
        },
      ],
    };
  },

  async onSetValue(gladys, { feature, value }) {
    const on = value === 1;
    logger.info(`[living-room-switch] Commande reçue : ${on ? 'ON' : 'OFF'}`);

    // ------------------------------------------------------------------ //
    // FAIRE LE TRAVAIL : envoyer l'ordre au vrai relais / à la vraie prise.
    // Ex : await mqttClient.publish('salon/switch/set', on ? 'ON' : 'OFF');
    //      await cloudApi.setSwitch(feature.external_id, on);
    // Si l'appareil ne répond pas, faites `throw` : le SDK renverra alors
    // un accusé success:false à Gladys, et l'UI affichera l'échec.
    // ------------------------------------------------------------------ //
    virtualState.switchOn = on;

    // has_feedback = true → on renvoie l'état réel confirmé par l'appareil.
    // (Avec un vrai appareil à feedback, on publierait plutôt l'état reçu
    //  dans son message de confirmation, pas la valeur qu'on a demandée.)
    await gladys.publishState(feature.external_id, on ? 1 : 0);
  },
};

// =============================================================================
// 3) LAMPE VARIABLE — on/off + luminosité (deux features pilotables)
// =============================================================================
const livingRoomLight = {
  key: 'living-room-light',

  buildDevice(gladys) {
    return {
      name: 'Lampe salon',
      external_id: gladys.externalId('living-room-light'),
      features: [
        {
          name: 'Marche/Arrêt',
          external_id: gladys.externalId(SFX.lightOnOff),
          category: CATEGORY.LIGHT,
          type: TYPE.BINARY,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
        {
          name: 'Luminosité',
          external_id: gladys.externalId(SFX.lightBrightness),
          category: CATEGORY.LIGHT,
          type: TYPE.BRIGHTNESS,
          unit: UNIT.PERCENT,
          min: 0,
          max: 100,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
      ],
    };
  },

  async onSetValue(gladys, { feature, value }) {
    // Une seule callback pour tout l'appareil : on aiguille selon la feature.
    const suffixOnOff = gladys.externalId(SFX.lightOnOff);
    const suffixBrightness = gladys.externalId(SFX.lightBrightness);

    if (feature.external_id === suffixOnOff) {
      const on = value === 1;
      logger.info(`[living-room-light] Allumage : ${on ? 'ON' : 'OFF'}`);
      // -------------------------------------------------------------- //
      // FAIRE LE TRAVAIL : allumer / éteindre l'ampoule.
      // Ex : await zigbee.set(ieeeAddr, { state: on ? 'ON' : 'OFF' });
      // -------------------------------------------------------------- //
      virtualState.lightOn = on;
      await gladys.publishState(feature.external_id, on ? 1 : 0);
      return;
    }

    if (feature.external_id === suffixBrightness) {
      const brightness = Math.max(0, Math.min(100, value));
      logger.info(`[living-room-light] Luminosité : ${brightness}%`);
      // -------------------------------------------------------------- //
      // FAIRE LE TRAVAIL : régler la luminosité (souvent à convertir dans
      // l'échelle du matériel, p. ex. 0–254 en Zigbee).
      // Ex : await zigbee.set(ieeeAddr, { brightness: Math.round(brightness / 100 * 254) });
      // -------------------------------------------------------------- //
      virtualState.lightBrightness = brightness;
      virtualState.lightOn = brightness > 0;
      await gladys.publishState(feature.external_id, brightness);
      return;
    }

    logger.warn(`[living-room-light] Feature inconnue : ${feature.external_id}`);
  },
};

// =============================================================================
// 4) PRISE CONNECTÉE — actionneur binaire + mesure de puissance (lecture seule)
//    Montre un appareil MIXTE : on le pilote ET on lit une mesure.
// =============================================================================
const officePlug = {
  key: 'office-plug',

  buildDevice(gladys, config) {
    return {
      name: 'Prise bureau',
      external_id: gladys.externalId('office-plug'),
      poll_frequency: config.poll_frequency, // pour rafraîchir la puissance
      features: [
        {
          name: 'Marche/Arrêt',
          external_id: gladys.externalId(SFX.plugOnOff),
          category: CATEGORY.SWITCH,
          type: TYPE.BINARY,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
        {
          name: 'Puissance instantanée',
          external_id: gladys.externalId(SFX.plugPower),
          category: CATEGORY.ENERGY_SENSOR,
          type: TYPE.POWER,
          unit: UNIT.WATT,
          min: 0,
          max: 3680,
          read_only: true, // mesure : non pilotable
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  async onSetValue(gladys, { feature, value }) {
    const on = value === 1;
    logger.info(`[office-plug] Commande relais : ${on ? 'ON' : 'OFF'}`);
    // ------------------------------------------------------------------ //
    // FAIRE LE TRAVAIL : commuter le relais de la prise.
    // ------------------------------------------------------------------ //
    virtualState.plugOn = on;
    await gladys.publishState(feature.external_id, on ? 1 : 0);
  },

  async onPoll(gladys) {
    // ------------------------------------------------------------------ //
    // FAIRE LE TRAVAIL : lire la puissance instantanée mesurée par la prise.
    // Ici on simule : 0 W éteinte, ~120 W (± bruit) allumée.
    // ------------------------------------------------------------------ //
    const power = virtualState.plugOn ? Math.round(120 + Math.random() * 15) : 0;
    logger.info(`[office-plug] Puissance mesurée : ${power} W`);
    await gladys.publishState(gladys.externalId(SFX.plugPower), power);
  },
};

// =============================================================================
// 5) DÉTECTEUR DE MOUVEMENT — capteur PUSH (événementiel, pas de polling)
//    Illustre le cas où l'appareil pousse ses états quand ILS changent.
// =============================================================================
const motionSensor = {
  key: 'motion-sensor',

  buildDevice(gladys) {
    return {
      name: 'Détecteur de mouvement entrée',
      external_id: gladys.externalId('motion-sensor'),
      features: [
        {
          name: 'Mouvement',
          external_id: gladys.externalId(SFX.motionDetected),
          category: CATEGORY.MOTION_SENSOR,
          type: TYPE.BINARY,
          read_only: true,
          has_feedback: false,
          keep_history: true,
        },
      ],
    };
  },

  // Pas de onPoll : ce capteur est piloté par les événements. On s'abonne
  // une fois à la connexion et on publie l'état quand il change.
  startPush(gladys) {
    logger.info('[motion-sensor] Abonnement au flux de mouvements…');

    // ------------------------------------------------------------------ //
    // FAIRE LE TRAVAIL : s'abonner au flux temps réel de votre matériel.
    // Ex : mqttClient.on('message', (topic, payload) => {
    //        if (topic === 'entree/motion') {
    //          gladys.publishState(gladys.externalId(SFX.motionDetected),
    //                              payload === 'true' ? 1 : 0);
    //        }
    //      });
    //
    // Ici on SIMULE un mouvement détecté puis levé, toutes les ~60 s.
    // ------------------------------------------------------------------ //
    const interval = setInterval(async () => {
      try {
        logger.info('[motion-sensor] Mouvement détecté → 1');
        await gladys.publishState(gladys.externalId(SFX.motionDetected), 1);
        // On repasse à 0 après 10 s (fin de détection).
        setTimeout(() => {
          gladys
            .publishState(gladys.externalId(SFX.motionDetected), 0)
            .catch((e) => logger.error('[motion-sensor] publishState 0 échoué', e));
        }, 10_000);
      } catch (e) {
        logger.error('[motion-sensor] publishState 1 échoué', e);
      }
    }, 60_000);

    // On renvoie une fonction de nettoyage (à appeler à la déconnexion).
    return () => clearInterval(interval);
  },
};

// Liste ordonnée de tous les blueprints exposés par l'intégration.
export const DEVICE_BLUEPRINTS = [
  weatherStation,
  livingRoomSwitch,
  livingRoomLight,
  officePlug,
  motionSensor,
];

/**
 * Construit la charge utile de découverte pour Gladys (tous les appareils).
 */
export function buildDiscoveredDevices(gladys, config) {
  return DEVICE_BLUEPRINTS.map((bp) => bp.buildDevice(gladys, config));
}

/**
 * Retrouve le blueprint qui possède un appareil donné, à partir de son
 * external_id (utile pour aiguiller onPoll / onSetValue).
 */
export function findBlueprintByDevice(gladys, device) {
  return DEVICE_BLUEPRINTS.find(
    (bp) => bp.buildDevice(gladys, {}).external_id === device.external_id,
  );
}
