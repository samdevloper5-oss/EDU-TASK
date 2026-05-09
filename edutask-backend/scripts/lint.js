const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INCLUDE_DIRS = ["src", "tests"];
const EXCLUDE_DIRS = new Set(["node_modules", ".git", ".github", "docs"]);

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkSyntax(file) {
  const source = fs.readFileSync(file, "utf8");
  try {
    // Parse-only syntax check.
    // eslint-disable-next-line no-new-func
    new Function(source);
    return null;
  } catch (err) {
    return `${file}: ${err.message}`;
  }
}

const jsFiles = INCLUDE_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const errors = jsFiles.map(checkSyntax).filter(Boolean);

if (errors.length > 0) {
  console.error("Syntax lint failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Syntax lint passed for ${jsFiles.length} files.`);
