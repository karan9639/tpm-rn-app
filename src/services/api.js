// src/services/api.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// ---- Base URL (no trailing slash) ----
const RAW_BASE =
  (Constants?.expoConfig?.extra?.API_BASE_URL ??
    Constants?.manifest2?.extra?.extra?.API_BASE_URL ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    "") + "";

const BASE =
  (RAW_BASE && RAW_BASE.replace(/\/$/, "")) ||
  "https://tpm-mobile-mhhd.onrender.com/api/v1";
console.log("API Base URL:", BASE);

// ---- Axios instance ----
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
  return res.data; // { success, data, ... }
}

export async function setAuthToken(token) {
  if (token) await AsyncStorage.setItem("auth_token", token);
}
export async function clearAuthToken() {
  await AsyncStorage.removeItem("auth_token");
}

// ===== AUTH =====
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

// ===== ASSETS =====
export const get_assets = () => apiFetch("/asset/assets");
export const get_asset_details = (assetId) =>
  apiFetch(`/asset/asset/${assetId}`);
export const get_asset_counting = () =>
  apiFetch("/asset/assets-counting-with-category");

// ===== HR / LOCATION / TRANSFER =====
export const hr_location_get_parent_location = () =>
  apiFetch("/user/hr/location/get-parent-location");
export const hr_location_get_location = (locationId) =>
  apiFetch(`/user/hr/location/get-location/${locationId}`);
export const change_asset_location = ({ assetId, locationId, remark }) =>
  apiFetch(`/asset/change-asset-location/${assetId}`, {
    method: "PATCH",
    body: { locationId, remark },
  });

// ===== USERS =====
export const get_all_employees = () => apiFetch("/user/hr/employee/employees");
export const get_mechanics = () => apiFetch("/user/hr/employee/employees");

// ===== MAINTENANCE =====
export const get_all_requests_with_mechanic = () =>
  apiFetch("/asset/maintenance-request-assigned-mechanics");
export const get_all_maintenance_requests = () =>
  apiFetch("/asset/asset-maintenance-requests");
export const get_assets_with_mechanics = () =>
  apiFetch("/asset/assets-with-mechanics");
export const get_acknowledgements = (assetId) =>
  apiFetch(`/asset/acknowledgements/${assetId}`);
export const get_my_assigned_maintenances = () =>
  apiFetch("/asset/maintenances-assigned-to-me");
export const create_maintenance_request = (assetId, data) =>
  apiFetch(`/asset/raise-maintenance-request/${assetId}`, {
    method: "POST",
    body: data,
  });
export const assign_mechanic = (assetId, mechanicId) =>
  apiFetch("/asset/assign-maintenance-mechanic", {
    method: "POST",
    body: { assetId, mechanicId },
  });
export const close_maintenance_request = (assetId) =>
  apiFetch(`/asset/close-maintenance-request/${assetId}`, { method: "PATCH" });
export const send_maintenance_acknowledgement = (data) =>
  apiFetch("/asset/send-acknowledgement", { method: "POST", body: data });
export const submit_production_satisfaction = (assetId, data) =>
  apiFetch(`/asset/is-production-satisfied-by-mechanic/${assetId}`, {
    method: "PATCH",
    body: data,
  });

// ===== SPARES =====
export const get_available_spares = () => apiFetch("/asset/asset-spares");
export const add_spare_part = (data) =>
  apiFetch("/asset/add-asset-spare", { method: "POST", body: data });
