import React from 'react';
import {StyleSheet, TextInput, View} from 'react-native';
import {colors} from '@/shared/theme/colors';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
};

export const SearchInput = React.memo(function SearchInputImpl({value, onChangeText}: Props) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search GitHub repositories"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search GitHub repositories"
        style={styles.input}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    padding: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
});
