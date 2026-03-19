#!/bin/bash

PLATFORM=${1:-"android"}
PROFILE=${2:-""}

case "$PLATFORM" in
  android|apk)
    PROFILE=${PROFILE:-"preview"}
    echo "▶ Android APK ビルド開始 (profile: $PROFILE)"
    eas build --profile "$PROFILE" --platform android --non-interactive
    ;;
  ios|ipa)
    PROFILE=${PROFILE:-"ios-preview"}
    echo "▶ iOS IPA ビルド開始 (profile: $PROFILE)"
    eas build --profile "$PROFILE" --platform ios --non-interactive
    ;;
  both|all)
    echo "▶ Android + iOS 同時ビルド開始"
    eas build --profile preview --platform android --non-interactive &
    eas build --profile ios-preview --platform ios --non-interactive &
    wait
    ;;
  *)
    echo "使い方:"
    echo "  ./build.sh android   # APK ビルド"
    echo "  ./build.sh ios       # IPA ビルド"
    echo "  ./build.sh both      # 両方同時ビルド"
    exit 1
    ;;
esac

echo ""
echo "✅ ビルドをキューに追加しました"
echo "📦 ダウンロード: https://expo.dev/accounts/figjp/projects/timecard/builds"
