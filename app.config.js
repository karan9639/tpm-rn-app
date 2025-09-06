// app.config.js
export default ({ config }) => ({
  expo: {
    name: "TPM Mobile",
    slug: "tpm-rn-expo",
    scheme: "tpm",
    version: "1.0.0",
    orientation: "portrait",

    // Global icon (used by iOS + older Android launchers)
    icon: "./assets/icon.png",

    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0F172A", // feel free to keep #ffffff if you prefer
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.k2p.tpm",
      icon: "./assets/icon.png",
    },

    android: {
      package: "com.k2p.tpm",
      versionCode: 1,
      // Fallback icon for legacy launchers (still good to be explicit)
      icon: "./assets/icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F172A",
        // monochromeImage: "./assets/adaptive-icon-monochrome.png", // optional (Android 13+)
      },
      permissions: [],
    },

    web: {
      bundler: "metro",
      favicon: "./assets/icon.png",
    },

    extra: {
      eas: { projectId: "8c62cd08-341d-4742-b004-79afff07d3cd" },
      API_BASE_URL:
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        "https://tpm-mobile-mhhd.onrender.com/api/v1",
    },
  },
});
