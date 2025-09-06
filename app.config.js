// app.config.js
export default ({ config }) => ({
  expo: {
    name: "TPM Mobile",
    slug: "tpm-rn-expo",
    scheme: "tpm",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.k2p.tpm",
      permissions: [],
      versionCode: 1,
    },
    web: { bundler: "metro" },
    extra: {
      eas: { projectId: "8c62cd08-341d-4742-b004-79afff07d3cd" }, // ✅ yahan naya projectId
      API_BASE_URL:
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        "https://tpm-mobile-mhhd.onrender.com/api/v1",
    },
  },
});
