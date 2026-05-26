import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useSubscription } from "@/lib/revenuecat";

interface CreditPurchase {
  id: string;
  credits: number;
  amountPaid: number;
  status: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const {
    offerings,
    purchase,
    isPurchasing,
    restore,
    isRestoring,
    isLoading: rcLoading,
  } = useSubscription();
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const { data: purchases } = useQuery<CreditPurchase[]>({
    queryKey: ["/api/credit-purchases"],
    enabled: !!user,
  });

  const currentOffering = offerings?.current;
  const availablePackages = currentOffering?.availablePackages ?? [];

  const handlePackagePress = (pkg: any) => {
    setSelectedPackage(pkg);
    setConfirmModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;
    setConfirmModalVisible(false);
    try {
      await purchase(selectedPackage);
      const productId = selectedPackage.product?.identifier || selectedPackage.identifier;
      try {
        await apiRequest("POST", "/api/credits/reconcile", { productId });
      } catch {}
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/credit-purchases"] });
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert("Purchase Failed", error.message || "Could not complete purchase");
      }
    }
    setSelectedPackage(null);
  };

  const handleRestore = async () => {
    try {
      await restore();
      await refreshUser();
      Alert.alert("Restored", "Your purchases have been restored.");
    } catch (error: any) {
      Alert.alert("Restore Failed", error.message || "Could not restore purchases");
    }
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
      <View style={styles.header}>
        <Ionicons name="person" size={22} color="#06b6d4" />
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 40 + (Platform.OS === "web" ? 34 : 0),
        }}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {user?.firstName
              ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
              : "User"}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || "No email"}</Text>
        </View>

        <View style={styles.creditCard}>
          <View style={styles.creditHeader}>
            <Ionicons name="diamond" size={20} color="#06b6d4" />
            <Text style={styles.creditTitle}>Search Credits</Text>
          </View>
          <Text style={styles.creditBalance} testID="text-credit-balance">
            {user?.creditBalance ?? 0}
          </Text>
          <Text style={styles.creditSubtitle}>Credits available</Text>
          <Text style={styles.creditNote}>
            Credits are used for property analyses and never expire
          </Text>
        </View>

        <View style={styles.purchaseSection}>
          <Text style={styles.sectionTitle}>Buy Credits</Text>
          {rcLoading ? (
            <ActivityIndicator size="large" color="#06b6d4" style={{ marginVertical: 20 }} />
          ) : availablePackages.length > 0 ? (
            availablePackages.map((pkg: any, index: number) => {
              const price = pkg.product?.priceString || "N/A";
              const title = pkg.product?.title || pkg.identifier || "Credit Package";
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, index === 1 && styles.packageCardPopular]}
                  onPress={() => handlePackagePress(pkg)}
                  disabled={isPurchasing}
                  testID={`button-purchase-${pkg.identifier}`}
                >
                  {index === 1 && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Best Value</Text>
                    </View>
                  )}
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{title}</Text>
                    <Text style={styles.packageCredits}>{pkg.product?.description || ""}</Text>
                  </View>
                  <View style={styles.packageRight}>
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color="#06b6d4" />
                    ) : (
                      <Text style={styles.packagePrice}>{price}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noPackagesText}>
              No credit packages available at this time.
            </Text>
          )}

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
            testID="button-restore-purchases"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color="#06b6d4" />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </View>

        {purchases && purchases.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Purchase History</Text>
            {purchases.map((p) => (
              <View key={p.id} style={styles.purchaseItem} testID={`purchase-${p.id}`}>
                <View style={styles.purchaseLeft}>
                  <Text style={styles.purchaseCredits}>{p.credits} credits</Text>
                  <Text style={styles.purchaseDate}>
                    {new Date(p.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
                <Text style={styles.purchaseAmount}>
                  ${(p.amountPaid / 100).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="button-logout"
        >
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Purchase</Text>
            <Text style={styles.modalText}>
              Purchase {selectedPackage?.product?.title || "this package"} for{" "}
              {selectedPackage?.product?.priceString || "N/A"}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setConfirmModalVisible(false);
                  setSelectedPackage(null);
                }}
                testID="button-cancel-purchase"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleConfirmPurchase}
                testID="button-confirm-purchase"
              >
                <Text style={styles.modalConfirmText}>Purchase</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f1e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#06b6d4" + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#06b6d4",
  },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  creditCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  creditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  creditTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  creditBalance: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#06b6d4",
    marginBottom: 4,
  },
  creditSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#94a3b8",
    marginBottom: 8,
  },
  creditNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
  },
  purchaseSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 12,
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  packageCardPopular: {
    borderColor: "#06b6d4",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    right: 12,
    backgroundColor: "#06b6d4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 2,
  },
  packageCredits: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#06b6d4",
    marginBottom: 2,
  },
  packageRight: {
    alignItems: "flex-end",
    marginLeft: 16,
  },
  packagePrice: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
  },
  noPackagesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    textAlign: "center",
    paddingVertical: 20,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#06b6d4",
  },
  historySection: {
    marginBottom: 16,
  },
  purchaseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  purchaseLeft: {
    flex: 1,
  },
  purchaseCredits: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  purchaseDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginTop: 2,
  },
  purchaseAmount: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#22c55e",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    marginBottom: 24,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#94a3b8",
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: "#06b6d4",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
});
