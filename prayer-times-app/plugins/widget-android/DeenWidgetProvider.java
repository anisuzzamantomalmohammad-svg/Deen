package com.tomal.prayertimes.widget;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;

// Deen countdown widget: an ivory card with a faded star pattern and a gold
// glow, a live countdown to the next prayer, and a gold line around the edge
// that fills as the time passes. Red in prohibited times, amber in the last
// 10 minutes. Data comes from widget.json, written by the app.
public class DeenWidgetProvider extends AppWidgetProvider {
  public static final String ACTION_REFRESH = "com.tomal.prayertimes.widget.REFRESH";
  private static final long FIVE_MIN = 5 * 60 * 1000L;

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    renderAll(context);
  }

  @Override
  public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
    renderAll(context);
  }

  @Override
  public void onReceive(Context context, Intent intent) {
    super.onReceive(context, intent);
    String a = intent.getAction();
    if (ACTION_REFRESH.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
      renderAll(context);
    }
  }

  public static void renderAll(Context context) {
    AppWidgetManager m = AppWidgetManager.getInstance(context);
    int[] ids = m.getAppWidgetIds(new ComponentName(context, DeenWidgetProvider.class));
    JSONObject data = readData(context);
    long now = System.currentTimeMillis();
    long nextWake = now + FIVE_MIN;
    for (int id : ids) {
      try {
        long w = render(context, m, id, data, now);
        if (w > now && w < nextWake) nextWake = w;
      } catch (Exception e) {
        // keep the others going
      }
    }
    if (data != null && data.optBoolean("maxTwo", true)) trimNotifications(context);
    if (ids.length > 0) schedule(context, nextWake);
  }

  private static JSONObject readData(Context context) {
    try {
      File f = new File(context.getFilesDir(), "widget.json");
      if (!f.exists()) return null;
      FileInputStream in = new FileInputStream(f);
      byte[] buf = new byte[(int) f.length()];
      int read = 0;
      while (read < buf.length) {
        int r = in.read(buf, read, buf.length - read);
        if (r < 0) break;
        read += r;
      }
      in.close();
      return new JSONObject(new String(buf, 0, read, StandardCharsets.UTF_8));
    } catch (Exception e) {
      return null;
    }
  }

  private static int color(JSONObject c, String key, String fallback) {
    try {
      return Color.parseColor(c != null ? c.optString(key, fallback) : fallback);
    } catch (Exception e) {
      return Color.parseColor(fallback);
    }
  }

  // Returns the next time this widget needs redrawing.
  private static long render(Context context, AppWidgetManager m, int id, JSONObject data, long now) throws Exception {
    RemoteViews v = new RemoteViews(context.getPackageName(), context.getResources().getIdentifier("deen_widget", "layout", context.getPackageName()));
    int idTitle = res(context, "w_title");
    int idTimer = res(context, "w_timer");
    int idLine = res(context, "w_line");
    int idSpecial = res(context, "w_special");
    int idIftarRow = res(context, "w_iftar_row");
    int idIftarLabel = res(context, "w_iftar_label");
    int idIftar = res(context, "w_iftar");
    int idBg = res(context, "w_bg");
    int idRoot = res(context, "w_root");

    Bundle o = m.getAppWidgetOptions(id);
    float dens = context.getResources().getDisplayMetrics().density;
    int wDp = Math.max(110, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 150));
    int hDp = Math.max(110, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 150));
    boolean medium = wDp >= 200;
    // Keep the bitmap under ~500 KB: widget updates fail above about 1 MB.
    float scale = (float) Math.min(dens, Math.sqrt(500000.0 / (4.0 * wDp * hDp)));
    int wPx = Math.round(wDp * scale);
    int hPx = Math.round(hDp * scale);

    Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
    if (launch != null) {
      PendingIntent pi = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      v.setOnClickPendingIntent(idRoot, pi);
    }

    JSONObject colors = data != null ? data.optJSONObject("colors") : null;
    int bg = color(colors, "bg", "#FBF6EC");
    int ink = color(colors, "ink", "#2B2418");
    int accent = color(colors, "accent", "#B07F2A");
    int glow = color(colors, "glow", "#E9C46A");
    int red = color(colors, "red", "#C0392B");
    int amber = color(colors, "amber", "#C9851F");

    JSONObject slot = null;
    long wake = now + FIVE_MIN;
    if (data != null) {
      JSONArray slots = data.optJSONArray("slots");
      for (int i = 0; slots != null && i < slots.length(); i++) {
        JSONObject s = slots.getJSONObject(i);
        if (now >= s.getLong("from") && now < s.getLong("to")) { slot = s; break; }
      }
    }
    JSONObject text = data != null ? data.optJSONObject("text") : null;

    if (slot == null) {
      v.setTextViewText(idTitle, text != null ? text.optString("open", "Open Deen") : "Open Deen");
      v.setViewVisibility(idTimer, View.GONE);
      v.setViewVisibility(idLine, View.GONE);
      v.setViewVisibility(idSpecial, View.GONE);
      v.setViewVisibility(idIftarRow, View.GONE);
      v.setImageViewBitmap(idBg, drawCard(wPx, hPx, scale, bg, accent, glow, accent, 0f, false, false));
      m.updateAppWidget(id, v);
      return now + FIVE_MIN;
    }

    long from = slot.getLong("from");
    long to = slot.getLong("to");
    float progress = Math.max(0f, Math.min(1f, (now - from) / (float) Math.max(1, to - from)));
    boolean inRed = false;
    JSONArray reds = data.optJSONArray("red");
    for (int i = 0; reds != null && i < reds.length(); i++) {
      JSONObject r = reds.getJSONObject(i);
      long a = r.getLong("from");
      long b = r.getLong("to");
      if (now >= a && now < b) { inRed = true; wake = Math.min(wake, b); }
      else if (a > now) wake = Math.min(wake, a);
    }
    boolean last10 = to - now <= 10 * 60 * 1000L;
    if (!last10) wake = Math.min(wake, to - 10 * 60 * 1000L);
    wake = Math.min(wake, to);
    int lineColor = inRed ? red : last10 ? amber : accent;

    v.setTextViewText(idTitle, slot.optString("title"));
    v.setTextColor(idTitle, inRed ? red : ink);
    v.setViewVisibility(idTimer, View.VISIBLE);
    v.setChronometer(idTimer, SystemClock.elapsedRealtime() + (to - now), null, true);
    if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(idTimer, true);
    v.setTextColor(idTimer, inRed ? red : last10 ? amber : ink);
    v.setViewVisibility(idLine, View.VISIBLE);
    v.setTextViewText(idLine, inRed && text != null ? text.optString("prohibited", "Prohibited time") : slot.optString("line"));
    v.setTextColor(idLine, inRed ? red : (ink & 0x00FFFFFF) | 0x99000000);

    String special = slot.optString("special", "");
    v.setViewVisibility(idSpecial, medium && special.length() > 0 ? View.VISIBLE : View.GONE);
    v.setTextViewText(idSpecial, special);
    v.setTextColor(idSpecial, accent);

    long iftar = slot.optLong("iftar", 0);
    if (iftar > now && iftar != to) {
      v.setViewVisibility(idIftarRow, View.VISIBLE);
      v.setTextViewText(idIftarLabel, text != null ? text.optString("iftar", "Iftar in") : "Iftar in");
      v.setTextColor(idIftarLabel, accent);
      v.setChronometer(idIftar, SystemClock.elapsedRealtime() + (iftar - now), null, true);
      if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(idIftar, true);
      v.setTextColor(idIftar, accent);
    } else {
      v.setViewVisibility(idIftarRow, View.GONE);
    }

    v.setImageViewBitmap(idBg, drawCard(wPx, hPx, scale, bg, lineColor, glow, accent, progress, true, slot.optBoolean("done")));
    m.updateAppWidget(id, v);
    return wake;
  }

  private static int res(Context c, String name) {
    return c.getResources().getIdentifier(name, "id", c.getPackageName());
  }

  // The card: ivory, faded stars, a soft gold glow, the timer line and the tick.
  static Bitmap drawCard(int w, int h, float d, int bg, int line, int glow, int accent, float progress, boolean tick, boolean done) {
    Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
    Canvas c = new Canvas(bmp);
    float r = 22 * d;
    RectF box = new RectF(0, 0, w, h);
    Path clip = new Path();
    clip.addRoundRect(box, r, r, Path.Direction.CW);
    c.clipPath(clip);

    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setColor(bg);
    c.drawRect(box, p);

    p.setShader(new RadialGradient(w / 2f, h * 0.38f, Math.max(w, h) * 0.75f, (glow & 0x00FFFFFF) | 0x40000000, glow & 0x00FFFFFF, Shader.TileMode.CLAMP));
    c.drawRect(box, p);
    p.setShader(null);

    // Faded 8-point stars.
    Paint sp = new Paint(Paint.ANTI_ALIAS_FLAG);
    sp.setStyle(Paint.Style.STROKE);
    sp.setStrokeWidth(1 * d);
    sp.setColor((accent & 0x00FFFFFF) | 0x1F000000);
    float step = 30 * d;
    float s = 8 * d;
    for (float y = step / 2; y < h + s; y += step) {
      for (float x = ((int) (y / step) % 2 == 0 ? step / 2 : step); x < w + s; x += step) {
        c.drawRect(x - s, y - s, x + s, y + s, sp);
        c.save();
        c.rotate(45, x, y);
        c.drawRect(x - s, y - s, x + s, y + s, sp);
        c.restore();
      }
    }

    // Timer line around the edge, starting top centre, clockwise.
    float sw = 3.5f * d;
    float in = sw / 2 + 1.5f * d;
    float L = in, T = in, R = w - in, B = h - in;
    float rr = r - in;
    Path edge = new Path();
    edge.moveTo(w / 2f, T);
    edge.lineTo(R - rr, T);
    edge.arcTo(new RectF(R - 2 * rr, T, R, T + 2 * rr), -90, 90);
    edge.lineTo(R, B - rr);
    edge.arcTo(new RectF(R - 2 * rr, B - 2 * rr, R, B), 0, 90);
    edge.lineTo(L + rr, B);
    edge.arcTo(new RectF(L, B - 2 * rr, L + 2 * rr, B), 90, 90);
    edge.lineTo(L, T + rr);
    edge.arcTo(new RectF(L, T, L + 2 * rr, T + 2 * rr), 180, 90);
    edge.lineTo(w / 2f, T);
    Paint lp = new Paint(Paint.ANTI_ALIAS_FLAG);
    lp.setStyle(Paint.Style.STROKE);
    lp.setStrokeWidth(sw);
    lp.setStrokeCap(Paint.Cap.ROUND);
    lp.setColor((line & 0x00FFFFFF) | 0x26000000);
    c.drawPath(edge, lp);
    if (progress > 0.002f) {
      PathMeasure pm = new PathMeasure(edge, false);
      Path seg = new Path();
      pm.getSegment(0, pm.getLength() * progress, seg, true);
      lp.setColor(line);
      c.drawPath(seg, lp);
    }

    // Tick circle for the current prayer, top right.
    if (tick) {
      float cx = w - 22 * d;
      float cy = 22 * d;
      float cr = 9 * d;
      Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
      if (done) {
        tp.setColor(accent);
        c.drawCircle(cx, cy, cr, tp);
        tp.setColor(Color.WHITE);
        tp.setStyle(Paint.Style.STROKE);
        tp.setStrokeWidth(2 * d);
        tp.setStrokeCap(Paint.Cap.ROUND);
        Path ck = new Path();
        ck.moveTo(cx - 4 * d, cy);
        ck.lineTo(cx - 1 * d, cy + 3 * d);
        ck.lineTo(cx + 4.5f * d, cy - 3.5f * d);
        c.drawPath(ck, tp);
      } else {
        tp.setStyle(Paint.Style.STROKE);
        tp.setStrokeWidth(1.5f * d);
        tp.setColor((accent & 0x00FFFFFF) | 0x80000000);
        c.drawCircle(cx, cy, cr, tp);
      }
    }
    return bmp;
  }

  private static void schedule(Context context, long at) {
    AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;
    Intent i = new Intent(context, DeenWidgetProvider.class).setAction(ACTION_REFRESH);
    PendingIntent pi = PendingIntent.getBroadcast(context, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    try {
      boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
      if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC, at, pi);
      else am.setAndAllowWhileIdle(AlarmManager.RTC, at, pi);
    } catch (Exception e) {
      am.set(AlarmManager.RTC, at, pi);
    }
  }

  // At most 2 Deen notifications in the list; the newest stay.
  private static void trimNotifications(Context context) {
    if (Build.VERSION.SDK_INT < 23) return;
    try {
      NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      StatusBarNotification[] list = nm.getActiveNotifications();
      if (list == null || list.length <= 2) return;
      StatusBarNotification[] sorted = Arrays.copyOf(list, list.length);
      Arrays.sort(sorted, new Comparator<StatusBarNotification>() {
        public int compare(StatusBarNotification a, StatusBarNotification b) {
          return Long.compare(b.getPostTime(), a.getPostTime());
        }
      });
      for (int i = 2; i < sorted.length; i++) {
        if (sorted[i].isOngoing()) continue;
        nm.cancel(sorted[i].getTag(), sorted[i].getId());
      }
    } catch (Exception e) {
      // not critical
    }
  }
}
