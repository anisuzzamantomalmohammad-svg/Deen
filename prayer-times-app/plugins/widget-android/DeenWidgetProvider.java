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
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PathMeasure;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.os.Build;
import android.os.Bundle;
import android.net.Uri;
import android.os.SystemClock;
import android.service.notification.StatusBarNotification;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import com.facebook.react.HeadlessJsTaskService;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;

// Deen countdown widget: a card in the app's colours with a faded star
// pattern and a soft glow, a live countdown to the next prayer, and a line
// around the edge that fills as the time passes. Red in prohibited times,
// amber in the last 10 minutes. Data comes from widget.json, written by the
// app. The circle top right is the current prayer: tap it during its time to
// tick it (saved to widget-ticks.json and handed to the app); once its time
// is over it opens the app on that prayer's "Did you pray it?" page.
public class DeenWidgetProvider extends AppWidgetProvider {
  public static final String ACTION_REFRESH = "com.tomal.prayertimes.widget.REFRESH";
  public static final String ACTION_TICK = "com.tomal.prayertimes.widget.TICK";
  // Circle states: 0 time is on (tap ticks), 1 on time, 2 late, 3 time over and not answered.
  private static final int TICK_OPEN = 0, TICK_DONE = 1, TICK_LATE = 2, TICK_ASK = 3;
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
    if (ACTION_TICK.equals(a)) {
      handleTick(context, intent);
      renderAll(context);
    } else if (ACTION_REFRESH.equals(a) || Intent.ACTION_TIME_CHANGED.equals(a) || Intent.ACTION_TIMEZONE_CHANGED.equals(a)) {
      renderAll(context);
    }
  }

  // A tap on the circle while the prayer's time is on: save the tick, show it
  // straight away, and let the app apply it (same rak'ah rule as the green
  // circle, and that prayer's alerts are cancelled). If Android doesn't let
  // the app run now, it applies the tick the next time it opens.
  private static void handleTick(Context c, Intent it) {
    try {
      String day = it.getStringExtra("day");
      String name = it.getStringExtra("name");
      int pid = it.getIntExtra("id", 0);
      long end = it.getLongExtra("end", 0);
      long now = System.currentTimeMillis();
      if (day == null || name == null || pid <= 0 || (end > 0 && now >= end)) return;
      File tf = new File(c.getFilesDir(), "widget-ticks.json");
      JSONArray arr = new JSONArray();
      String old = readText(tf);
      if (old != null && old.trim().length() > 0) arr = new JSONArray(old);
      JSONObject o = new JSONObject();
      o.put("day", day);
      o.put("id", pid);
      o.put("name", name);
      o.put("at", now);
      arr.put(o);
      writeText(tf, arr.toString());
      JSONObject data = readData(c);
      if (data != null) {
        JSONArray slots = data.optJSONArray("slots");
        for (int i = 0; slots != null && i < slots.length(); i++) {
          JSONObject sl = slots.getJSONObject(i);
          if (day.equals(sl.optString("curDay")) && sl.optInt("curId") == pid) sl.put("done", true);
        }
        JSONArray days = data.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
          JSONObject dd = days.getJSONObject(i);
          if (!day.equals(dd.optString("key"))) continue;
          JSONArray ps = dd.optJSONArray("prayers");
          for (int j = 0; ps != null && j < ps.length(); j++) {
            if (ps.getJSONObject(j).optInt("id") == pid) ps.getJSONObject(j).put("done", true);
          }
        }
        writeText(new File(c.getFilesDir(), "widget.json"), data.toString());
      }
      try {
        HeadlessJsTaskService.acquireWakeLockNow(c);
        c.startService(new Intent(c, DeenTickService.class));
      } catch (Exception e) {
        // background start not allowed: the app picks the tick up on open
      }
    } catch (Exception e) {
      // nothing saved
    }
  }

  private static String readText(File f) {
    try {
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
      return new String(buf, 0, read, StandardCharsets.UTF_8);
    } catch (Exception e) {
      return null;
    }
  }

  private static void writeText(File f, String text) throws Exception {
    FileOutputStream out = new FileOutputStream(f, false);
    out.write(text.getBytes(StandardCharsets.UTF_8));
    out.close();
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
    int placed = ids.length;
    long w2 = DeenWidgets.renderAll(context, m, data, now);
    if (w2 > 0) {
      placed++;
      if (w2 < nextWake) nextWake = w2;
    }
    if (data != null && data.optBoolean("maxTwo", true)) trimNotifications(context);
    if (placed > 0) schedule(context, nextWake);
  }

  private static JSONObject readData(Context context) {
    try {
      String txt = readText(new File(context.getFilesDir(), "widget.json"));
      return txt == null ? null : new JSONObject(txt);
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
    int idTick = res(context, "w_tick");

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
    int ok = color(colors, "ok", "#2E8A5E");
    // Frosted dark glass like the other widgets (night mode's dim palette at night).
    boolean glassy = data != null && data.optJSONObject("glass") != null;
    if (glassy) {
      int[] k = DeenWidgets.colorsAt(data, now);
      bg = k[0]; ink = k[1]; accent = k[2]; glow = k[2]; ok = k[3]; amber = k[4]; red = k[5];
    }

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
      v.setTextColor(idTitle, ink);
      v.setViewVisibility(idTimer, View.GONE);
      v.setViewVisibility(idLine, View.GONE);
      v.setViewVisibility(idSpecial, View.GONE);
      v.setViewVisibility(idIftarRow, View.GONE);
      v.setImageViewBitmap(idBg, drawCard(wPx, hPx, scale, bg, accent, glow, accent, 0f, -1, ok, amber, glassy, ink));
      if (launch != null) v.setOnClickPendingIntent(idTick, PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
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

    // The current prayer's circle.
    String curName = slot.optString("curName", "");
    String curDay = slot.optString("curDay", "");
    int curId = slot.optInt("curId", 0);
    long curEnd = slot.optLong("curEnd", 0);
    int tickState = -1;
    if (curId > 0) {
      if (slot.optBoolean("done")) tickState = slot.optBoolean("late") ? TICK_LATE : TICK_DONE;
      else if (curEnd > 0 && now >= curEnd) tickState = TICK_ASK;
      else {
        tickState = TICK_OPEN;
        if (curEnd > now) wake = Math.min(wake, curEnd);
      }
      if (tickState == TICK_OPEN) {
        Intent ti = new Intent(context, DeenWidgetProvider.class).setAction(ACTION_TICK)
            .putExtra("day", curDay).putExtra("id", curId).putExtra("name", curName).putExtra("end", curEnd);
        v.setOnClickPendingIntent(idTick, PendingIntent.getBroadcast(context, 1000 + id, ti, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
      } else if (launch != null) {
        Intent open = new Intent(launch);
        open.setAction(Intent.ACTION_VIEW);
        open.setData(Uri.parse("deen-app://prayer?name=" + Uri.encode(curName) + "&day=" + Uri.encode(curDay)));
        open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        v.setOnClickPendingIntent(idTick, PendingIntent.getActivity(context, 2000 + id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
      }
    }

    v.setImageViewBitmap(idBg, drawCard(wPx, hPx, scale, bg, lineColor, glow, accent, progress, tickState, ok, amber, glassy, ink));
    m.updateAppWidget(id, v);
    return wake;
  }

  private static int res(Context c, String name) {
    return c.getResources().getIdentifier(name, "id", c.getPackageName());
  }

  // The card: ivory, faded stars, a soft gold glow, the timer line and the tick.
  static Bitmap drawCard(int w, int h, float d, int bg, int line, int glow, int accent, float progress, int tickState, int ok, int amber, boolean glassy, int ink) {
    Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
    Canvas c = new Canvas(bmp);
    float r = 22 * d;
    RectF box = new RectF(0, 0, w, h);
    Path clip = new Path();
    clip.addRoundRect(box, r, r, Path.Direction.CW);
    c.clipPath(clip);

    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    if (glassy) {
      DeenWidgets.glass(c, w, h, d, bg, ink);
    } else {
      p.setColor(bg);
      c.drawRect(box, p);
    }

    p.setShader(new RadialGradient(w / 2f, h * 0.38f, Math.max(w, h) * 0.75f, (glow & 0x00FFFFFF) | (glassy ? 0x1C000000 : 0x40000000), glow & 0x00FFFFFF, Shader.TileMode.CLAMP));
    c.drawRect(box, p);
    p.setShader(null);

    // Faded 8-point stars.
    Paint sp = new Paint(Paint.ANTI_ALIAS_FLAG);
    sp.setStyle(Paint.Style.STROKE);
    sp.setStrokeWidth(1 * d);
    sp.setColor((accent & 0x00FFFFFF) | (glassy ? 0x0A000000 : 0x1F000000));
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

    // Circle for the current prayer, top right: full outline while its time
    // is on, green once ticked on time, gold if late, amber dashed when its
    // time is over and it isn't answered yet.
    if (tickState >= 0) {
      float cx = w - 22 * d;
      float cy = 22 * d;
      float cr = 9 * d;
      Paint tp = new Paint(Paint.ANTI_ALIAS_FLAG);
      if (tickState == TICK_DONE || tickState == TICK_LATE) {
        tp.setColor(tickState == TICK_LATE ? amber : ok);
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
      } else if (tickState == TICK_ASK) {
        tp.setStyle(Paint.Style.STROKE);
        tp.setStrokeWidth(1.6f * d);
        tp.setColor(amber);
        tp.setPathEffect(new DashPathEffect(new float[] { 3 * d, 2.5f * d }, 0));
        c.drawCircle(cx, cy, cr, tp);
      } else {
        tp.setStyle(Paint.Style.STROKE);
        tp.setStrokeWidth(1.6f * d);
        tp.setColor(accent);
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

  // One Deen notification at a time: the newest stays.
  private static void trimNotifications(Context context) {
    if (Build.VERSION.SDK_INT < 23) return;
    try {
      NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      StatusBarNotification[] list = nm.getActiveNotifications();
      if (list == null || list.length <= 1) return;
      StatusBarNotification[] sorted = Arrays.copyOf(list, list.length);
      Arrays.sort(sorted, new Comparator<StatusBarNotification>() {
        public int compare(StatusBarNotification a, StatusBarNotification b) {
          return Long.compare(b.getPostTime(), a.getPostTime());
        }
      });
      for (int i = 1; i < sorted.length; i++) {
        if (sorted[i].isOngoing()) continue;
        nm.cancel(sorted[i].getTag(), sorted[i].getId());
      }
    } catch (Exception e) {
      // not critical
    }
  }
}
