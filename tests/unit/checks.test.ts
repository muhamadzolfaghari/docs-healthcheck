import { describe, it, expect } from "vitest";
import path from "path";
import { checkReadme } from "../../src/checks/readme.js";
import { checkChangelog } from "../../src/checks/changelog.js";
import { checkContributing, checkCodeOfConduct } from "../../src/checks/contributing.js";
import { checkLicense, checkDocsDirectory, checkExamplesDirectory } from "../../src/checks/metadata.js";

describe("Repository Checks Unit Tests", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const emptyDir = path.resolve(__dirname, "../fixtures");

  it("checks readme in root and empty directory", () => {
    const rootCheck = checkReadme(rootDir);
    expect(rootCheck.status).toBe("found");

    const emptyCheck = checkReadme(emptyDir);
    expect(emptyCheck.status).toBe("missing");
  });

  it("checks changelog in root and empty directory", () => {
    const emptyCheck = checkChangelog(emptyDir);
    expect(emptyCheck.status).toBe("warning");
  });

  it("checks contributing and code of conduct", () => {
    const emptyContrib = checkContributing(emptyDir);
    expect(emptyContrib.status).toBe("warning");

    const emptyCoc = checkCodeOfConduct(emptyDir);
    expect(emptyCoc.status).toBe("warning");
  });

  it("checks license, docs, and examples directory", () => {
    const license = checkLicense(rootDir);
    expect(license.status).toBe("found");

    const docs = checkDocsDirectory(rootDir);
    expect(docs.status).toBe("found");

    const examples = checkExamplesDirectory(emptyDir);
    expect(examples.status).toBe("warning");
  });
});
