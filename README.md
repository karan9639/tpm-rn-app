
# TPM React Native (Expo)

This project is a **React Native (Expo)** port of your Vite TPM web app, following the same flows and a similar structure to your reference RN project.

## How to run

```bash
# 1) Install deps
npm i

# 2) Set your API URL (same as Vite's VITE_PUBLIC_API_BASE_URL)
#    Expo auto-reads EXPO_PUBLIC_* env vars at build time.
echo "EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com/api/v1" > .env

# 3) Start
npm run start
# then press 'a' to launch Android (or run: npm run android)
```

## Where to plug APIs

All endpoints are centralized in **src/services/api.js**. The base URL is read from
`Constants.expoConfig.extra.API_BASE_URL`, which is sourced from
`EXPO_PUBLIC_API_BASE_URL` defined in your `.env` (see above).

### Already wired from your web `services/api.js`

- `hr_location_get_parent_location()`
- `hr_location_get_location(locationId)`
- `change_asset_location({ assetId, locationId, remark })`
- `get_assets()` *(adjust the path if your web uses a different one)*
- `get_asset_details(assetId)`
- `get_acknowledgements(assetId)`
- `get_maintenance_requests()`
- `login({ email, password }) / logout()`

> You can keep adding functions here mirroring any other calls in your web `api.js`.

## Screens mapped from your web routes

- **/login** → `LoginScreen.js` (Auth stack)
- **/assets** → `AssetsScreen.js` (Tab)
- **/asset-details/:assetId** → `AssetDetailsScreen.js` (Stack)
- **/maintenance-requests** → `MaintenanceRequestsScreen.js` (Tab)
- **/transfer-asset** → `TransferAssetScreen.js` (Tab)
- **/update-process** → `UpdateProcessScreen.js` (Tab)
- **/profile** (not in web route; added for logout) → `ProfileScreen.js`

Role-based protections from the web's `RoleBasedRoute.jsx` can be re-created by reading `user.role` inside `useAuth()` and conditionally rendering screens or redirecting inside navigators.

## Styling

This project sticks to React Native `StyleSheet` (no extra UI kit), similar to your **reading-tracker-rn** style. If you want Tailwind-like utility classes, you can add `nativewind`, but it's optional.

## Notes

- **Assets** (icon/splash) are included to avoid Expo prebuild errors like missing `assets/icon.png`.
- **AsyncStorage** stores `auth_token` and `user`, mirroring your web `localStorage` use.
- Replace placeholder endpoint paths in `src/services/api.js` to match your API exactly.
- If your web API expects cookies instead of Bearer tokens, you can tweak the interceptor.
