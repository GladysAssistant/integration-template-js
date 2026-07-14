// -----------------------------------------------------------------------------
// Petit logger sans dépendance.
//
// Les logs de votre intégration sont capturés par le superviseur Gladys
// (stdout / stderr du conteneur). Écrivez donc simplement sur la console :
// c'est le canal de debug principal pour une intégration externe.
//
// Astuce : passez le niveau souhaité via la variable d'environnement
// `LOG_LEVEL` (debug | info | warn | error). Par défaut : info.
// -----------------------------------------------------------------------------

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function line(level, args) {
  // Pas de Date.now() ici pour rester déterministe côté tests, mais en
  // production un timestamp ISO aide beaucoup à corréler les événements.
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const stream = level === 'error' || level === 'warn' ? console.error : console.log;
  stream(prefix, ...args);
}

export const logger = {
  debug: (...args) => currentLevel <= LEVELS.debug && line('debug', args),
  info: (...args) => currentLevel <= LEVELS.info && line('info', args),
  warn: (...args) => currentLevel <= LEVELS.warn && line('warn', args),
  error: (...args) => currentLevel <= LEVELS.error && line('error', args),
};
