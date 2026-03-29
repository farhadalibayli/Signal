// LocationMapPreview — Shows on signal cards: thumbnail + distance.
// Tap → expands to a modal with full interactive Leaflet map.

import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { WebView }  from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme as useAppTheme } from '../context/ThemeContext';

import type { LocationData } from '../types/signal';
import type { UserCoords }   from '../hooks/useUserLocation';
import {
  distanceToSignal, staticMapUrl,
  locationEditSecondsLeft,
} from '../utils/locationUtils';

const { width: SW, height: SH } = Dimensions.get('window');
const PRIMARY = '#6C47FF';

// ─── Leaflet HTML for expanded view ──────────────────────────────────────────
function expandedMapHtml(lat: number, lng: number, isDark: boolean): string {
  const bg = isDark ? '#0D0A1E' : '#F0EBFF';
  return `
<!DOCTYPE html><html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:${bg}}
    #map{width:100%;height:100vh}
    .leaflet-control-attribution{display:none}
    .marker-wrapper { position: relative; width: 28px; height: 28px; }
    .custom-pin{
      width:28px;height:28px;
      background:${PRIMARY};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 3px 12px rgba(108,71,255,0.6);
      position: absolute; left: 0; top: 0; z-index: 2;
    }
    .pulse-ring {
      position: absolute; left: -14px; top: -14px;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${PRIMARY};
      opacity: 0.6; z-index: 1;
      animation: pulse 2s ease-out infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.3); opacity: 0.8; }
      100% { transform: scale(2.5); opacity: 0; }
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map=L.map('map',{zoomControl:true,attributionControl:false,dragging:true})
            .setView([${lat},${lng}],16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var icon=L.divIcon({className:'',html:'<div class="marker-wrapper"><div class="pulse-ring"></div><div class="custom-pin"></div></div>',
    iconSize:[28,28],iconAnchor:[14,28]});
  L.marker([${lat},${lng}],{icon:icon}).addTo(map);
</script>
</body></html>`;
}

// ─── props ────────────────────────────────────────────────────────────────────
type Props = {
  location:     LocationData;
  userCoords?:  UserCoords;
  // For edit countdown (signal detail only)
  createdAt?:   number;
  totalMinutes?: number;
  isOwn?:        boolean;
  onEditPress?:  () => void;
};

// ─── LocationMapPreview ───────────────────────────────────────────────────────
export function LocationMapPreview({
  location, userCoords, createdAt, totalMinutes, isOwn, onEditPress,
}: Props) {
  const { t } = useTranslation();
  const { themeObject: T, isDark, colors } = useAppTheme();
  const insets      = useSafeAreaInsets();

  const [expanded,      setExpanded     ] = useState(false);
  const [editSecsLeft,  setEditSecsLeft ] = useState(
    locationEditSecondsLeft(createdAt, 0, totalMinutes ?? 120),
  );

  const textPrimary = T.textPrimary;
  const textSec     = T.textTertiary;
  const surface     = T.surface;
  const border      = T.border;

  const scale       = useSharedValue(1);
  const cardStyle   = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // ── edit countdown tick ──
  React.useEffect(() => {
    if (!createdAt || !totalMinutes || !isOwn) return;
    const interval = setInterval(() => {
      const secs = locationEditSecondsLeft(createdAt, 0, totalMinutes);
      setEditSecsLeft(secs);
      if (secs === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, totalMinutes, isOwn]);

  const distance = distanceToSignal(userCoords ?? null, location);

  const hasPin = location.privacy === 'specific'
    && !!location.latitude && !!location.longitude;

  const thumbUrl = hasPin
    ? staticMapUrl(location.latitude!, location.longitude!, 600, 240, 15)
    : null;

  const editMinSec = editSecsLeft > 0
    ? `${Math.floor(editSecsLeft / 60)}:${String(editSecsLeft % 60).padStart(2, '0')}`
    : null;

  return (
    <>
      {/* ── Card thumbnail ── */}
      <Animated.View style={cardStyle}>
        <Pressable
          onPress={() => hasPin && setExpanded(true)}
          onPressIn={() =>  { if (hasPin) scale.value = withSpring(0.97); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          style={[styles.card, { borderColor: border }]}
        >
          {/* Map thumbnail */}
          {hasPin && thumbUrl ? (
            <View style={styles.thumbWrap}>
              <Image
                source={{ uri: thumbUrl }}
                style={styles.thumb}
                resizeMode="cover"
              />
              {/* Distance badge */}
              {distance && (
                <View style={styles.distanceBadge}>
                  <Ionicons name="navigate" size={10} color="#FFFFFF" />
                  <Text style={styles.distanceBadgeText}>{distance} away</Text>
                </View>
              )}
              {/* Tap hint */}
              <View style={styles.expandHint}>
                <Ionicons name="expand-outline" size={12} color="rgba(255,255,255,0.85)" />
              </View>
            </View>
          ) : null}

          {/* Location info row */}
          <View style={[styles.infoRow, { backgroundColor: isDark ? '#1A1529' : '#FAFAFA' }]}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(108,71,255,0.18)' : 'rgba(108,71,255,0.1)' }]}>
              <Ionicons
                name={location.privacy === 'general' ? 'map-outline' : 'location'}
                size={14}
                color={T.primary}
              />
            </View>
            <View style={styles.labelWrap}>
              <Text style={[styles.locationLabel, { color: textPrimary }]} numberOfLines={1}>
                {location.label}
              </Text>
              {location.privacy === 'general' && (
                <Text style={[styles.privacyNote, { color: textSec }]}>{t('components.generalArea')}</Text>
              )}
            </View>
            {/* Distance text (if no thumbnail) */}
            {distance && !hasPin && (
              <View style={styles.distanceChip}>
                <Ionicons name="navigate-outline" size={11} color={T.primary} />
                <Text style={[styles.distanceText, { color: T.primary }]}>{distance}</Text>
              </View>
            )}
            {/* Edit button */}
            {isOwn && editMinSec && onEditPress && (
              <TouchableOpacity onPress={onEditPress} style={styles.editBtn}>
                <Ionicons name="pencil" size={12} color={T.primary} />
                <Text style={[styles.editBtnText, { color: T.primary }]}>{editMinSec}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Animated.View>

      {/* ── Expanded modal ── */}
      {hasPin && (
        <Modal
          visible={expanded}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setExpanded(false)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.modalBg}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setExpanded(false)} />

            <Animated.View
              entering={FadeIn.duration(250).delay(50)}
              style={[
                styles.expandedCard,
                {
                  backgroundColor: surface,
                  width:           SW - 40,
                  paddingBottom:   insets.bottom + 12,
                },
              ]}
            >
              {/* Close button */}
              <TouchableOpacity
                onPress={() => setExpanded(false)}
                style={[styles.expandedClose, { backgroundColor: isDark ? '#2D2450' : '#F0EBFF' }]}
              >
                <Ionicons name="close" size={18} color={textSec} />
              </TouchableOpacity>

              {/* Map */}
              <View style={styles.expandedMapWrap}>
                <WebView
                  source={{ html: expandedMapHtml(location.latitude!, location.longitude!, isDark) }}
                  style={styles.expandedMap}
                  javaScriptEnabled
                  scrollEnabled={false}
                  originWhitelist={['*']}
                />
              </View>

              {/* Info */}
              <View style={styles.expandedInfo}>
                <View style={styles.expandedInfoLeft}>
                  <Ionicons name="location" size={16} color={T.primary} />
                  <View>
                    <Text style={[styles.expandedLabel, { color: textPrimary }]}>
                      {location.label}
                    </Text>
                    {distance && (
                      <Text style={[styles.expandedDistance, { color: T.primary }]}>
                        📍 {distance} from you
                      </Text>
                    )}
                  </View>
                </View>
                {/* Open in Maps */}
                  <TouchableOpacity
                    style={[styles.openMapsBtn, { borderColor: T.primary }]}
                  onPress={() => {
                    // Could use Linking.openURL with maps:// or geo:
                  }}
                >
                  <Ionicons name="map" size={13} color={T.primary} />
                  <Text style={[styles.openMapsBtnText, { color: T.primary }]}>{t('components.maps')}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth:  1,
    overflow:     'hidden',
    marginTop:    10,
  },
  thumbWrap:    { height: 110, position: 'relative' },
  thumb:        { width: '100%', height: '100%' },
  distanceBadge: {
    position:         'absolute',
    top:              8,
    left:             8,
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    backgroundColor:  'rgba(108,71,255,0.85)',
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderRadius:     20,
  },
  distanceBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  expandHint: {
    position:        'absolute',
    bottom:          8,
    right:           8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width:           26,
    height:          26,
    borderRadius:    13,
    justifyContent:  'center',
    alignItems:      'center',
  },
  infoRow: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingVertical:  9,
    paddingHorizontal: 10,
    gap:              8,
  },
  iconWrap: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  labelWrap:     { flex: 1 },
  locationLabel: { fontSize: 13, fontWeight: '600' },
  privacyNote:   { fontSize: 10, marginTop: 1 },
  distanceChip: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
    backgroundColor: 'rgba(108,71,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:    20,
  },
  distanceText:  { fontSize: 11, fontWeight: '700' },
  editBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              3,
    paddingHorizontal: 8,
    paddingVertical:  4,
    borderRadius:     20,
    backgroundColor:  'rgba(108,71,255,0.12)',
  },
  editBtnText: { fontSize: 10, fontWeight: 'bold' },

  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  expandedCard: {
    borderRadius: 20,
    overflow:     'hidden',
  },
  expandedClose: {
    position:     'absolute',
    top:          10,
    right:        10,
    zIndex:       10,
    width:        32,
    height:       32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems:     'center',
  },
  expandedMapWrap: { height: 280 },
  expandedMap:     { flex: 1 },
  expandedInfo: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingTop:        12,
  },
  expandedInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  expandedLabel:    { fontSize: 14, fontWeight: 'bold' },
  expandedDistance: { fontSize: 12, marginTop: 2 },
  openMapsBtn: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              4,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:     20,
    borderWidth:      1,
  },
  openMapsBtnText: { fontSize: 12, fontWeight: '700' },
});