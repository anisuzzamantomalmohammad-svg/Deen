package com.tomal.prayertimes.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

// JS side: NativeModules.DeenWidget.pin() and .refresh().
public class DeenWidgetModule extends ReactContextBaseJavaModule {
  DeenWidgetModule(ReactApplicationContext ctx) {
    super(ctx);
  }

  @Override
  public String getName() {
    return "DeenWidget";
  }

  @ReactMethod
  public void refresh() {
    DeenWidgetProvider.renderAll(getReactApplicationContext());
  }

  @ReactMethod
  public void pin(Promise promise) {
    try {
      Context c = getReactApplicationContext();
      if (Build.VERSION.SDK_INT < 26) { promise.resolve(false); return; }
      AppWidgetManager m = c.getSystemService(AppWidgetManager.class);
      if (m == null || !m.isRequestPinAppWidgetSupported()) { promise.resolve(false); return; }
      promise.resolve(m.requestPinAppWidget(new ComponentName(c, DeenWidgetProvider.class), null, null));
    } catch (Exception e) {
      promise.resolve(false);
    }
  }
}
