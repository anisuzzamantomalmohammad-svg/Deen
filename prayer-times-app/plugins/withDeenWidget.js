// Expo config plugin: adds the Deen home-screen widget (Android).
// Copies the Java provider, module and tick service, the layout and widget
// info, registers the receiver and service in the manifest and the module in
// MainApplication.
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
    for (const f of ['DeenWidgetProvider.java', 'DeenWidgetModule.java', 'DeenWidgetPackage.java', 'DeenTickService.java', 'DeenWidgets.java', 'DeenGlassWidget.java', 'DeenDotsWidget.java', 'DeenFastWidget.java']) {
      fs.copyFileSync(path.join(SRC, f), path.join(javaDir, f));
    }
    const layout = path.join(main, 'res', 'layout');
    const xml = path.join(main, 'res', 'xml');
    fs.mkdirSync(layout, { recursive: true });
    fs.mkdirSync(xml, { recursive: true });
    for (const k of ['', '_glass', '_dots', '_fast']) {
      fs.copyFileSync(path.join(SRC, `deen_widget${k}.xml`), path.join(layout, `deen_widget${k}.xml`));
      fs.copyFileSync(path.join(SRC, `deen_widget${k}_info.xml`), path.join(xml, `deen_widget${k}_info.xml`));
    }
    return cfg;
  }]);
}

// The three widgets in the launcher's list. DeenWidgetProvider stays as a
// plain receiver (refresh, ticks, clock changes) and is no longer a widget.
const WIDGETS = [
  { name: '.widget.DeenGlassWidget', label: 'Deen · All 5 prayers', info: 'deen_widget_glass_info' },
  { name: '.widget.DeenDotsWidget', label: 'Deen · Now and next', info: 'deen_widget_dots_info' },
  { name: '.widget.DeenFastWidget', label: 'Deen · Seheri & Iftar', info: 'deen_widget_fast_info' },
  { name: '.widget.DeenWidgetProvider', label: 'Deen', main: true },
];

function withReceiver(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    const names = WIDGETS.map((w) => w.name);
    app.receiver = (app.receiver || []).filter((r) => !names.includes(r.$['android:name']));
    for (const w of WIDGETS) {
      const action = w.main ? [] : [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }];
      if (w.main) {
        action.push(
          { $: { 'android:name': 'com.tomal.prayertimes.widget.REFRESH' } },
          { $: { 'android:name': 'android.intent.action.TIME_SET' } },
          { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
        );
      }
      app.receiver.push({
        $: { 'android:name': w.name, 'android:exported': 'false', 'android:label': w.label },
        'intent-filter': [{ action }],
        ...(w.info ? { 'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': `@xml/${w.info}` } }] } : {}),
      });
    }
    // Short background task that saves a widget tick (HeadlessJS).
    app.service = (app.service || []).filter((x) => x.$['android:name'] !== '.widget.DeenTickService');
    app.service.push({ $: { 'android:name': '.widget.DeenTickService', 'android:exported': 'false' } });
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
