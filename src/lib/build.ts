import * as Updates from 'expo-updates';

/**
 * App Store / Play Store sürümü mü? (EAS "production" kanalı.)
 * Mağaza sürümünde deneme/test ekranları gizli kalır (Apple 2.3.1: gizli özellik olmamalı).
 * Expo Go ve TestFlight ("preview" kanalı) bu ekranları göstermeye devam eder.
 */
export const IS_STORE_BUILD = Updates.channel === 'production';
