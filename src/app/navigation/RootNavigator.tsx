import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {SearchScreen} from '@/features/repo-search/ui/SearchScreen';
import {DetailScreen} from '@/features/repo-details/ui/DetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{title: 'Repositories', headerShown: false}}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={({route}) => ({title: `${route.params.owner}/${route.params.name}`})}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
