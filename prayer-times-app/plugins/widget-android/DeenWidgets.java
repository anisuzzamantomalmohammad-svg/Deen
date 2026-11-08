package com.tomal.prayertimes.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

// The three newer widgets, all on frosted dark glass in the app's dark
// palette (or that night's dim palette in night mode):
//  - Glass (4x1): all five prayers, the next one in a gold pill.
//  - Dots (2x2): now or next, a big circle to tick, the day as five stops.
//  - Seheri & Iftar (2x2): an arc from Seheri to Iftar with the sun.
// Everything is drawn into one bitmap and redrawn each minute; the last
// 15 minutes of a fast countdown use a live Chronometer.
public class DeenWidgets {
  static final int GLASS = 1, DOTS = 2, FAST = 3;
  private static final long MIN = 60 * 1000L;

  // Draws every placed widget of the three kinds. Returns the next redraw
  // time, or 0 if none are placed.
  static long renderAll(Context c, AppWidgetManager m, JSONObject data, long now) {
    long wake = 0;
    int[][] all = {
      m.getAppWidgetIds(new ComponentName(c, DeenGlassWidget.class)),
      m.getAppWidgetIds(new ComponentName(c, DeenDotsWidget.class)),
      m.getAppWidgetIds(new ComponentName(c, DeenFastWidget.class)),
    };
    for (int k = 0; k < 3; k++) {
      for (int id : all[k]) {
        try {
          render(c, m, id, k + 1, data, now);
          wake = now - (now % MIN) + MIN + 500;
        } catch (Exception e) {
          // keep the others going
        }
      }
    }
    return wake;
  }

  // ---------- data helpers ----------

  static class Pr {
    String n, name, ar, t, day;
    int id;
    long at, end;
    boolean done, late;
    int dayIndex, index;
  }

  static Pr[] prayersOf(JSONObject data, int di) throws Exception {
    JSONArray days = data.getJSONArray("days");
    JSONObject d = days.getJSONObject(di);
    JSONArray ps = d.getJSONArray("prayers");
    Pr[] out = new Pr[ps.length()];
    for (int i = 0; i < ps.length(); i++) {
      JSONObject o = ps.getJSONObject(i);
      Pr p = new Pr();
      p.n = o.optString("n");
      p.name = o.optString("name", p.n);
      p.ar = o.optString("ar");
      p.t = o.optString("t");
      p.id = o.optInt("id");
      p.at = o.optLong("at");
      p.end = o.optLong("end");
      p.done = o.optBoolean("done");
      p.late = o.optBoolean("late");
      p.day = d.optString("key");
      p.dayIndex = di;
      p.index = i;
      out[i] = p;
    }
    return out;
  }

  // The day whose prayers are showing: the day of the latest prayer that has started.
  static int rowDay(JSONObject data, long now) throws Exception {
    JSONArray days = data.getJSONArray("days");
    int best = 0;
    for (int i = 0; i < days.length(); i++) {
      JSONArray ps = days.getJSONObject(i).getJSONArray("prayers");
      if (ps.length() > 0 && ps.getJSONObject(0).optLong("at") <= now) best = i;
    }
    return best;
  }

  static Pr nextAfter(JSONObject data, long now) throws Exception {
    JSONArray days = data.getJSONArray("days");
    for (int i = 0; i < days.length(); i++) {
      Pr[] ps = prayersOf(data, i);
      for (Pr p : ps) if (p.at > now) return p;
    }
    return null;
  }

  static Pr currentAt(JSONObject data, long now) throws Exception {
    JSONArray days = data.getJSONArray("days");
    Pr cur = null;
    for (int i = 0; i < days.length(); i++) {
      Pr[] ps = prayersOf(data, i);
      for (Pr p : ps) if (p.at <= now) cur = p;
    }
    return cur;
  }

  static String txt(JSONObject data, String k, String fb) {
    JSONObject t = data.optJSONObject("text");
    return t != null ? t.optString(k, fb) : fb;
  }

  static String digits(JSONObject data, String s) {
    if (!data.optBoolean("bn")) return s;
    StringBuilder b = new StringBuilder();
    for (char ch : s.toCharArray()) b.append(ch >= '0' && ch <= '9' ? (char) ('০' + (ch - '0')) : ch);
    return b.toString();
  }

  static String left(JSONObject data, long ms) {
    long mins = Math.max(0, (ms + MIN - 1) / MIN);
    long h = mins / 60, mm = mins % 60;
    String s = h > 0
        ? txt(data, "hm", "{h}h {m}m").replace("{h}", String.valueOf(h)).replace("{m}", String.valueOf(mm))
        : txt(data, "mOnly", "{m} min").replace("{m}", String.valueOf(mm));
    return digits(data, s);
  }

  static int col(JSONObject o, String k, String fb) {
    try {
      return Color.parseColor(o != null ? o.optString(k, fb) : fb);
    } catch (Exception e) {
      return Color.parseColor(fb);
    }
  }

  static int alpha(int c, int a) {
    return (c & 0x00FFFFFF) | (a << 24);
  }

  // Glass colours now: that night's dim palette in night mode, else the app's.
  static int[] colorsAt(JSONObject data, long now) {
    JSONObject g = data.optJSONObject("glass");
    JSONArray ns = data.optJSONArray("nights");
    for (int i = 0; ns != null && i < ns.length(); i++) {
      JSONObject n = ns.optJSONObject(i);
      if (n != null && now >= n.optLong("from") && now < n.optLong("to")) { g = n; break; }
    }
    return new int[] {
      col(g, "fill", "#151618"), col(g, "ink", "#ECE7DD"), col(g, "accent", "#C9A86A"),
      col(g, "ok", "#4BBF8A"), col(g, "amber", "#E0A43A"), col(g, "red", "#F2766F"),
    };
  }

  // ---------- drawing helpers ----------

  static void glass(Canvas c, int w, int h, float d, int fill, int ink) {
    float r = 20 * d;
    RectF box = new RectF(0.5f * d, 0.5f * d, w - 0.5f * d, h - 0.5f * d);
    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setColor(alpha(fill, 0xE8));
    c.drawRoundRect(box, r, r, p);
    p.setShader(new LinearGradient(0, 0, 0, h, alpha(Color.WHITE, 0x14), alpha(Color.WHITE, 0x00), Shader.TileMode.CLAMP));
    c.drawRoundRect(box, r, r, p);
    p.setShader(null);
    p.setStyle(Paint.Style.STROKE);
    p.setStrokeWidth(1 * d);
    p.setColor(alpha(ink, 0x2A));
    c.drawRoundRect(box, r, r, p);
  }

  static Paint text(float size, int color, boolean bold, boolean serif, float d) {
    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setTextSize(size * d);
    p.setColor(color);
    p.setTypeface(Typeface.create(serif ? Typeface.SERIF : Typeface.SANS_SERIF, bold ? Typeface.BOLD : Typeface.NORMAL));
    return p;
  }

  // Shrinks the text until it fits the width.
  static void fit(Paint p, String s, float maxW) {
    float sz = p.getTextSize();
    while (sz > 6 && p.measureText(s) > maxW) {
      sz -= 0.5f;
      p.setTextSize(sz);
    }
  }

  static void drawCentered(Canvas c, String s, float cx, float baseline, Paint p, float maxW) {
    fit(p, s, maxW);
    c.drawText(s, cx - p.measureText(s) / 2f, baseline, p);
  }

  static void check(Canvas c, float cx, float cy, float r, int fill, int mark, float d) {
    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setColor(fill);
    c.drawCircle(cx, cy, r, p);
    p.setColor(mark);
    p.setStyle(Paint.Style.STROKE);
    p.setStrokeWidth(Math.max(1.2f * d, r * 0.22f));
    p.setStrokeCap(Paint.Cap.ROUND);
    Path ck = new Path();
    ck.moveTo(cx - r * 0.45f, cy);
    ck.lineTo(cx - r * 0.1f, cy + r * 0.35f);
    ck.lineTo(cx + r * 0.5f, cy - r * 0.38f);
    c.drawPath(ck, p);
  }

  static void ring(Canvas c, float cx, float cy, float r, int color, boolean dashed, float d) {
    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
    p.setStyle(Paint.Style.STROKE);
    p.setStrokeWidth(1.5f * d);
    p.setColor(color);
    if (dashed) p.setPathEffect(new DashPathEffect(new float[] { 2.5f * d, 2f * d }, 0));
    c.drawCircle(cx, cy, r, p);
  }

  // State of one prayer: 0 future, 1 time on, 2 ended and unanswered, 3 done on time, 4 done late.
  static int state(Pr p, long now) {
    if (p.done) return p.late ? 4 : 3;
    if (p.at > now) return 0;
    if (p.end > 0 && now >= p.end) return 2;
    return 1;
  }

  // What a tap on a prayer does: tick while its time is on, ask once it's over, else open the app.
  static PendingIntent action(Context c, Pr p, long now, int code) {
    int st = state(p, now);
    if (st == 1) {
      Intent ti = new Intent(c, DeenWidgetProvider.class).setAction(DeenWidgetProvider.ACTION_TICK)
          .putExtra("day", p.day).putExtra("id", p.id).putExtra("name", p.n).putExtra("end", p.end);
      return PendingIntent.getBroadcast(c, code, ti, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    Intent launch = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    if (launch == null) return null;
    if (st == 2) {
      Intent open = new Intent(launch);
      open.setAction(Intent.ACTION_VIEW);
      open.setData(Uri.parse("deen-app://prayer?name=" + Uri.encode(p.n) + "&day=" + Uri.encode(p.day)));
      open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      return PendingIntent.getActivity(c, code, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    return PendingIntent.getActivity(c, code, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  }

  static int res(Context c, String name, String type) {
    return c.getResources().getIdentifier(name, type, c.getPackageName());
  }

  // ---------- render ----------

  static void render(Context ctx, AppWidgetManager m, int id, int kind, JSONObject data, long now) throws Exception {
    String layout = kind == GLASS ? "deen_widget_glass" : kind == DOTS ? "deen_widget_dots" : "deen_widget_fast";
    RemoteViews v = new RemoteViews(ctx.getPackageName(), res(ctx, layout, "layout"));
    Bundle o = m.getAppWidgetOptions(id);
    float dens = ctx.getResources().getDisplayMetrics().density;
    int minW = kind == GLASS ? 250 : 110;
    int minH = kind == GLASS ? 56 : 110;
    int wDp = Math.max(minW, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, kind == GLASS ? 300 : 160));
    int hDp = Math.max(minH, o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, kind == GLASS ? 80 : 160));
    float d = (float) Math.min(dens, Math.sqrt(600000.0 / (4.0 * wDp * hDp)));
    int w = Math.round(wDp * d);
    int h = Math.round(hDp * d);
    Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
    Canvas c = new Canvas(bmp);

    Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
    if (launch != null) {
      v.setOnClickPendingIntent(res(ctx, "x_root", "id"), PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
    int[] k = colorsAt(data == null ? new JSONObject() : data, now);
    glass(c, w, h, d, k[0], k[1]);

    if (data == null || data.optJSONArray("days") == null) {
      Paint p = text(13, k[1], true, true, d);
      drawCentered(c, data == null ? "Open Deen" : txt(data, "open", "Open Deen"), w / 2f, h / 2f + 5 * d, p, w - 20 * d);
      v.setImageViewBitmap(res(ctx, "x_bg", "id"), bmp);
      if (kind == FAST) v.setViewVisibility(res(ctx, "x_timer", "id"), View.GONE);
      m.updateAppWidget(id, v);
      return;
    }
    if (kind == GLASS) drawGlass(ctx, v, c, w, h, d, k, data, now, id);
    else if (kind == DOTS) drawDots(ctx, v, c, w, h, d, k, data, now, id);
    else drawFast(ctx, v, c, w, h, d, k, data, now);
    v.setImageViewBitmap(res(ctx, "x_bg", "id"), bmp);
    m.updateAppWidget(id, v);
  }

  // Glass 4x1: top line "ASR IN 2H 38M" and "2 of 5 prayed", then the five prayers.
  static void drawGlass(Context ctx, RemoteViews v, Canvas c, int w, int h, float d, int[] k, JSONObject data, long now, int id) throws Exception {
    int fill = k[0], ink = k[1], accent = k[2], ok = k[3], amber = k[4];
    int di = rowDay(data, now);
    Pr[] row = prayersOf(data, di);
    Pr next = nextAfter(data, now);
    int prayed = 0;
    for (Pr p : row) if (p.done) prayed++;
    int hi = -1;
    for (int i = 0; i < row.length; i++) if (next != null && row[i].id == next.id && row[i].day.equals(next.day)) hi = i;
    if (hi < 0) for (int i = 0; i < row.length; i++) if (row[i].at <= now) hi = i;

    float pad = 12 * d;
    boolean tall = h > 110 * d;
    float topY = (tall ? 22 : 17) * d;
    if (next != null) {
      String head = (txt(data, "inFmt", "{name} in").replace("{name}", next.name) + " " + left(data, next.at - now)).toUpperCase();
      Paint tp = text(tall ? 11.5f : 10, accent, true, false, d);
      tp.setLetterSpacing(0.08f);
      fit(tp, head, w * 0.58f);
      c.drawText(head, pad + 2 * d, topY, tp);
    }
    String count = prayed == 5 ? txt(data, "all5", "All 5 prayed") : txt(data, "prayed", "{n} of 5 prayed").replace("{n}", String.valueOf(prayed));
    count = digits(data, count);
    Paint cp = text(tall ? 11 : 9.5f, alpha(ink, 0x99), false, false, d);
    fit(cp, count, w * 0.36f);
    c.drawText(count, w - pad - 2 * d - cp.measureText(count), topY, cp);

    float rowTop = topY + (tall ? 12 : 6) * d;
    float barH = 2 * d;
    float rowBottom = h - (tall ? 14 : 9) * d - barH;
    float cw = (w - 2 * pad) / 5f;
    float rh = rowBottom - rowTop;
    for (int i = 0; i < row.length; i++) {
      Pr p = row[i];
      float x0 = pad + i * cw;
      float cx = x0 + cw / 2f;
      boolean isHi = i == hi;
      int st = state(p, now);
      if (isHi) {
        Paint pill = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF pr = new RectF(x0 + 2 * d, rowTop, x0 + cw - 2 * d, rowBottom);
        pill.setColor(alpha(accent, 0x30));
        c.drawRoundRect(pr, 14 * d, 14 * d, pill);
        pill.setStyle(Paint.Style.STROKE);
        pill.setStrokeWidth(1 * d);
        pill.setColor(alpha(accent, 0x99));
        c.drawRoundRect(pr, 14 * d, 14 * d, pill);
      }
      int main = isHi ? accent : st == 0 ? alpha(ink, 0xD9) : ink;
      float unit = rh / 4.2f;
      Paint ap = text(Math.min(12, unit / d * 0.95f), isHi ? accent : alpha(ink, 0x80), false, true, d);
      drawCentered(c, p.ar, cx, rowTop + unit * 1.15f, ap, cw - 8 * d);
      Paint np = text(Math.min(13.5f, unit / d * 1.05f), main, true, false, d);
      drawCentered(c, p.name, cx, rowTop + unit * 2.3f, np, cw - 8 * d);
      Paint tp = text(Math.min(12.5f, unit / d), isHi ? accent : alpha(ink, 0xB3), false, true, d);
      String ts = p.t;
      fit(tp, ts, cw - 22 * d);
      float tw = tp.measureText(ts);
      float ty = rowTop + unit * 3.45f;
      c.drawText(ts, cx - tw / 2f - (st == 0 ? 0 : 5 * d), ty, tp);
      float mx = cx + tw / 2f + 2 * d, my = ty - tp.getTextSize() * 0.35f, mr = 4.5f * d;
      if (st == 3) check(c, mx, my, mr, ok, fill, d);
      else if (st == 4) check(c, mx, my, mr, amber, fill, d);
      else if (st == 2) ring(c, mx, my, mr, amber, true, d);
      else if (st == 1) ring(c, mx, my, mr, accent, false, d);
      PendingIntent pi = action(ctx, p, now, 1000000 + id * 8 + i);
      if (pi != null) v.setOnClickPendingIntent(res(ctx, "x_z" + (i + 1), "id"), pi);
    }
    // Thin gold bar: how far through the time to the next prayer.
    Pr cur = currentAt(data, now);
    float frac = 0;
    if (cur != null && next != null) frac = Math.max(0, Math.min(1, (now - cur.at) / (float) Math.max(1, next.at - cur.at)));
    Paint bp = new Paint(Paint.ANTI_ALIAS_FLAG);
    bp.setStrokeCap(Paint.Cap.ROUND);
    bp.setStrokeWidth(barH);
    float by = h - (tall ? 10 : 6) * d;
    bp.setColor(alpha(ink, 0x1F));
    c.drawLine(pad + 4 * d, by, w - pad - 4 * d, by, bp);
    if (frac > 0.005f) {
      bp.setColor(accent);
      c.drawLine(pad + 4 * d, by, pad + 4 * d + (w - 2 * pad - 8 * d) * frac, by, bp);
    }
  }

  // Dots 2x2: NOW / NEXT / ENDED, the name, the time left, a big circle, and five stops.
  static void drawDots(Context ctx, RemoteViews v, Canvas c, int w, int h, float d, int[] k, JSONObject data, long now, int id) throws Exception {
    int fill = k[0], ink = k[1], accent = k[2], ok = k[3], amber = k[4];
    int di = rowDay(data, now);
    Pr[] row = prayersOf(data, di);
    Pr cur = currentAt(data, now);
    Pr next = nextAfter(data, now);
    JSONObject day = data.getJSONArray("days").getJSONObject(di);
    int curSt = cur == null ? 0 : state(cur, now);
    int prayed = 0;
    for (Pr p : row) if (p.done) prayed++;

    String label, name, sub, ar;
    int labelColor = accent;
    Pr focus;
    if (cur != null && curSt == 1) {
      focus = cur;
      label = txt(data, "now", "Now");
      sub = left(data, cur.end - now);
    } else if (cur != null && curSt == 2) {
      focus = cur;
      label = txt(data, "ended", "Ended");
      labelColor = amber;
      sub = "?";
    } else {
      focus = next;
      label = txt(data, "next", "Next");
      sub = next != null ? left(data, next.at - now) : "";
    }
    name = focus != null ? focus.name : "";
    ar = focus != null ? focus.ar : "";
    // Ramadan: the fast's Iftar or Seheri takes the card once the prayer is answered.
    String fast = day.optString("fast");
    if ("ramadan".equals(fast) && curSt != 1 && curSt != 2) {
      long iftar = day.optLong("iftar"), seheri = day.optLong("seheri"), nextSeheri = day.optLong("nextSeheri");
      if (now >= seheri && now < iftar) {
        label = txt(data, "iftarW", "Iftar");
        name = txt(data, "iftarW", "Iftar");
        ar = "الإفطار";
        sub = left(data, iftar - now);
      } else if (now >= iftar && cur != null && "Isha".equals(cur.n) && cur.done) {
        label = txt(data, "seheri", "Seheri");
        name = txt(data, "seheri", "Seheri");
        ar = "السحور";
        sub = left(data, nextSeheri - now);
      }
    }

    float pad = 14 * d;
    float s = Math.min(w, h) / (150f * d);
    // Label top left, Arabic name top right with a soft glow.
    Paint lp = text(10 * s, labelColor, true, false, d);
    lp.setLetterSpacing(0.12f);
    String L = label.toUpperCase();
    fit(lp, L, w * 0.45f);
    c.drawText(L, pad, pad + 10 * d * s, lp);
    Paint arp = text(17 * s, accent, false, true, d);
    arp.setShadowLayer(7 * d, 0, 0, alpha(accent, 0xAA));
    fit(arp, ar, w * 0.45f);
    c.drawText(ar, w - pad - arp.measureText(ar), pad + 14 * d * s, arp);

    // Name and time left, left side.
    float circleR = 21 * d * s;
    float ccx = w - pad - circleR - 2 * d;
    float ccy = h * 0.5f;
    float textW = ccx - circleR - pad - 6 * d;
    Paint np = text(21 * s, ink, false, true, d);
    fit(np, name, textW);
    c.drawText(name, pad, h * 0.47f, np);
    Paint sp = text(13 * s, "?".equals(sub) ? amber : alpha(ink, 0xB3), true, false, d);
    String subTxt = "?".equals(sub) ? txt(data, "ask", "Did you pray it?") : sub;
    fit(sp, subTxt, textW);
    c.drawText(subTxt, pad, h * 0.47f + 18 * d * s, sp);

    // The big circle.
    Paint cp = new Paint(Paint.ANTI_ALIAS_FLAG);
    int tapZone = res(ctx, "x_tap", "id");
    if (prayed == 5) {
      check(c, ccx, ccy, circleR, ok, fill, d);
      Paint ap = text(7.5f * s, ok, true, false, d);
      ap.setLetterSpacing(0.1f);
      drawCentered(c, txt(data, "all5", "All 5 prayed").toUpperCase(), ccx, ccy + circleR + 11 * d * s, ap, circleR * 3);
    } else if (cur != null && curSt == 1) {
      cp.setColor(accent);
      cp.setShadowLayer(8 * d, 0, 0, alpha(accent, 0x88));
      c.drawCircle(ccx, ccy, circleR, cp);
      Paint tp = text(10 * s, fill, true, false, d);
      tp.setLetterSpacing(0.12f);
      drawCentered(c, txt(data, "tap", "Tap").toUpperCase(), ccx, ccy + 4 * d * s, tp, circleR * 1.7f);
    } else if (cur != null && curSt == 2) {
      ring(c, ccx, ccy, circleR, amber, true, d);
      Paint qp = text(20 * s, amber, true, true, d);
      drawCentered(c, "?", ccx, ccy + 7 * d * s, qp, circleR * 1.6f);
    } else if (cur != null && cur.done) {
      check(c, ccx, ccy, circleR, cur.late ? amber : ok, fill, d);
    } else {
      ring(c, ccx, ccy, circleR, alpha(ink, 0x55), false, d);
    }
    PendingIntent tapPi = cur != null ? action(ctx, cur, now, 2000000 + id * 8 + 7) : null;
    if (tapPi != null) v.setOnClickPendingIntent(tapZone, tapPi);

    // The day as a line with five stops.
    float ly = h - pad - 4 * d;
    float x0 = pad + 6 * d, x1 = w - pad - 6 * d;
    Paint line = new Paint(Paint.ANTI_ALIAS_FLAG);
    line.setStrokeWidth(1.5f * d);
    line.setColor(alpha(ink, 0x26));
    c.drawLine(x0, ly, x1, ly, line);
    int last = -1;
    for (int i = 0; i < row.length; i++) if (row[i].at <= now) last = i;
    if (last >= 0) {
      float frac = last;
      if (last < row.length - 1) frac += Math.max(0, Math.min(1, (now - row[last].at) / (float) Math.max(1, row[last + 1].at - row[last].at)));
      line.setColor(alpha(accent, 0xCC));
      c.drawLine(x0, ly, x0 + (x1 - x0) * (frac / 4f), ly, line);
    }
    for (int i = 0; i < row.length; i++) {
      Pr p = row[i];
      float x = x0 + (x1 - x0) * (i / 4f);
      int st = state(p, now);
      float r = 4.5f * d * Math.max(0.9f, s);
      if (st == 3) check(c, x, ly, r, ok, fill, d);
      else if (st == 4) check(c, x, ly, r, amber, fill, d);
      else if (st == 2) { Paint bgp = new Paint(Paint.ANTI_ALIAS_FLAG); bgp.setColor(fill); c.drawCircle(x, ly, r, bgp); ring(c, x, ly, r, amber, true, d); }
      else if (st == 1) { Paint g = new Paint(Paint.ANTI_ALIAS_FLAG); g.setColor(accent); g.setShadowLayer(5 * d, 0, 0, alpha(accent, 0x99)); c.drawCircle(x, ly, r * 1.2f, g); }
      else { Paint g = new Paint(Paint.ANTI_ALIAS_FLAG); g.setColor(fill); c.drawCircle(x, ly, r * 0.8f, g); ring(c, x, ly, r * 0.8f, alpha(ink, 0x55), false, d); }
      PendingIntent pi = action(ctx, p, now, 2000000 + id * 8 + i);
      if (pi != null) v.setOnClickPendingIntent(res(ctx, "x_z" + (i + 1), "id"), pi);
    }
  }

  // Seheri & Iftar 2x2: arc from Seheri to Iftar with the sun, the time left,
  // and the two times at the bottom. Night: a moon and "Seheri ends in".
  static void drawFast(Context ctx, RemoteViews v, Canvas c, int w, int h, float d, int[] k, JSONObject data, long now) throws Exception {
    int fill = k[0], ink = k[1], accent = k[2], ok = k[3];
    JSONArray days = data.getJSONArray("days");
    int di = 0;
    for (int i = 0; i < days.length(); i++) if (days.getJSONObject(i).optLong("seheri") <= now) di = i;
    JSONObject day = days.getJSONObject(di);
    JSONObject tomorrow = di + 1 < days.length() ? days.getJSONObject(di + 1) : day;
    long seheri = day.optLong("seheri"), iftar = day.optLong("iftar");
    Pr[] row = prayersOf(data, di);
    long isha = row.length == 5 ? row[4].at : iftar + 90 * MIN;

    int phase; // 0 fasting day, 1 fast done (Maghrib to Isha), 2 night
    if (now < iftar) phase = 0;
    else if (now < isha) phase = 1;
    else phase = 2;
    JSONObject show = phase == 2 ? tomorrow : day;
    String fast = show.optString("fast", "none");
    boolean keeping = "ramadan".equals(fast) || "planned".equals(fast);
    if (phase == 1 && !keeping) phase = 2;
    if (phase == 2 && show == day) { show = tomorrow; fast = show.optString("fast", "none"); keeping = "ramadan".equals(fast) || "planned".equals(fast); }

    String label;
    if ("ramadan".equals(fast)) label = txt(data, "ramadanDay", "Ramadan {n}").replace("{n}", show.optString("fastN"));
    else if ("planned".equals(fast)) label = txt(data, "fastDay", "Fast day");
    else if ("sunnah".equals(fast)) label = txt(data, "sunnahDay", "Sunnah fast day");
    else label = txt(data, "notFasting", "Not fasting today");
    if (phase == 1) {
      String n = day.optString("fastN");
      label = "✓ " + (n.length() > 0 ? txt(data, "fastDone", "Fast {n} done").replace("{n}", n) : txt(data, "fastDone0", "Fast done"));
    }

    float pad = 14 * d;
    float s = Math.min(w, h) / (150f * d);
    boolean dim = !keeping && phase != 1;
    Paint lp = text(9.5f * s, phase == 1 ? ok : dim ? alpha(ink, 0x99) : accent, true, false, d);
    lp.setLetterSpacing(0.1f);
    drawCentered(c, label.toUpperCase(), w / 2f, pad + 9 * d * s, lp, w - 2 * pad);

    // The arc.
    float ax0 = pad + 8 * d, ax1 = w - pad - 8 * d;
    float ay = h * 0.45f;
    float rise = h * 0.15f;
    Path arc = new Path();
    arc.moveTo(ax0, ay);
    arc.quadTo(w / 2f, ay - rise * 2, ax1, ay);
    Paint ap = new Paint(Paint.ANTI_ALIAS_FLAG);
    ap.setStyle(Paint.Style.STROKE);
    ap.setStrokeWidth(1.5f * d);
    ap.setStrokeCap(Paint.Cap.ROUND);
    ap.setColor(alpha(ink, 0x30));
    ap.setPathEffect(new DashPathEffect(new float[] { 3 * d, 3 * d }, 0));
    c.drawPath(arc, ap);
    float frac = phase == 0 ? Math.max(0, Math.min(1, (now - seheri) / (float) Math.max(1, iftar - seheri))) : phase == 1 ? 1 : 0;
    float bx = (1 - frac) * (1 - frac) * ax0 + 2 * (1 - frac) * frac * (w / 2f) + frac * frac * ax1;
    float byy = (1 - frac) * (1 - frac) * ay + 2 * (1 - frac) * frac * (ay - rise * 2) + frac * frac * ay;
    if (phase != 2 && frac > 0.01f) {
      Paint done = new Paint(ap);
      done.setPathEffect(null);
      done.setColor(phase == 1 ? ok : dim ? alpha(ink, 0x66) : accent);
      Path part = new Path();
      int steps = 30;
      for (int i = 0; i <= steps; i++) {
        float f = frac * i / steps;
        float x = (1 - f) * (1 - f) * ax0 + 2 * (1 - f) * f * (w / 2f) + f * f * ax1;
        float y = (1 - f) * (1 - f) * ay + 2 * (1 - f) * f * (ay - rise * 2) + f * f * ay;
        if (i == 0) part.moveTo(x, y); else part.lineTo(x, y);
      }
      c.drawPath(part, done);
    }
    Paint body = new Paint(Paint.ANTI_ALIAS_FLAG);
    if (phase == 2) {
      // A crescent at the Seheri end.
      float mx = ax0 + 6 * d, my = ay - 12 * d * s, mr = 7 * d * s;
      body.setColor(alpha(ink, 0xDD));
      body.setShadowLayer(6 * d, 0, 0, alpha(ink, 0x66));
      c.drawCircle(mx, my, mr, body);
      body.clearShadowLayer();
      body.setColor(fill);
      c.drawCircle(mx + mr * 0.45f, my - mr * 0.3f, mr * 0.85f, body);
    } else {
      body.setColor(phase == 1 ? ok : accent);
      body.setShadowLayer(8 * d, 0, 0, alpha(phase == 1 ? ok : accent, 0xAA));
      c.drawCircle(bx, byy, 6.5f * d * s, body);
    }

    // The time left (or the done line) in the middle.
    long target = phase == 0 ? iftar : phase == 2 ? show.optLong("seheri") : 0;
    int timerId = res(ctx, "x_timer", "id");
    v.setViewVisibility(timerId, View.GONE);
    float midY = h * 0.6f;
    if (phase != 1 && target > now) {
      String cap = phase == 0 ? txt(data, "iftar", "Iftar in") : txt(data, "seheriEnds", "Seheri ends in");
      Paint cp = text(9 * s, alpha(ink, 0x99), true, false, d);
      cp.setLetterSpacing(0.08f);
      drawCentered(c, cap.toUpperCase(), w / 2f, midY, cp, w - 2 * pad);
      if (target - now <= 15 * MIN && !dim) {
        v.setViewVisibility(timerId, View.VISIBLE);
        v.setChronometer(timerId, SystemClock.elapsedRealtime() + (target - now), null, true);
        if (Build.VERSION.SDK_INT >= 24) v.setChronometerCountDown(timerId, true);
        v.setTextColor(timerId, accent);
      } else {
        Paint tp = text(20 * s, dim ? alpha(ink, 0xB3) : ink, true, true, d);
        drawCentered(c, left(data, target - now), w / 2f, midY + 19 * d * s, tp, w - 2 * pad);
      }
    }

    // Seheri and Iftar times at the bottom.
    Paint kp = text(8 * s, alpha(ink, 0x80), true, false, d);
    kp.setLetterSpacing(0.1f);
    Paint vp = text(14 * s, dim ? alpha(ink, 0xB3) : ink, true, true, d);
    String st = show.optString("seheriT"), it = show.optString("iftarT");
    String sk = txt(data, "seheri", "Seheri").toUpperCase(), ik = txt(data, "iftarW", "Iftar").toUpperCase();
    float yb = h - pad;
    c.drawText(st, pad, yb, vp);
    c.drawText(sk, pad, yb - 16 * d * s, kp);
    c.drawText(it, w - pad - vp.measureText(it), yb, vp);
    c.drawText(ik, w - pad - kp.measureText(ik), yb - 16 * d * s, kp);
  }
}
