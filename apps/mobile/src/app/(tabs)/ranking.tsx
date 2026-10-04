import { Redirect } from 'expo-router';

/** 옛 랭킹 탭 경로 — 트렌드 "지금 뜨는"으로(2026-10-04). 탭 막대에는 숨긴다. */
export default function RankingRedirect() {
  return <Redirect href={{ pathname: '/(tabs)/trend', params: { view: 'hot' } }} />;
}
