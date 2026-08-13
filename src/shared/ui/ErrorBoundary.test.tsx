import React from 'react';
import {Text} from 'react-native';
import {fireEvent, render, screen} from '@testing-library/react-native';
import {ErrorBoundary} from './ErrorBoundary';

// The first render tests in the codebase. ErrorBoundary is the right place to
// start: its reset path is pure UI behaviour that no hook test can cover, and
// the old version's defect (no way out of the fallback) was invisible to
// typecheck and lint alike.

function Boom({shouldThrow}: {shouldThrow: boolean}): React.ReactElement {
  if (shouldThrow) throw new Error('kaboom');
  return <Text>recovered</Text>;
}

describe('ErrorBoundary', () => {
  // React logs caught render errors to console.error; silence it so a passing
  // run stays readable, and restore afterwards.
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Text>all good</Text>
      </ErrorBoundary>,
    );

    expect(screen.getByText('all good')).toBeTruthy();
  });

  it('renders the fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong.')).toBeTruthy();
  });

  it('calls onError with the thrown error', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe('kaboom');
  });

  // The behaviour the previous implementation lacked entirely.
  it('recovers when the user presses Try again', () => {
    function Harness() {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      return (
        <ErrorBoundary onReset={() => setShouldThrow(false)}>
          <Boom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);
    expect(screen.getByText('Something went wrong.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(screen.getByText('recovered')).toBeTruthy();
    expect(screen.queryByText('Something went wrong.')).toBeNull();
  });

  it('clears the error when resetKeys change', () => {
    const {rerender} = render(
      <ErrorBoundary resetKeys={['a']}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong.')).toBeTruthy();

    // Navigating to a different repo should not inherit the previous crash.
    rerender(
      <ErrorBoundary resetKeys={['b']}>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('recovered')).toBeTruthy();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={({error}) => <Text>custom: {error.message}</Text>}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/custom: kaboom/)).toBeTruthy();
  });
});
