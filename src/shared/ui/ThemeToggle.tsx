import React, {useCallback} from 'react';
import {Pressable, StyleSheet} from 'react-native';
import Octicons from '@expo/vector-icons/Octicons';
import {useTheme} from '@/shared/theme/ThemeProvider';
import {useThemeStore, type ThemeMode} from '@/shared/store/useThemeStore';

// Cycles system → light → dark → system so the whole preference space
// is reachable from a single tap without a modal or settings screen.
//
// Lives in shared/ui because it is used from two places: the Detail screen's
// header and the Search screen. It previously existed only inside
// RootNavigator, which meant the app's one theme control was reachable only
// after navigating into a repository — the main screen had no way to change
// theme at all.
const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const LABEL: Record<ThemeMode, string> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

// Sun / moon for the explicit modes, and a phone for "follow this device".
//
// `device-mobile` rather than `device-desktop`: this is a phone app, and
// showing a desktop monitor to say "match your system setting" points at the
// wrong machine. Octicons has no half-circle/contrast glyph — the other common
// convention for auto — so the device metaphor is the clearest one available
// without mixing in a second icon family and its different stroke weight.
const ICON: Record<ThemeMode, React.ComponentProps<typeof Octicons>['name']> = {
  system: 'device-mobile',
  light: 'sun',
  dark: 'moon',
};

export const ThemeToggle = React.memo(function ThemeToggleImpl() {
  const {colors} = useTheme();
  const mode = useThemeStore(s => s.mode);
  const setMode = useThemeStore(s => s.setMode);

  const handlePress = useCallback(() => {
    setMode(NEXT_MODE[mode]);
  }, [mode, setMode]);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      // The label carries the current value *and* the affordance, because the
      // visible text alone ("Auto") doesn't tell a screen-reader user that it
      // is interactive or what tapping does.
      accessibilityLabel={`Theme: ${LABEL[mode]}. Tap to change.`}
      style={({pressed}) => [styles.pressable, pressed && styles.pressed]}>
      {/* Icon-only, so the accessibilityLabel above is now the *only* thing
          announcing the current mode — it is load-bearing, not decorative. */}
      <Octicons name={ICON[mode]} size={20} color={colors.accent} accessible={false} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pressable: {paddingVertical: 4, paddingHorizontal: 4},
  pressed: {opacity: 0.6},
});
