// src/services/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

/* -------------------------
   Base URL (no trailing slash)
-------------------------- */
const RAW_BASE =
  (Constants?.expoConfig?.extra?.API_BASE_URL ??
    Constants?.manifest2?.extra?.extra?.API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "") + "";

const BASE = (RAW_BASE && RAW_BASE.replace(/\/$/, "")) || ""; // keep empty to enforce fatal in prod

if (!BASE) {
  const msg =
    "FATAL ERROR: API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL (or expo.extra.API_BASE_URL).";
  // In RN we can't write to document.body, so fail loudly:
  console.error(msg);
  if (!__DEV__) throw new Error(msg);
}
console.log("API Base URL:", BASE);

/* -------------------------
   Axios instance
-------------------------- */
const instance = axios.create({ baseURL: BASE, timeout: 25_000 });

instance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isFormData =
    config.data &&
    typeof config.data === "object" &&
    typeof config.data.append === "function";

  if (!isFormData) config.headers["Content-Type"] = "application/json";
  config.headers.Accept = "application/json";
  // include cookies only if your backend needs it; RN fetch cookies differ from web.
  // axios default for RN does not send cookies; keeping bearer token above.
  return config;
});

instance.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Network error, please try again.";
    return Promise.reject(new Error(msg));
  }
);

function normalizeBody(body) {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

export async function apiFetch(endpoint, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const data = normalizeBody(options.body);
  const res = await instance.request({
    url: endpoint,
    method,
    data: method === "GET" ? undefined : data,
    params: options.params,
    headers: options.headers,
  });
  // backend returns: { success, data, message, ... }
  return res.data;
}

/* -------------------------
   Auth helpers (token)
-------------------------- */
export async function setAuthToken(token) {
  if (token) await AsyncStorage.setItem("auth_token", token);
}
export async function clearAuthToken() {
  await AsyncStorage.removeItem("auth_token");
}

/* =========================
   AUTH
========================= */
export async function login({ email, password }) {
  const env = await apiFetch("/employee/login", {
    method: "POST",
    body: { email, password },
  });
  if (env?.token) await setAuthToken(env.token);
  return env;
}
export async function logout() {
  try {
    await apiFetch("/employee/logout", { method: "POST" });
  } catch {}
  await clearAuthToken();
}
export const get_current_user = () => apiFetch("/user/hr/employee/employees");

/* =========================
   ASSETS
========================= */
export const getAllAssets = () => apiFetch("/asset/assets");

export const getAssetById = (assetId) =>
  apiFetch(`/asset/asset/${encodeURIComponent(assetId)}`);

export const getAssetCounting = () =>
  apiFetch("/asset/assets-counting-with-category");

// Back-compat aliases
export const get_assets = getAllAssets;
export const get_asset_details = getAssetById;
export const get_asset_counting = getAssetCounting;

// Web-parity wrapper
export const assetAPI = {
  getAllAssets,
  getAssetById,
  getAssetCounting,
};

/* =========================
   HR / LOCATION / TRANSFER
========================= */
export const hr_location_get_parent_location = () =>
  apiFetch("/user/hr/location/get-parent-location");

export const hr_location_get_location = (locationId) =>
  apiFetch(`/user/hr/location/get-location/${locationId}`);

export const change_asset_location = ({ assetId, locationId, remark }) =>
  apiFetch(`/asset/change-asset-location/${assetId}`, {
    method: "PATCH",
    body: { locationId, remark }, // matches web (remark)
  });

/* =========================
   USERS
========================= */
export const get_all_employees = () => apiFetch("/user/hr/employee/employees");
export const get_mechanics = () => apiFetch("/user/hr/employee/employees"); // filter client-side if needed

export const userAPI = {
  getAllEmployees: () => get_all_employees(),
};

// Robust user-by-id (try a couple, then fallback to list+find)
export const get_user = async (userId) => {
  const id = encodeURIComponent(userId);
  try {
    return await apiFetch(`/user/hr/employee/${id}`);
  } catch (_) {
    try {
      return await apiFetch(`/user/employee/${id}`);
    } catch (_) {
      const list = await get_all_employees();
      const found = Array.isArray(list?.data)
        ? list.data.find((u) => u?._id === userId)
        : null;
      return {
        success: !!found,
        data: found || null,
        message: found ? "OK" : "User not found",
      };
    }
  }
};

/* =========================
   MAINTENANCE
========================= */
export const get_all_requests_with_mechanic = () =>
  apiFetch("/asset/maintenance-request-assigned-mechanics");

export const get_all_maintenance_requests = () =>
  apiFetch("/asset/asset-maintenance-requests");

export const get_assets_with_mechanics = () =>
  apiFetch("/asset/assets-with-mechanics");

// Supervisor (legacy) acknowledgements
export const get_acknowledgements = (assetId) =>
  apiFetch(`/asset/acknowledgements/${encodeURIComponent(assetId)}`);

// Production/Mechanic acknowledgements (web parity naming)
export const get_production_acknowledgements = (assetId) =>
  apiFetch(`/asset/production-acknowledgements/${encodeURIComponent(assetId)}`);

export const get_my_assigned_maintenances = () =>
  apiFetch("/asset/maintenances-assigned-to-me");

export const create_maintenance_request = (assetId, data) =>
  apiFetch(`/asset/raise-maintenance-request/${encodeURIComponent(assetId)}`, {
    method: "POST",
    body: data, // object OK; apiFetch normalizes
  });

export const assign_mechanic = (assetId, mechanicId) =>
  apiFetch("/asset/assign-maintenance-mechanic", {
    method: "POST",
    body: { assetId, mechanicId },
  });

export const close_maintenance_request = (assetId) =>
  apiFetch(`/asset/close-maintenance-request/${encodeURIComponent(assetId)}`, {
    method: "PATCH",
  });

// mechanics submit their step-wise acknowledgement
export const send_maintenance_acknowledgement = (data) =>
  apiFetch("/asset/send-acknowledgement", { method: "POST", body: data });

// mechanic marks production satisfied
export const submit_production_satisfaction = (assetId, data) =>
  apiFetch(
    `/asset/is-production-satisfied-by-mechanic/${encodeURIComponent(assetId)}`,
    {
      method: "PATCH",
      body: data,
    }
  );

/* =========================
   SPARES
========================= */
export const get_available_spares = () => apiFetch("/asset/asset-spares");
export const add_spare_part = (data) =>
  apiFetch("/asset/add-asset-spare", { method: "POST", body: data });

/* =========================
   NAME HELPERS (for UI ID -> name)
========================= */
export const get_asset = (assetId) => getAssetById(assetId);

/* =========================
   WRAPPERS: web-style parity
========================= */
export const sparePartsAPI = {
  getAvailableParts: () => get_available_spares(),
};

export const maintenanceAPI = {
  // web parity names
  getAllRequestsWithMechanic: () => get_all_requests_with_mechanic(),
  getAllMaintenanceRequests: () => get_all_maintenance_requests(),
  getAssetsWithMechanics: () => get_assets_with_mechanics(),

  getAcknowledgementsByAssetId: (assetId) => get_acknowledgements(assetId),
  // web code calls it "getProductionSatisfactionByAssetId" but endpoint returns acknowledgements
  getProductionSatisfactionByAssetId: (assetId) =>
    get_production_acknowledgements(assetId),

  getMyAssignedMaintenances: () => get_my_assigned_maintenances(),
  createRequest: (assetId, requestData) =>
    create_maintenance_request(assetId, requestData),

  assignMechanic: (assetId, mechanicId) => assign_mechanic(assetId, mechanicId),
  closeMaintenanceRequest: (assetId) => close_maintenance_request(assetId),

  sendAcknowledgement: (payload) => send_maintenance_acknowledgement(payload),
  submitProductionSatisfaction: (assetId, data) =>
    submit_production_satisfaction(assetId, data),
};

/* =========================
   Aliases (back-compat)
========================= */
export const getAvailableParts = () => get_available_spares();
export const sendAcknowledgement = (payload) =>
  send_maintenance_acknowledgement(payload);
export const send_acknowledgement = (payload) =>
  send_maintenance_acknowledgement(payload);
export const assignMechanic = (assetId, mechanicId) =>
  assign_mechanic(assetId, mechanicId);
