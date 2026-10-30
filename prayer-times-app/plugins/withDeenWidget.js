// Expo config plugin: adds the Deen home-screen widget (Android).
// Copies the Java provider + module, the layout and widget info, registers
// the receiver in the manifest and the module in MainApplication.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withAndroidManifest, withMainApplication } = require('expo/config-plugins');

const SRC = path.join(__dirname, 'widget-android');
const PKG_PATH = 'com/tomal/prayertimes/widget';

function withFiles(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const main = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main');
    const javaDir = path.join(main, 'java', PKG_PATH);
    fs.mkdirSync(javaDir, { recursive: true });
    for (const f of ['DeenWidgetProvider.java', 'DeenWidgetModule.java', 'DeenWidgetPackage.java']) {
      fs.copyFileSync(path.join(SRC, f), path.join(javaDir, f));
    }
    const layout = path.join(main, 'res', 'layout');
    const xml = path.join(main, 'res', 'xml');
    fs.mkdirSync(layout, { recursive: true });
    fs.mkdirSync(xml, { recursive: true });
    fs.copyFileSync(path.join(SRC, 'deen_widget.xml'), path.join(layout, 'deen_widget.xml'));
    fs.copyFileSync(path.join(SRC, 'deen_widget_info.xml'), path.join(xml, 'deen_widget_info.xml'));
    return cfg;
  }]);
}

function withReceiver(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.receiver = (app.receiver || []).filter((r) => r.$['android:name'] !== '.widget.DeenWidgetProvider');
    app.receiver.push({
      $: { 'android:name': '.widget.DeenWidgetProvider', 'android:exported': 'false', 'android:label': 'Deen' },
      'intent-filter': [{
        action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          { $: { 'android:name': 'com.tomal.prayertimes.widget.REFRESH' } },
          { $: { 'android:name': 'android.intent.action.TIME_SET' } },
          { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
        ],
      }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/deen_widget_info' } }],
    });
    return cfg;
  });
}

function withPackage(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    const line = 'add(com.tomal.prayertimes.widget.DeenWidgetPackage())';
    if (!src.includes(line)) {
      if (src.includes('PackageList(this).packages.apply {')) {
        src = src.replace('PackageList(this).packages.apply {', `PackageList(this).packages.apply {\n              ${line}`);
      } else {
        throw new Error('withDeenWidget: could not find getPackages() in MainApplication');
      }
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = (config) => withPackage(withReceiver(withFiles(config)));
