import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import AssetScreen from "../screens/AssetScreen";
import AssetDetailsScreen from "../screens/AssetDetailsScreen";
import TransferAssetScreen from "../screens/TransferAssetScreen";
import MaintenanceRequestsScreen from "../screens/MaintenanceRequestsScreen";
import UpdateProcessScreen from "../screens/UpdateProcessScreen";
import AcknowledgementsScreen from "../screens/AcknowledgementsScreen";
import UnauthorizedScreen from "../screens/UnauthorizedScreen";
import RequestMaintenanceScreen from "../screens/RequestMaintenanceScreen";
import QRScanScreen from "../screens/QRScanScreen";
import QRDetailsScreen from "../screens/QRDetailsScreen";

const Stack = createNativeStackNavigator();

const RoleBasedGuard = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  return allowedRoles.map((r) => r.toLowerCase()).includes(role) ? (
    children
  ) : (
    <UnauthorizedScreen />
  );
};

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: "center" }}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: "Dashboard" }}
          />
          <Stack.Screen
            name="Assets"
            component={AssetScreen}
            options={{ title: "Assets" }}
          />
          <Stack.Screen
            name="AssetDetails"
            component={AssetDetailsScreen}
            options={{ title: "Asset Details" }}
          />

          {/* Transfer -> production + supervisor */}
          <Stack.Screen
            name="TransferAsset"
            options={{ title: "Transfer Asset" }}
          >
            {(props) => (
              <RoleBasedGuard allowedRoles={["production", "supervisor"]}>
                <TransferAssetScreen {...props} />
              </RoleBasedGuard>
            )}
          </Stack.Screen>

          <Stack.Screen
            name="RequestMaintenance"
            component={RequestMaintenanceScreen}
            options={{ title: "Request Maintenance" }}
          />
          <Stack.Screen
            name="MaintenanceRequests"
            component={MaintenanceRequestsScreen}
            options={{ title: "Maintenance Requests" }}
          />

          {/* Update Process -> mechanic only */}
          <Stack.Screen
            name="UpdateProcess"
            options={{ title: "Update Process" }}
          >
            {(props) => (
              <RoleBasedGuard allowedRoles={["mechanic"]}>
                <UpdateProcessScreen {...props} />
              </RoleBasedGuard>
            )}
          </Stack.Screen>

          {/* Acknowledgements -> supervisor only */}
          <Stack.Screen
            name="Acknowledgements"
            options={{ title: "Acknowledgements" }}
          >
            {(props) => (
              <RoleBasedGuard allowedRoles={["supervisor"]}>
                <AcknowledgementsScreen {...props} />
              </RoleBasedGuard>
            )}
          </Stack.Screen>

          {/* QR routes -> mechanic + production */}
          <Stack.Screen name="QRScan" options={{ title: "Scan QR Code" }}>
            {(props) => (
              <RoleBasedGuard allowedRoles={["mechanic", "production"]}>
                <QRScanScreen {...props} />
              </RoleBasedGuard>
            )}
          </Stack.Screen>

          <Stack.Screen name="QRDetails" options={{ title: "QR Details" }}>
            {(props) => (
              <RoleBasedGuard allowedRoles={["mechanic", "production"]}>
                <QRDetailsScreen {...props} />
              </RoleBasedGuard>
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Unauthorized"
            component={UnauthorizedScreen}
            options={{ title: "Unauthorized" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
