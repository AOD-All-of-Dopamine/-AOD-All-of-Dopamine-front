import { Redirect } from 'expo-router';

/** 옛 신작 탭 경로 — 트렌드 "새로 나온"으로(2026-10-04). 탭 막대에는 숨긴다. */
export default function NewRedirect() {
  return <Redirect href={{ pathname: '/(tabs)/trend', params: { view: 'new' } }} />;
}
