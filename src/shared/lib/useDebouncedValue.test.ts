import {act, renderHook} from '@testing-library/react-native';
import {useDebouncedValue} from './useDebouncedValue';

jest.useFakeTimers();

describe('useDebouncedValue', () => {
  it('returns the initial value immediately', async () => {
    const {result} = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('updates only after the delay elapses', async () => {
    const {result, rerender} = renderHook(
      ({value}: {value: string}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'a'}},
    );

    await act(async () => {
      rerender({value: 'b'});
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('collapses rapid changes into the last value (the whole point of debouncing search input)', async () => {
    const {result, rerender} = renderHook(
      ({value}: {value: string}) => useDebouncedValue(value, 300),
      {initialProps: {value: 'r'}},
    );

    await act(async () => {
      rerender({value: 're'});
      jest.advanceTimersByTime(100);
      rerender({value: 'rea'});
      jest.advanceTimersByTime(100);
      rerender({value: 'reac'});
      jest.advanceTimersByTime(100);
    });
    // every keystroke reset the timer — still initial
    expect(result.current).toBe('r');

    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('reac');
  });
});
