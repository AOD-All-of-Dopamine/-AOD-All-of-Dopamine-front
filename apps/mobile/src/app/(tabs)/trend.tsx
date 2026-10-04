import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { NewReleasesPane } from '@/components/trend/NewReleasesPane';
import { RankingPane } from '@/components/trend/RankingPane';
import { Palette } from '@/constants/theme';
import { fonts } from '@/theme/tokens';

/**
 * 트렌드 탭(설계 docs/superpowers/specs/2026-10-04-trend-explore-design.md v2 #11) — 옛 랭킹 · 신작 탭을 한 탭으로.
 * "지금 뜨는"(옛 랭킹 본문) · "새로 나온"(옛 신작 본문)을 위 전환으로 오간다. ?view=new 로 새로 나온을 바로 연다.
 */
type TrendView = 'hot' | 'new';

const VIEWS: { id: TrendView; label: string }[] = [
  { id: 'hot', label: '지금 뜨는' },
  { id: 'new', label: '새로 나온' },
];

export default function TrendScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const view: TrendView = params.view === 'new' ? 'new' : 'hot';

  const header = (
    <View>
      <ThemedText style={styles.pageTitle}>트렌드</ThemedText>
      <View style={styles.switcher} accessibilityRole="tablist">
        {VIEWS.map((v) => {
          const active = v.id === view;
          return (
            <Pressable
              key={v.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => router.setParams({ view: v.id })}
              style={[styles.segment, active && styles.segmentActive]}>
              <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return view === 'new' ? <NewReleasesPane header={header} /> : <RankingPane header={header} />;
}

const styles = StyleSheet.create({
  pageTitle: {
    paddingTop: 18,
    paddingHorizontal: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 800,
    letterSpacing: -0.4,
    color: Palette.ink,
  },
  switcher: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
    marginHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.line,
  },
  segment: {
    paddingBottom: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  segmentActive: {
    borderBottomColor: Palette.ink,
  },
  segmentLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.semiBold,
    color: Palette.ink3,
  },
  segmentLabelActive: {
    color: Palette.ink,
  },
});
