import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {ThemeToggle} from './ThemeToggle';
import {ThemeProvider} from '@/shared/theme/ThemeProvider';
import {useThemeStore} from '@/shared/store/useThemeStore';

// Now shared between the Search screen and the Detail header, so the cycle
// order is worth pinning: it's the only way to reach 'dark' on a device whose
// system theme is light.
function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  useThemeStore.setState({mode: 'system'});
});

describe('ThemeToggle', () => {
  it('starts on Auto', () => {
    renderToggle();
    expect(screen.getByLabelText('Theme: Auto. Tap to change.')).toBeTruthy();
  });

  it('cycles system → light → dark → system', () => {
    renderToggle();

    fireEvent.press(screen.getByRole('button'));
    expect(useThemeStore.getState().mode).toBe('light');
    expect(screen.getByLabelText('Theme: Light. Tap to change.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(screen.getByLabelText('Theme: Dark. Tap to change.')).toBeTruthy();

    // Every mode must be reachable by tapping alone — no settings screen.
    fireEvent.press(screen.getByRole('button'));
    expect(useThemeStore.getState().mode).toBe('system');
    expect(screen.getByLabelText('Theme: Auto. Tap to change.')).toBeTruthy();
  });

  // The control is now icon-only, so this label is the sole thing telling a
  // screen-reader user which mode is active. Asserting it isn't box-ticking:
  // if it regressed, the mode would become invisible to those users entirely.
  it('announces the current mode and the affordance to screen readers', () => {
    renderToggle();
    expect(screen.getByLabelText('Theme: Auto. Tap to change.')).toBeTruthy();
    // And no visible text remains to convey it.
    expect(screen.queryByText('Auto')).toBeNull();
  });
});
