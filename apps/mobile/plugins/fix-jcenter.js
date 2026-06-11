const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin that replaces deprecated jcenter() with mavenCentral()
 * in react-native-shared-group-preferences's build.gradle.
 * jcenter() was removed in Gradle 9.0, which Expo SDK 55 uses.
 *
 * Uses require.resolve to find the package regardless of monorepo hoisting.
 */
function withFixJcenter(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      // Use require.resolve to correctly find the package in monorepos
      let pkgDir;
      try {
        const pkgJson = require.resolve(
          "react-native-shared-group-preferences/package.json",
          { paths: [config.modRequest.projectRoot] }
        );
        pkgDir = path.dirname(pkgJson);
      } catch {
        console.warn(
          "[fix-jcenter] Could not resolve react-native-shared-group-preferences, skipping patch"
        );
        return config;
      }

      const buildGradlePath = path.join(pkgDir, "android", "build.gradle");

      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, "utf-8");
        if (contents.includes("jcenter()")) {
          contents = contents.replace(/jcenter\(\)/g, "mavenCentral()");
          fs.writeFileSync(buildGradlePath, contents, "utf-8");
          console.log(
            "[fix-jcenter] Patched " + buildGradlePath + ": replaced jcenter() with mavenCentral()"
          );
        } else {
          console.log("[fix-jcenter] No jcenter() found, already patched or not needed");
        }
      } else {
        console.warn("[fix-jcenter] build.gradle not found at: " + buildGradlePath);
      }

      return config;
    },
  ]);
}

module.exports = withFixJcenter;
