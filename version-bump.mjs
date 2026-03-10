import fs from "fs";
import path from "path";

const pkg = JSON.parse(fs.readFileSync("./package.json", "utf-8"));
const manifest = JSON.parse(fs.readFileSync("./manifest.json", "utf-8"));
const versions = JSON.parse(fs.readFileSync("./versions.json", "utf-8"));

const versionType = process.argv[2] || "patch";

let newVersion;

switch (versionType) {
  case "major":
    const [major] = pkg.version.split(".").map(Number);
    newVersion = `${major + 1}.0.0`;
    break;
  case "minor":
    const [major2, minor] = pkg.version.split(".").map(Number);
    newVersion = `${major2}.${minor + 1}.0`;
    break;
  case "patch":
  default:
    const [major3, minor2, patch] = pkg.version.split(".").map(Number);
    newVersion = `${major3}.${minor2}.${patch + 1}`;
    break;
}

pkg.version = newVersion;
manifest.version = newVersion;
versions[newVersion] = manifest.minAppVersion;

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2) + "\n");
fs.writeFileSync("./manifest.json", JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync("./versions.json", JSON.stringify(versions, null, 2) + "\n");

console.log(`Version bumped to ${newVersion}`);