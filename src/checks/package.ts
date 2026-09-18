import fs from "fs";
import path from "path";
import { RepoHealthCheckItem } from "../core/types.js";

export function checkPackageJson(rootDir: string): RepoHealthCheckItem {
  const pkgPath = path.join(rootDir, "package.json");

  if (!fs.existsSync(pkgPath)) {
    return {
      id: "package-json",
      name: "Package Configuration",
      required: false,
      weight: 10,
      status: "warning",
      message: "No package.json found (optional for non-npm projects)",
    };
  }

  try {
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);

    const missingFields: string[] = [];
    if (!pkg.name) missingFields.push("name");
    if (!pkg.version) missingFields.push("version");
    if (!pkg.description) missingFields.push("description");
    if (!pkg.license) missingFields.push("license");

    if (missingFields.length > 0) {
      return {
        id: "package-json",
        name: "Package Configuration",
        required: false,
        weight: 10,
        status: "warning",
        foundPath: "package.json",
        message: `package.json missing recommended metadata fields: ${missingFields.join(", ")}`,
      };
    }

    return {
      id: "package-json",
      name: "Package Configuration",
      required: false,
      weight: 10,
      status: "found",
      foundPath: "package.json",
      message: `Valid package.json found (${pkg.name}@${pkg.version})`,
    };
  } catch (err) {
    return {
      id: "package-json",
      name: "Package Configuration",
      required: false,
      weight: 10,
      status: "warning",
      foundPath: "package.json",
      message: "package.json contains invalid JSON syntax",
    };
  }
}
