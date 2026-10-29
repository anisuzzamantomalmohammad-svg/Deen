// Charity calculator: Zakat, Sadaqatul Fitr (Fitrah), Fidya and Kaffarah in
// one place. You type in today's prices, so it works offline. Rules are the
// Hanafi ones in Bahishti Zewar; the screen shows them under each tab.
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../state/store';
import { useNav } from '../nav';
import { useTheme, useT, Serif, Body, Label, Card, Segmented, SectionLabel, Press } from '../ui/kit';
import { ScreenTitle } from '../ui/parts';
import { useLayout } from '../ui/hooks';
import { HScroll } from '../ui/swipe';

export const NISAB_GOLD_G = 87.48; // 7.5 tola
export const NISAB_SILVER_G = 612.36; // 52.5 tola
export const TOLA_G = 11.664; // 1 tola = 1 bhori
export const FITRAH_KG = { wheat: 1.65, dates: 3.3, barley: 3.3 };

const parse = (s) => {
  const v = parseFloat(String(s).replace(/[০-৯]/g, (c) => '০১২৩৪৫৬৭৮৯'.indexOf(c)).replace(/[^0-9.]/g, ''));
  return Number.isFinite(v) ? v : 0;
};

export function zakatResult(c) {
  const goldG = (c.goldUnit === 'tola' ? TOLA_G : 1) * (c.gold || 0);
  const silverG = (c.silverUnit === 'tola' ? TOLA_G : 1) * (c.silver || 0);
  const goldVal = goldG * (c.goldPrice || 0);
  const silverVal = silverG * (c.silverPrice || 0);
  const others = (c.cash || 0) + (c.business || 0) + (c.owed || 0);
  const gross = goldVal + silverVal + others;
  const net = Math.max(0, gross - (c.debts || 0));
  // Only gold and nothing else: judged by the gold nisab, by weight.
  // Anything mixed: everything is added up by value and judged by silver.
  const onlyGold = goldG > 0 && silverG === 0 && others === 0;
  const nisabValue = onlyGold ? NISAB_GOLD_G * (c.goldPrice || 0) : NISAB_SILVER_G * (c.silverPrice || 0);
  const needsPrice = onlyGold ? !(c.goldPrice > 0) : !(c.silverPrice > 0);
  const over = !needsPrice && net >= nisabValue;
  return { gross, net, nisabValue, onlyGold, over, due: over ? net * 0.025 : 0, needsPrice };
}

export function fitrahPerPerson(c) {
  if (c.fitrahOwn > 0) return c.fitrahOwn;
  return (FITRAH_KG[c.fitrahItem || 'wheat'] || 1.65) * (c.fitrahPrice || 0);
}

function Money({ label, sub, value, onChange, unit, suffix }) {
  const th = useTheme();
  const [text, setText] = useState(value ? String(value) : '');
  useEffect(() => { if (parse(text) !== value) setText(value ? String(value) : ''); }, [value]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Body size={13.5} weight="med">{label}</Body>
        {sub ? <Body size={11} color={th.muted}>{sub}</Body> : null}
      </View>
      {unit ? <Body size={12.5} color={th.muted}>{unit}</Body> : null}
      <TextInput
        value={text}
        onChangeText={(s) => { setText(s); onChange(parse(s)); }}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={th.faint}
        selectTextOnFocus
        accessibilityLabel={label}
        style={{ width: 110, textAlign: 'right', color: th.ink, fontFamily: 'Fraunces_400Regular', fontSize: 17, paddingVertical: 5, borderBottomWidth: 1, borderColor: th.line }}
      />
      {suffix ? <Body size={12} color={th.muted} style={{ width: 34 }}>{suffix}</Body> : null}
    </View>
  );
}

function Divide() {
  const th = useTheme();
  return <View style={{ height: 1, backgroundColor: th.line, marginHorizontal: 14 }} />;
}

function Result({ label, value, sub, ok = true }) {
  const th = useTheme();
  return (
    <Card active={ok} style={{ marginTop: 14, padding: 16 }}>
      <Label size={8.5}>{label}</Label>
      <Serif bold size={28} style={{ marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Serif>
      {sub ? <Body size={12} color={th.muted} style={{ marginTop: 2 }}>{sub}</Body> : null}
    </Card>
  );
}

function Rules({ items, refText }) {
  const th = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      {items.map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: i ? 6 : 0 }}>
          <Feather name="check" size={13} color={th.accent} style={{ marginTop: 3 }} />
          <Body size={12.5} color={th.muted} style={{ flex: 1, lineHeight: 18 }}>{x}</Body>
        </View>
      ))}
      <Body size={11.5} weight="semi" color={th.accent} style={{ marginTop: 10 }}>{refText}</Body>
    </View>
  );
}

export default function CharityScreen({ tab: initial }) {
  const app = useApp();
  const nav = useNav();
  const th = useTheme();
  const t = useT();
  const L = useLayout();
  const c = app.data.charity || {};
  const set = (patch) => app.update((p) => ({ charity: { ...(p.charity || {}), ...patch } }));
  const [tab, setTab] = useState(initial || 'zakat');
  const cur = c.currency || 'NZD';
  const sym = cur === 'BDT' ? '৳' : '$';
  const money = (v) => {
    const s = `${sym}${(Math.round(v * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
    return t.lang === 'bn' ? s.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : s;
  };
  const z = zakatResult(c);
  const perPerson = fitrahPerPerson(c);
  const bz = t('Bahishti Zewar · Zakat, Sadaqatul Fitr, Fidya and Kaffarah chapters');

  const tabs = [['zakat', t('Zakat')], ['fitrah', t('Fitrah')], ['fidya', t('Fidya')], ['kaffarah', t('Kaffarah')]];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: L.insets.top + 12, paddingHorizontal: L.pad, paddingBottom: L.insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
      <ScreenTitle
        onBack={nav.pop}
        title={t('Charity')}
        arabic="صدقة"
        sub={t('Zakat, Fitrah, Fidya and Kaffarah')}
        right={(
          <Segmented style={{ width: 120 }} value={cur} onChange={(v) => set({ currency: v })} options={[{ id: 'NZD', label: 'NZD' }, { id: 'BDT', label: 'BDT' }]} />
        )}
      />
      <HScroll style={{ marginTop: 10, marginHorizontal: -L.pad }} contentContainerStyle={{ paddingHorizontal: L.pad, gap: 6 }}>
        {tabs.map(([id, label]) => (
          <Press key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: th.line }, tab === id && { backgroundColor: th.card, borderColor: th.card }]}>
            <Body size={13} weight="semi" color={tab === id ? th.cardInk : th.muted}>{label}</Body>
          </Press>
        ))}
      </HScroll>

      {tab === 'zakat' ? (
        <View>
          <SectionLabel>{t("Today's prices")}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <Money label={t('Gold, per gram')} sub={t('22 carat or what you own')} value={c.goldPrice} onChange={(v) => set({ goldPrice: v })} unit={sym} />
            <Divide />
            <Money label={t('Silver, per gram')} value={c.silverPrice} onChange={(v) => set({ silverPrice: v })} unit={sym} />
          </Card>

          <SectionLabel>{t('What you own')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <Money label={t('Cash and bank savings')} value={c.cash} onChange={(v) => set({ cash: v })} unit={sym} />
            <Divide />
            <Money label={t('Gold')} sub={t('Jewellery included')} value={c.gold} onChange={(v) => set({ gold: v })} suffix={c.goldUnit === 'tola' ? t('bhori') : t('g')} />
            <Press onPress={() => set({ goldUnit: c.goldUnit === 'tola' ? 'g' : 'tola' })} style={{ alignSelf: 'flex-end', marginRight: 14, marginTop: -4, marginBottom: 6 }}>
              <Body size={11} weight="semi" color={th.accent}>{c.goldUnit === 'tola' ? t('Use grams') : t('Use bhori / tola')}</Body>
            </Press>
            <Divide />
            <Money label={t('Silver')} value={c.silver} onChange={(v) => set({ silver: v })} suffix={c.silverUnit === 'tola' ? t('bhori') : t('g')} />
            <Press onPress={() => set({ silverUnit: c.silverUnit === 'tola' ? 'g' : 'tola' })} style={{ alignSelf: 'flex-end', marginRight: 14, marginTop: -4, marginBottom: 6 }}>
              <Body size={11} weight="semi" color={th.accent}>{c.silverUnit === 'tola' ? t('Use grams') : t('Use bhori / tola')}</Body>
            </Press>
            <Divide />
            <Money label={t('Business stock')} sub={t('At the price you would sell it')} value={c.business} onChange={(v) => set({ business: v })} unit={sym} />
            <Divide />
            <Money label={t('Money owed to you')} sub={t('That you expect to get back')} value={c.owed} onChange={(v) => set({ owed: v })} unit={sym} />
          </Card>

          <SectionLabel>{t('Minus')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <Money label={t('Debts you have to pay now')} value={c.debts} onChange={(v) => set({ debts: v })} unit={sym} />
          </Card>

          {z.needsPrice && (z.gross > 0 || c.gold > 0) ? (
            <Card style={{ marginTop: 14, padding: 14 }}>
              <Body size={13} color={th.amber}>{z.onlyGold ? t('Type in the gold price to work out the zakat.') : t('Type in the silver price to check against the nisab.')}</Body>
            </Card>
          ) : (
            <Result
              ok={z.over}
              label={z.over ? t('Zakat due (2.5%)') : t('Below nisab · no zakat due')}
              value={money(z.due)}
              sub={`${t('Total {a} · Nisab {b}', { a: money(z.net), b: money(z.nisabValue) })}${z.onlyGold ? ` · ${t('gold nisab')}` : ` · ${t('silver nisab')}`}`}
            />
          )}
          <Rules
            refText={bz}
            items={[
              t('Nisab is 87.48 g (7.5 tola) of gold or 612.36 g (52.5 tola) of silver.'),
              t('If you own only gold, the gold nisab is used. If you have a mix (cash, savings, silver, goods), everything is added up and the silver nisab is used.'),
              t('Zakat is due once your wealth has stayed above nisab for a full Hijri year. Pay 2.5% of the total.'),
              t('Your home, car, furniture, clothes and tools for work are not counted.'),
            ]}
          />
        </View>
      ) : null}

      {tab === 'fitrah' || tab === 'fidya' || tab === 'kaffarah' ? (
        <View>
          <SectionLabel>{t('Amount for one person')}</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            <View style={{ flexDirection: 'row', gap: 6, padding: 12 }}>
              {[['wheat', t('Wheat · 1.65 kg')], ['dates', t('Dates · 3.3 kg')], ['barley', t('Barley · 3.3 kg')]].map(([id, label]) => {
                const on = (c.fitrahItem || 'wheat') === id;
                return (
                  <Press key={id} onPress={() => set({ fitrahItem: id })} style={[{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: th.line }, on && { borderColor: th.accent, backgroundColor: th.accentSoft }]}>
                    <Body size={11.5} weight="semi" color={on ? th.accent : th.muted} numberOfLines={1} adjustsFontSizeToFit style={{ paddingHorizontal: 4 }}>{label}</Body>
                  </Press>
                );
              })}
            </View>
            <Divide />
            <Money label={t('Price per kg')} value={c.fitrahPrice} onChange={(v) => set({ fitrahPrice: v })} unit={sym} />
            <Divide />
            <Money label={t('Or the amount your masjid set')} sub={t('Leave at 0 to use the price above')} value={c.fitrahOwn} onChange={(v) => set({ fitrahOwn: v })} unit={sym} />
          </Card>

          {tab === 'fitrah' ? (
            <>
              <SectionLabel>{t('Your family')}</SectionLabel>
              <Card style={{ paddingVertical: 2 }}>
                <Money label={t('People you pay for')} sub={t('Yourself and your children who are not yet adults')} value={c.people} onChange={(v) => set({ people: Math.round(v) })} />
              </Card>
              <Result label={t('Fitrah to pay')} value={money(perPerson * (c.people || 0))} sub={t('{a} per person × {n}', { a: money(perPerson), n: t.num(c.people || 0) })} />
              <Rules
                refText={bz}
                items={[
                  t('Wajib on everyone who owns the nisab amount on the morning of Eid al-Fitr, beyond their basic needs.'),
                  t('Pay for yourself and your young children. Best paid before the Eid prayer, and it can be paid earlier in Ramadan.'),
                  t('Half a sa‘ of wheat (about 1.65 kg) or one sa‘ of dates or barley (about 3.3 kg), or its price.'),
                ]}
              />
            </>
          ) : null}

          {tab === 'fidya' ? (
            <>
              <SectionLabel>{t('Missed fasts')}</SectionLabel>
              <Card style={{ paddingVertical: 2 }}>
                <Money label={t('Number of fasts')} value={c.fasts} onChange={(v) => set({ fasts: Math.round(v) })} />
              </Card>
              <Result label={t('Fidya to pay')} value={money(perPerson * (c.fasts || 0))} sub={t('{a} per fast × {n}', { a: money(perPerson), n: t.num(c.fasts || 0) })} />
              <Rules
                refText={bz}
                items={[
                  t('Only for someone who can never fast again, because of old age or an illness that will not get better.'),
                  t('For each missed fast, give the same amount as Fitrah to a poor person.'),
                  t('If you get better later, the fasts must be made up and the fidya counts as sadaqah.'),
                ]}
              />
            </>
          ) : null}

          {tab === 'kaffarah' ? (
            <>
              <Result label={t('Kaffarah by feeding 60 people')} value={money(perPerson * 60)} sub={t('{a} per person × 60', { a: money(perPerson) })} />
              <Rules
                refText={bz}
                items={[
                  t('Due for breaking a Ramadan fast on purpose by eating, drinking or intercourse.'),
                  t('First choice: fast 60 days in a row, plus making up the broken fast.'),
                  t('Only if you truly cannot fast: feed 60 poor people two full meals each, or give each the amount of Fitrah.'),
                ]}
              />
              <Press onPress={() => nav.push('guide', { id: 'kaffarah' })} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                <Body size={12.5} weight="semi" color={th.accent}>{t('Read the Kaffarah guide ›')}</Body>
              </Press>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
