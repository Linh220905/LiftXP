const fs = require("node:fs");
const path = require("node:path");
const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");

const EXTENSION_NAME = "TrainXPWidgetExtension";
const EXTENSION_BUNDLE_ID = "com.trainxp.workout.widgets";

function hasTarget(project, name) {
  return Object.values(project.pbxNativeTargetSection()).some(
    (target) =>
      target &&
      typeof target === "object" &&
      String(target.name || "").replaceAll('"', "") === name,
  );
}

function addSources(project, targetId, files) {
  for (const file of files) {
    if (!project.hasFile(file))
      project.addSourceFile(file, { target: targetId });
  }
}

function configureTarget(project, target, settings) {
  const configurationLists = project.pbxXCConfigurationList();
  const configurations = project.pbxXCBuildConfigurationSection();
  const list = configurationLists[target.buildConfigurationList];
  for (const item of list.buildConfigurations) {
    const configuration = configurations[item.value];
    Object.assign(configuration.buildSettings, settings);
  }
}

const withTrainXPLiveActivity = (config) => {
  config = withDangerousMod(config, [
    "ios",
    async (mod) => {
      const projectRoot = mod.modRequest.platformProjectRoot;
      const sourceRoot = path.resolve(__dirname, "../ios-widgets");
      const appSourceRoot = path.join(projectRoot, "TrainXPNative");
      const extensionSourceRoot = path.join(projectRoot, EXTENSION_NAME);
      fs.mkdirSync(appSourceRoot, { recursive: true });
      fs.mkdirSync(extensionSourceRoot, { recursive: true });

      for (const file of [
        "TrainXPLiveActivityModule.swift",
        "TrainXPLiveActivityBridge.m",
        "WorkoutActivityAttributes.swift",
      ]) {
        fs.copyFileSync(
          path.join(sourceRoot, file),
          path.join(appSourceRoot, file),
        );
      }
      for (const file of [
        "TrainXPWidgetBundle.swift",
        "WorkoutLiveActivityWidget.swift",
        "WorkoutActivityAttributes.swift",
      ]) {
        fs.copyFileSync(
          path.join(sourceRoot, file),
          path.join(extensionSourceRoot, file),
        );
      }
      fs.writeFileSync(
        path.join(extensionSourceRoot, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>NSExtension</key><dict><key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string></dict></dict></plist>`,
      );
      return mod;
    },
  ]);

  return withXcodeProject(config, (mod) => {
    const project = mod.modResults;
    const appTarget = project.getFirstTarget();

    addSources(project, appTarget.uuid, [
      "TrainXPNative/TrainXPLiveActivityModule.swift",
      "TrainXPNative/TrainXPLiveActivityBridge.m",
      "TrainXPNative/WorkoutActivityAttributes.swift",
    ]);

    if (!hasTarget(project, EXTENSION_NAME)) {
      const created = project.addTarget(
        EXTENSION_NAME,
        "app_extension",
        EXTENSION_NAME,
        EXTENSION_BUNDLE_ID,
      );
      const widgetTarget = created.pbxNativeTarget;
      addSources(project, created.uuid, [
        `${EXTENSION_NAME}/TrainXPWidgetBundle.swift`,
        `${EXTENSION_NAME}/WorkoutLiveActivityWidget.swift`,
        `${EXTENSION_NAME}/WorkoutActivityAttributes.swift`,
      ]);
      configureTarget(project, widgetTarget, {
        APPLICATION_EXTENSION_API_ONLY: "YES",
        IPHONEOS_DEPLOYMENT_TARGET: "16.1",
        INFOPLIST_FILE: `${EXTENSION_NAME}/Info.plist`,
        PRODUCT_BUNDLE_IDENTIFIER: EXTENSION_BUNDLE_ID,
        SKIP_INSTALL: "YES",
        SWIFT_VERSION: "5.0",
        TARGETED_DEVICE_FAMILY: "1,2",
      });
    }
    return mod;
  });
};

module.exports = withTrainXPLiveActivity;
