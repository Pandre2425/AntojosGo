// plugins/fix-gradle-config.js
const { withProjectBuildGradle, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withFixGradleConfig(config) {
  // 1) build.gradle (raíz android)
  config = withProjectBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;

    // A) ext.kotlinVersion = 2.0.21 (o crea el bloque si no existe)
    if (/ext\s*{[\s\S]*?kotlinVersion\s*=/.test(c)) {
      c = c.replace(/kotlinVersion\s*=\s*['"][^'"]+['"]/, `kotlinVersion = '2.0.21'`);
    } else {
      c = c.replace(/buildscript\s*{/, `buildscript {\n    ext { kotlinVersion = '2.0.21' }`);
    }

    // B) usa ese kotlinVersion en el classpath
    c = c.replace(
      /classpath\(['"]org\.jetbrains\.kotlin:kotlin-gradle-plugin[:][^'"]*['"]\)/,
      `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")`
    );

    // C) clava AGP 8.7.2 (segura con Expo 54)
    c = c.replace(
      /classpath\(['"]com\.android\.tools\.build:gradle[:][^'"]*['"]\)/,
      `classpath("com.android.tools.build:gradle:8.7.2")`
    );

    // D) Repos de Mapbox (no duplica si ya existe)
    if (!c.includes("api.mapbox.com/downloads/v2/releases/maven")) {
      c = c.replace(/allprojects\s*{[\s\S]*?repositories\s*{/, (m) =>
        m +
`        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication { basic(BasicAuthentication) }
            credentials {
                username = 'mapbox'
                password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ""
            }
        }`
      );
    }

    cfg.modResults.contents = c;
    return cfg;
  });

  // 2) gradle.properties
  config = withGradleProperties(config, (cfg) => {
    const ensure = (name, value) => {
      if (!cfg.modResults.find(p => p.type === 'property' && p.key === name)) {
        cfg.modResults.push({ type: 'property', key: name, value });
      } else {
        cfg.modResults = cfg.modResults.map(p => p.key === name ? ({...p, value}) : p);
      }
    };
    ensure('kotlin.code.style', 'official');
    ensure('kotlin.version', '2.0.21');
    ensure('expo.kotlin.version', '2.0.21');
    // Mapbox token leerá desde gradle.properties
    // (no pongas aquí el valor real si usas .env/.secret)
    ensure('MAPBOX_DOWNLOADS_TOKEN', process.env.MAPBOX_DOWNLOADS_TOKEN || '');
    // Opcional: reduce problemas de path en Windows
    ensure('org.gradle.jvmargs', '-Xmx2048m -Dfile.encoding=UTF-8');
    return cfg;
  });

  // 3) app/build.gradle — quita enableBundleCompression si alguien lo vuelve a meter
  config = withAppBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;
    c = c.replace(/^\s*enableBundleCompression\s*=.*$/gm, '');
    cfg.modResults.contents = c;
    return cfg;
  });

  return config;
};
