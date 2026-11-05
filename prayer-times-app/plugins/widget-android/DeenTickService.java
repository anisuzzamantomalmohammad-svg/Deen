package com.tomal.prayertimes.widget;

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

// Runs the app's "DeenWidgetTick" JS task for a few seconds after a widget
// tick, so the tick is saved and that prayer's alerts are cancelled even when
// the app is closed.
public class DeenTickService extends HeadlessJsTaskService {
  @Override
  protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
    Bundle extras = intent != null ? intent.getExtras() : null;
    return new HeadlessJsTaskConfig("DeenWidgetTick", extras != null ? Arguments.fromBundle(extras) : Arguments.createMap(), 20000, true);
  }
}
