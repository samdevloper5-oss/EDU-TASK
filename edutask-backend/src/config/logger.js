const env = require("./env");

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level) {
  const configuredLevel =
    (env && env.app && env.app.logLevel) ? env.app.logLevel : "info";
  const configured = LEVELS[configuredLevel] ?? LEVELS.info;
  const current = LEVELS[level] ?? LEVELS.info;
  return current <= configured;
}

function write(level, message, meta = {}) {
  if (!shouldLog(level)) {
    return;
  }
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

module.exports = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  debug: (message, meta) => write("debug", message, meta),
};
