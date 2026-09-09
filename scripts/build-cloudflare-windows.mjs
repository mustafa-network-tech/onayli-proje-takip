// Windows fallback for environments where fs.cpSync silently skips directories.
// The override applies only to generated .open-next output in this workspace.
import fs from "node:fs";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";

const workspace = path.resolve(import.meta.dirname, "..");
if (process.cwd() !== workspace) throw new Error("Run this script from the project root.");
const output = path.join(workspace, ".open-next");
const originalCopy = fs.cpSync;
function copy(source, destination, options = {}) {
  const target = path.resolve(destination);
  if (target !== output && !target.startsWith(output + path.sep)) throw new Error("Copy target must stay inside .open-next.");
  if (options.filter && !options.filter(source, destination)) return;
  const stat = options.dereference ? fs.statSync(source) : fs.lstatSync(source);
  if (stat.isDirectory()) {
    if (!options.recursive) throw new Error("Recursive copy required.");
    fs.mkdirSync(destination, { recursive: true });
    for (const name of fs.readdirSync(source)) copy(path.join(source, name), path.join(destination, name), options);
  } else if (stat.isSymbolicLink()) {
    if (!fs.existsSync(destination)) fs.symlinkSync(fs.readlinkSync(source), destination);
  } else {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination) && options.force === false) {
      if (options.errorOnExist) throw new Error("Copy destination already exists.");
      return;
    }
    fs.copyFileSync(source, destination, options.mode);
    if (options.preserveTimestamps) fs.utimesSync(destination, stat.atime, stat.mtime);
  }
}
if (process.platform === "win32") {
  fs.cpSync = (source, destination, options) => {
    const target = path.resolve(destination);
    return target === output || target.startsWith(output + path.sep)
      ? copy(source, destination, options) : originalCopy(source, destination, options);
  };
  syncBuiltinESMExports();
}
const { buildCommand } = await import("../node_modules/@opennextjs/cloudflare/dist/cli/commands/build.js");
await buildCommand({ skipNextBuild: process.argv.includes("--skipNextBuild") });
