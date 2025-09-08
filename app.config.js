// app.config.js
export default () => ({
  expo: {
    name: "TPM Mobile",
    slug: "tpm-rn-expo",
    scheme: "tpm",
    version: "1.0.1",

    // iOS + legacy Android icons
    icon: "./assets/icon.png",

    orientation: "portrait",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0F172A",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.k2p.tpm",
      icon: "./assets/icon.png",
      // ✅ REQUIRED for camera on iOS
      infoPlist: {
        NSCameraUsageDescription: "Scan QR codes for assets.",
      },
      // (Optional) bump when you submit to TestFlight
      buildNumber: "2",
    },

    android: {
      package: "com.k2p.tpm",
      versionCode: 2, // bump when rebuilding
      icon: "./assets/icon.png", // legacy fallback
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0F172A",
        monochromeImage: "./assets/adaptive-icon-monochrome.png",
      },
      // ✅ DO NOT leave this empty — this is the fix
      permissions: ["CAMERA"],
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
