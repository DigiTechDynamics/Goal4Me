// Expo's default Metro config (monorepo-aware) with Sentry's serializer,
// which adds debug ids so crash stack traces map back to the source.
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
