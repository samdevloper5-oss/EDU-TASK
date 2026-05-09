const fs = require("fs");
const path = require("path");

function parseDotenv(contents) {
  const parsed = {};
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx <= 0) {
      continue;
    }

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }

  return parsed;
}

function expandVars(value, source) {
  return value.replace(/\$\{([^}]+)\}/g, (_, name) => {
    if (Object.prototype.hasOwnProperty.call(process.env, name)) {
      return process.env[name];
    }
    if (Object.prototype.hasOwnProperty.call(source, name)) {
      return source[name];
    }
    return "";
  });
}

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  const parsed = parseDotenv(raw);

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] != null && String(process.env[key]).trim() !== "") {
      continue;
    }
    process.env[key] = expandVars(value, parsed);
  }
}

loadEnvFile();

