// frontend/plugins/fix-gradle-config.js
const { withPlugins, withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

function withFixGradleConfig(config) {
  // 1) Forzar Kotlin y AGP en android/build.gradle
  config = withProjectBuildGradle(config, (config) => {
    let c = config.modResults.contents;

    // ext { kotlinVersion = '2.0.21' }
    if (c.match(/ext\s*\{/)) {
      c = c.replace(/ext\s*\{[\s\S]*?\}/, `ext {
        kotlinVersion = '2.0.21'
      }`);
    } else {
      c = c.replace(/buildscript\s*\{/, `buildscript {
  ext { kotlinVersion = '2.0.21' }`);
    }

    // classpath kotlin gradle plugin -> 2.0.21 y AGP -> 8.7.2
    c = c
      .replace(/classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin:[^'"]+['"]\)/g, `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")`)
      .replace(/classpath\(['"]com\.android\.tools\.build:gradle:[^'"]+['"]\)/g, `classpath("com.android.tools.build:gradle:8.7.2")`);

    config.modResults.contents = c;
    return config;
  });

  // 2) Asegurar propiedades en gradle.properties
  config = withGradleProperties(config, (config) => {
    const props = new Set(config.modResults.map((p) => `${p.key}=${p.value}`));
    const ensure = (key, value) => {
      const line = `${key}=${value}`;
      if (![...props].some((x) => x.startsWith(`${key}=`))) {
        config.modResults.push({ type: 'property', key, value });
      } else {
        config.modResults = config.modResults.map((p) => (p.key === key ? { ...p, value } : p));
      }
    };

    ensure('kotlin.code.style', 'official');
    ensure('kotlin.version', '2.0.21');
    ensure('expo.kotlin.version', '2.0.21');

    return config;
  });

  // 3) Quitar enableBundleCompression si se cuela en app/build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (typeof config.modResults.contents === 'string') {
      config.modResults.contents = config.modResults.contents.replace(/^\s*enableBundleCompression\s*=.*\r?\n/gm, '');
    }
    return config;
  });

  return config;
}

module.exports = (config) => withPlugins(config, [withFixGradleConfig]);
