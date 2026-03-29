// LocationPicker — Bottom sheet: search + Leaflet/OSM map (free, no API key).
// Three modes: Specific Place | General Area | Keep Private

import React, {
    useCallback, useEffect, useRef, useState,
  } from 'react';
  import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    View,
  } from 'react-native';
  import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
  } from 'react-native-reanimated';
  import { WebView }       from 'react-native-webview';
  import { Ionicons }      from '@expo/vector-icons';
  import { BlurView }      from 'expo-blur';
  import * as Location     from 'expo-location';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { useTranslation } from 'react-i18next';
  import { useTheme as useAppTheme } from '../context/ThemeContext';
  import { Theme } from '../constants/theme';
  
  import type { LocationData, LocationPrivacy } from '../types/signal';
  import {
    searchPlaces, reverseGeocode, shortPlaceLabel,
    type NominatimPlace,
  } from '../utils/locationUtils';
  
  const { height: SH } = Dimensions.get('window');
  const PRIMARY = '#6C47FF';
  const SUCCESS = '#16A34A';
  
  // ─── Leaflet HTML (OpenStreetMap tiles — 100% free, no API key) ──────────────
  function buildLeafletHTML(
    initLat: number,
    initLng: number,
    hasPin:  boolean,
    isDark:  boolean,
  ): string {
    const bg       = isDark ? '#0D0A1E' : '#F0EBFF';
    const pinColor = PRIMARY;
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
      .custom-pin{
        width:26px;height:26px;
        background:${pinColor};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 2px 10px rgba(108,71,255,0.55);
      }
    </style>
  </head>
  <body><div id="map"></div>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false})
              .setView([${initLat},${initLng}],${hasPin ? 16 : 13});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  
    var pinIcon=L.divIcon({className:'',html:'<div class="custom-pin"></div>',
      iconSize:[26,26],iconAnchor:[13,26]});
    var marker=${hasPin
      ? `L.marker([${initLat},${initLng}],{icon:pinIcon}).addTo(map);`
      : 'null;'};
  
    function send(d){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(d));}
  
    map.on('click',function(e){
      var lat=e.latlng.lat,lng=e.latlng.lng;
      if(marker){marker.setLatLng(e.latlng);}
      else{marker=L.marker(e.latlng,{icon:pinIcon}).addTo(map);}
      send({type:'tap',lat:lat,lng:lng});
    });
  
    function handle(d){
      if(d.type==='goto'){
        var ll=[d.lat,d.lng];
        map.setView(ll,d.zoom||16);
        if(marker){marker.setLatLng(ll);}
        else{marker=L.marker(ll,{icon:pinIcon}).addTo(map);}
      }
    }
    document.addEventListener('message',function(e){try{handle(JSON.parse(e.data));}catch(_){}});
    window.addEventListener('message',function(e){try{handle(JSON.parse(e.data));}catch(_){}});
  </script>
  </body></html>`;
  }
  
  // ─── types ───────────────────────────────────────────────────────────────────
  type Props = {
    visible:          boolean;
    onClose:          () => void;
    onSelect:         (location: LocationData | null) => void;
    initialLocation?: LocationData;
  };
  
  type TabId = LocationPrivacy;
  
  // ─── LocationPicker ──────────────────────────────────────────────────────────
  export function LocationPicker({
    visible, onClose, onSelect, initialLocation,
  }: Props) {
    const { themeObject: T, isDark, colors } = useAppTheme();
    const { t } = useTranslation();
    const insets      = useSafeAreaInsets();
    const webviewRef  = useRef<WebView>(null);
  
    const bg          = T.bg;
    const surface     = T.surface;
    const border      = T.border;
    const textPrimary = T.textPrimary;
    const textSec     = T.textTertiary;
  
    const [tab,          setTab         ] = useState<TabId>(initialLocation?.privacy ?? 'specific');
    const [searchQuery,  setSearchQuery ] = useState('');
    const [results,      setResults     ] = useState<NominatimPlace[]>([]);
    const [searching,    setSearching   ] = useState(false);
    const [selected,     setSelected    ] = useState<LocationData | null>(
      initialLocation ?? null,
    );
    const [generalText,  setGeneralText ] = useState(
      initialLocation?.privacy === 'general' ? initialLocation.label : '',
    );
    const [gpsLoading,   setGpsLoading  ] = useState(false);
    const [mapReady,     setMapReady    ] = useState(false);
  
    const [searchTimer] = React.useState(() => ({ current: null as (ReturnType<typeof setTimeout> | null) }));
  
    // ── reset when opened ──
    useEffect(() => {
      if (visible) {
        setTab(initialLocation?.privacy ?? 'specific');
        setSelected(initialLocation ?? null);
        setSearchQuery('');
        setResults([]);
        setMapReady(false);
      }
    }, [visible]);
  
    // ── debounced Nominatim search ──
    useEffect(() => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (!searchQuery.trim()) { setResults([]); return; }
      searchTimer.current = setTimeout(async () => {
        setSearching(true);
        const r = await searchPlaces(searchQuery);
        setResults(r);
        setSearching(false);
      }, 450);
      return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [searchQuery]);
  
    // ── send pin to map when selected changes ──
    useEffect(() => {
      if (selected?.latitude && selected?.longitude && mapReady) {
        webviewRef.current?.injectJavaScript(
          `handle({type:'goto',lat:${selected.latitude},lng:${selected.longitude},zoom:16});true;`,
        );
      }
    }, [selected, mapReady]);
  
    // ── pick place from search result ──
    const pickResult = useCallback(async (place: NominatimPlace) => {
      Keyboard.dismiss();
      const lat   = parseFloat(place.lat);
      const lng   = parseFloat(place.lon);
      const label = shortPlaceLabel(place);
      setSelected({ privacy: 'specific', label, latitude: lat, longitude: lng });
      setSearchQuery(label);
      setResults([]);
    }, []);
  
    // ── use GPS ──
    const useGPS = useCallback(async () => {
      setGpsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setGpsLoading(false); return; }
        const loc   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat   = loc.coords.latitude;
        const lng   = loc.coords.longitude;
        const label = await reverseGeocode(lat, lng);
        setSelected({ privacy: 'specific', label, latitude: lat, longitude: lng });
        setSearchQuery(label);
        setResults([]);
      } catch (_) { /* silently fail */ }
      setGpsLoading(false);
    }, []);
  
    // ── WebView tap → reverse geocode ──
    const onWebMessage = useCallback(async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'tap') {
          const label = await reverseGeocode(data.lat, data.lng);
          setSelected({ privacy: 'specific', label, latitude: data.lat, longitude: data.lng });
          setSearchQuery(label);
        }
      } catch (_) {}
    }, []);
  
    // ── confirm ──
    const handleConfirm = useCallback(() => {
      if (tab === 'none') {
        onSelect(null);
      } else if (tab === 'general') {
        const t = generalText.trim();
        if (!t) { onSelect(null); }
        else    { onSelect({ privacy: 'general', label: t }); }
      } else {
        onSelect(selected);
      }
      onClose();
    }, [tab, selected, generalText, onSelect, onClose]);
  
    // ── map html ──
    const initLat  = selected?.latitude  ?? 40.4093;
    const initLng  = selected?.longitude ?? 49.8671;
    const mapHtml  = buildLeafletHTML(initLat, initLng, !!selected?.latitude, isDark);
  
    const tabHeight = tab === 'specific' ? SH * 0.78 : SH * 0.46;
  
    // ── quick area chips ──
    const areaChipsKeys = ['cityCentre', 'neighbourhood', 'oldTown', 'northSide', 'southSide'];
    const areaChips = areaChipsKeys.map(key => t(`location.${key}`));
  
    // ── confirm disabled? ──
    const confirmDisabled =
      tab === 'specific' ? !selected?.latitude :
      tab === 'general'  ? !generalText.trim() :
      false;
  
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        {/* Backdrop */}
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
  
        {/* Sheet */}
        <Animated.View
          entering={SlideInDown.springify().damping(22).stiffness(220)}
          exiting={SlideOutDown.duration(260)}
          style={[
            styles.sheet,
            {
              height:          tabHeight,
              backgroundColor: surface,
              paddingBottom:   insets.bottom + 8,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: isDark ? '#2D2450' : '#E5E0FF' }]} />
          </View>
  
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="location-outline" size={18} color={T.primary} />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>{t('location.title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#2D2450' : '#F0EBFF' }]}>
              <Ionicons name="close" size={18} color={textSec} />
            </TouchableOpacity>
          </View>
  
          {/* Tab selector */}
          <View style={[styles.tabBar, { backgroundColor: isDark ? '#1A1529' : '#F0EBFF', borderColor: border }]}>
            {([ 
              { id: 'specific', icon: 'location',     label: t('location.specific') },
              { id: 'general',  icon: 'map-outline',  label: t('location.general') },
              { id: 'none',     icon: 'eye-off',      label: t('location.private') },
            ] as { id: TabId; icon: any; label: string }[]).map((t) => (
              <TabButton
                key={t.id}
                id={t.id}
                icon={t.icon}
                label={t.label}
                active={tab === t.id}
                isDark={isDark}
                onPress={() => setTab(t.id)}
                T={T}
              />
            ))}
          </View>
  
          {/* ── Specific tab ── */}
          {tab === 'specific' && (
            <View style={styles.tabContent}>
              {/* Search bar row */}
              <View style={[styles.searchRow, { backgroundColor: isDark ? '#1A1529' : '#F5F3FF', borderColor: border }]}>
                <Ionicons name="search-outline" size={17} color={textSec} />
                <TextInput
                  style={[styles.searchInput, { color: textPrimary }]}
                  placeholder={t('location.searchPlaceholder')}
                  placeholderTextColor={textSec}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searching && <ActivityIndicator size="small" color={T.primary} />}
                {!searching && searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setResults([]); }}>
                    <Ionicons name="close-circle" size={17} color={textSec} />
                  </TouchableOpacity>
                )}
              </View>
  
              {/* GPS button */}
              <TouchableOpacity
                onPress={useGPS}
                style={[styles.gpsBtn, { borderColor: T.primary }]}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? <ActivityIndicator size="small" color={T.primary} />
                  : <Ionicons name="navigate-outline" size={15} color={T.primary} />
                }
                <Text style={[styles.gpsBtnText, { color: T.primary }]}>
                  {gpsLoading ? t('location.gettingLocation') : t('location.useGPS')}
                </Text>
              </TouchableOpacity>

              {/* Categories */}
              <View style={styles.categoriesRow}>
                {([
                  { id: 'cafe', icon: 'cafe-outline', label: t('home.filters.cafe') },
                  { id: 'food', icon: 'restaurant-outline', label: t('home.filters.food') },
                  { id: 'park', icon: 'leaf-outline', label: t('home.filters.walk') },
                  { id: 'study', icon: 'book-outline', label: t('home.filters.study') },
                ] as const).map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSearchQuery(cat.label)}
                    style={[styles.catChip, { backgroundColor: isDark ? '#2D2450' : '#F0EBFF' }]}
                  >
                    <Ionicons name={cat.icon} size={13} color={T.primary} />
                    <Text style={[styles.catLabel, { color: T.textTertiary }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
  
              {/* Search results */}
              {results.length > 0 && (
                <View style={[styles.resultsList, { backgroundColor: surface, borderColor: border }]}>
                  {results.slice(0, 5).map((r) => (
                    <TouchableOpacity
                      key={r.place_id}
                      style={[styles.resultItem, { borderBottomColor: border }]}
                      onPress={() => pickResult(r)}
                    >
                      <Ionicons name="location-outline" size={14} color={T.primary} />
                      <Text style={[styles.resultText, { color: textPrimary }]} numberOfLines={1}>
                        {shortPlaceLabel(r)}
                      </Text>
                      <Text style={[styles.resultSub, { color: textSec }]} numberOfLines={1}>
                        {r.display_name.split(',').slice(1, 3).join(',')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
  
              {/* Map */}
              <View style={[styles.mapWrap, { borderColor: border }]}>
                {!mapReady && (
                  <View style={[styles.mapLoading, { backgroundColor: T.surfaceAlt }]}>
                    <ActivityIndicator color={T.primary} />
                    <Text style={[styles.mapLoadingText, { color: textSec }]}>{t('location.loadingMap')}</Text>
                  </View>
                )}
                <WebView
                  ref={webviewRef}
                  source={{ html: mapHtml }}
                  style={[styles.mapWebview, !mapReady && { opacity: 0 }]}
                  onLoadEnd={() => setMapReady(true)}
                  onMessage={onWebMessage}
                  javaScriptEnabled
                  scrollEnabled={false}
                  originWhitelist={['*']}
                />
                {/* Hint overlay — top right */}
                {mapReady && !selected?.latitude && (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.mapHint}>
                    <Text style={styles.mapHintText}>{t('location.tapToPin')}</Text>
                  </Animated.View>
                )}
                {/* Selected label overlay — bottom */}
                {selected?.latitude && (
                  <View style={[styles.mapLabel, { backgroundColor: isDark ? 'rgba(13,10,30,0.88)' : 'rgba(255,255,255,0.9)', borderColor: T.primary }]}>
                    <Ionicons name="location" size={13} color={T.primary} />
                    <Text style={[styles.mapLabelText, { color: textPrimary }]} numberOfLines={1}>
                      {selected.label}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
  
          {/* ── General tab ── */}
          {tab === 'general' && (
            <View style={styles.tabContent}>
              <Text style={[styles.generalHint, { color: textSec }]}>
                {t('location.generalHint')}
              </Text>
              <View style={[styles.generalInputWrap, { backgroundColor: T.surfaceAlt, borderColor: border }]}>
                <Ionicons name="map-outline" size={17} color={T.primary} />
                <TextInput
                  style={[styles.generalInput, { color: textPrimary }]}
                  placeholder={t('location.generalPlaceholder')}
                  placeholderTextColor={textSec}
                  value={generalText}
                  onChangeText={setGeneralText}
                  returnKeyType="done"
                  maxLength={60}
                />
              </View>
              {/* Quick chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
                {areaChips.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setGeneralText(c)}
                    style={[
                      styles.chip,
                      {
                      borderColor:     generalText === c ? T.primary : border,
                        backgroundColor: generalText === c
                          ? (isDark ? 'rgba(108,71,255,0.2)' : 'rgba(108,71,255,0.1)')
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: generalText === c ? T.primary : textSec }]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
  
          {/* ── Private tab ── */}
          {tab === 'none' && (
            <View style={[styles.tabContent, styles.privateContent]}>
              <View style={[styles.privateIconWrap, { backgroundColor: T.primarySoft }]}>
                <Ionicons name="eye-off-outline" size={36} color={T.primary} />
              </View>
              <Text style={[styles.privateTitle, { color: textPrimary }]}>{t('location.privateTitle')}</Text>
              <Text style={[styles.privateBody, { color: textSec }]}>
                {t('location.privateBody')}
              </Text>
            </View>
          )}
  
          {/* Confirm button */}
          <View style={[styles.confirmWrap, { borderTopColor: border }]}>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={confirmDisabled}
              style={[
                styles.confirmBtn,
                {
                  backgroundColor: confirmDisabled
                    ? colors.disabled
                    : T.primary,
                },
              ]}
            >
              <Ionicons
                name={tab === 'none' ? 'eye-off' : 'checkmark-circle'}
                size={18}
                color={confirmDisabled ? (isDark ? '#5B4D8A' : '#9B7FFF') : '#FFFFFF'}
              />
              <Text style={[
                styles.confirmText,
                { color: confirmDisabled ? (isDark ? '#5B4D8A' : '#9B7FFF') : '#FFFFFF' },
              ]}>
                {tab === 'none'
                  ? t('location.continueNoLoc')
                  : tab === 'general' ? t('location.useGeneral')
                  : selected?.latitude ? t('location.confirm')
                  : t('location.searchOrPin')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    );
  }
  
  // ─── TabButton ────────────────────────────────────────────────────────────────
  function TabButton({
    id, icon, label, active, isDark, onPress, T,
  }: {
    id:      TabId;
    icon:    any;
    label:   string;
    active:  boolean;
    isDark:  boolean;
    onPress: () => void;
    T:       Theme;
  }) {
    const scale = useSharedValue(1);
    const s     = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  
    return (
      <Animated.View style={[styles.tabBtnWrap, s]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={() =>  { scale.value = withSpring(0.93); }}
          onPressOut={() => { scale.value = withSpring(1); }}
          style={[
            styles.tabBtn,
            {
              backgroundColor: active
                ? T.primarySoft
                : 'transparent',
              borderColor: active ? T.primary : 'transparent',
            },
          ]}
        >
          <Ionicons name={icon} size={14} color={active ? T.primary : (isDark ? '#9B7FFF' : '#6B7280')} />
          <Text style={[
            styles.tabBtnText,
            { color: active ? T.primary : (isDark ? '#9B7FFF' : '#6B7280'),
              fontWeight: active ? 'bold' : 'normal' },
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }
  
  // ─── styles ──────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent:  'flex-end',
    },
    sheet: {
      position:     'absolute',
      bottom:       0,
      left:         0,
      right:        0,
      borderTopLeftRadius:  24,
      borderTopRightRadius: 24,
      overflow:     'hidden',
    },
    handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
    handle:     { width: 36, height: 4, borderRadius: 2 },
  
    sheetHeader: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingBottom:  10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sheetTitle: { fontSize: 16, fontWeight: 'bold' },
    closeBtn:   {
      width: 32, height: 32, borderRadius: 16,
      justifyContent: 'center', alignItems: 'center',
    },
  
    tabBar: {
      flexDirection:  'row',
      marginHorizontal: 16,
      borderRadius:   12,
      borderWidth:    1,
      padding:        4,
      marginBottom:   12,
    },
    tabBtnWrap: { flex: 1 },
    tabBtn: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            5,
      paddingVertical: 8,
      borderRadius:   8,
      borderWidth:    1,
    },
    tabBtnText: { fontSize: 12 },
  
    tabContent: { flex: 1, paddingHorizontal: 16 },
  
    searchRow: {
      flexDirection:    'row',
      alignItems:       'center',
      gap:              8,
      borderRadius:     12,
      borderWidth:      1,
      paddingHorizontal: 12,
      height:           44,
      marginBottom:     8,
    },
    searchInput: { flex: 1, fontSize: 14 },
  
    gpsBtn: {
      flexDirection:  'row',
      alignItems:     'center',
      gap:            6,
      borderWidth:    1,
      borderRadius:   10,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginBottom:   8,
      alignSelf:      'flex-start',
    },
    gpsBtnText: { fontSize: 13, fontWeight: '500' },
  
    resultsList: {
      borderRadius: 12,
      borderWidth:  1,
      overflow:     'hidden',
      marginBottom: 8,
    },
    resultItem: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           8,
      paddingVertical:   10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
    },
    resultText: { flex: 1, fontSize: 13, fontWeight: '500' },
    resultSub:  { fontSize: 11, maxWidth: 100 },
  
    mapWrap: {
      flex:         1,
      borderRadius: 14,
      borderWidth:  1,
      overflow:     'hidden',
      position:     'relative',
      minHeight:    180,
    },
    mapWebview: { flex: 1 },
    mapLoading: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems:     'center',
      gap:            8,
      zIndex:         2,
    },
    mapLoadingText: { fontSize: 13 },
    mapHint: {
      position:         'absolute',
      top:              10,
      right:            10,
      backgroundColor:  'rgba(108,71,255,0.85)',
      paddingHorizontal: 10,
      paddingVertical:  5,
      borderRadius:     20,
      zIndex:           3,
    },
    mapHintText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
    mapLabel: {
      position:         'absolute',
      bottom:           10,
      left:             10,
      right:            10,
      flexDirection:    'row',
      alignItems:       'center',
      gap:              6,
      borderRadius:     10,
      paddingVertical:  7,
      paddingHorizontal: 10,
      borderWidth:      1,
      zIndex:           3,
    },
    mapLabelText: { fontSize: 12, fontWeight: '600', flex: 1 },
  
    generalHint: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
    generalInputWrap: {
      flexDirection:    'row',
      alignItems:       'center',
      gap:              8,
      borderRadius:     12,
      borderWidth:      1,
      paddingHorizontal: 12,
      height:           48,
      marginBottom:     14,
    },
    generalInput: { flex: 1, fontSize: 14 },
    chipsScroll:  { flexGrow: 0 },
    chipsRow:     { gap: 8, paddingVertical: 4 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical:   7,
      borderRadius:      20,
      borderWidth:       1,
    },
    chipText: { fontSize: 13, fontWeight: '500' },
  
    privateContent: {
      alignItems:     'center',
      justifyContent: 'center',
      paddingTop:     12,
      gap:            12,
    },
    privateIconWrap: {
      width: 72, height: 72, borderRadius: 36,
      justifyContent: 'center', alignItems: 'center',
    },
    privateTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
    privateBody:  { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  
    confirmWrap: {
      paddingHorizontal: 16,
      paddingTop:        10,
      borderTopWidth:    1,
    },
    confirmBtn: {
      flexDirection:  'row',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            8,
      height:         50,
      borderRadius:   14,
    },
    confirmText: { fontSize: 15, fontWeight: 'bold' },
    categoriesRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    catLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
    },
  });