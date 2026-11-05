import { AppRegistry, Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import { runWidgetTicks } from './src/lib/widgetTicks';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and sets up the environment for both Expo Go and a native build.
registerRootComponent(App);

// A tick on the home-screen widget: save it and cancel that prayer's alerts.
if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask('DeenWidgetTick', () => async () => {
    await runWidgetTicks();
  });
}
