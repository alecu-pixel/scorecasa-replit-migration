import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";

interface HistoryItem {
  id: string;
  address: string;
  zipCode: string | null;
  score: number | null;
  fromCache: boolean;
  createdAt: string | null;
  hasFullResult: boolean;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: history, isLoading, refetch } = useQuery<HistoryItem[]>({
    queryKey: ["/api/search-history"],
  });

  const loadAnalysis = useCallback(async (item: HistoryItem) => {
    if (!item.hasFullResult) {
      Alert.alert("Not Available", "Full analysis data is not available for this search.");
      return;
    }
    setLoadingId(item.id);
    try {
      const data = await apiRequest("GET", `/api/search-history/${item.id}`);
      setSelectedResult(data.result);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Could not load analysis");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e";
    if (score >= 6) return "#06b6d4";
    if (score >= 4) return "#eab308";
    return "#ef4444";
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  if (selectedResult) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSelectedResult(null)}
            style={styles.backButton}
            testID="button-back"
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedResult.address}
          </Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20 + (Platform.OS === "web" ? 34 : 0),
            paddingHorizontal: 20,
            gap: 12,
          }}
        >
          <View style={styles.scoreCard}>
            <Text style={styles.addressText}>{selectedResult.address}</Text>
            <View
              style={[
                styles.scoreBadge,
                { backgroundColor: getScoreColor(selectedResult.score) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  { color: getScoreColor(selectedResult.score) },
                ]}
              >
                {selectedResult.score?.toFixed(1)}
              </Text>
              <Text style={styles.scoreOutOf}>/10</Text>
            </View>
          </View>

          {selectedResult.scoreBreakdown?.map((c: any) => (
            <View key={c.label} style={styles.componentCard}>
              <View style={styles.componentRow}>
                <Text style={styles.componentName}>{c.label}</Text>
                <Text style={[styles.componentScore, { color: getScoreColor(c.score) }]}>
                  {c.score.toFixed(1)}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(c.score / 10) * 100}%`,
                      backgroundColor: getScoreColor(c.score),
                    },
                  ]}
                />
              </View>
            </View>
          ))}

          {selectedResult.investmentAnalysis?.shortTermOutlook && (
            <View style={styles.textCard}>
              <Text style={styles.cardTitle}>Short-Term Outlook</Text>
              <Text style={styles.cardText}>
                {selectedResult.investmentAnalysis.shortTermOutlook}
              </Text>
            </View>
          )}

          {selectedResult.investmentAnalysis?.longTermOutlook && (
            <View style={styles.textCard}>
              <Text style={styles.cardTitle}>Long-Term Outlook</Text>
              <Text style={styles.cardText}>
                {selectedResult.investmentAnalysis.longTermOutlook}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
      <View style={styles.header}>
        <Ionicons name="time" size={22} color="#06b6d4" />
        <Text style={styles.headerTitle}>Search History</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#06b6d4" />
        </View>
      ) : !history || history.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search" size={48} color="#1e293b" />
          <Text style={styles.emptyTitle}>No searches yet</Text>
          <Text style={styles.emptySubtitle}>
            Analyze a property to see your history here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          scrollEnabled={history.length > 0}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#06b6d4" />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 20 + (Platform.OS === "web" ? 34 : 0),
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => loadAnalysis(item)}
              disabled={loadingId === item.id}
              testID={`history-item-${item.id}`}
            >
              <View style={styles.historyContent}>
                <Text style={styles.historyAddress} numberOfLines={2}>
                  {item.address}
                </Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyDate}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Unknown date"}
                  </Text>
                  {item.fromCache && (
                    <View style={styles.cacheBadge}>
                      <Text style={styles.cacheBadgeText}>Cached</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.historyRight}>
                {item.score !== null ? (
                  <View
                    style={[
                      styles.historyScoreBadge,
                      { backgroundColor: getScoreColor(item.score) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyScoreText,
                        { color: getScoreColor(item.score) },
                      ]}
                    >
                      {item.score}
                    </Text>
                  </View>
                ) : null}
                {loadingId === item.id ? (
                  <ActivityIndicator size="small" color="#06b6d4" />
                ) : item.hasFullResult ? (
                  <Ionicons name="chevron-forward" size={18} color="#64748b" />
                ) : (
                  <Ionicons name="lock-closed" size={14} color="#475569" />
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
    flex: 1,
  },
  backButton: {
    marginRight: 4,
  },
  scroll: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#475569",
    textAlign: "center",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  historyContent: {
    flex: 1,
  },
  historyAddress: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  cacheBadge: {
    backgroundColor: "#06b6d4" + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cacheBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#06b6d4",
  },
  historyRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 12,
  },
  historyScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyScoreText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  scoreCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  addressText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#94a3b8",
    marginBottom: 16,
    textAlign: "center",
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
  },
  scoreOutOf: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginLeft: 2,
  },
  componentCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  componentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  componentName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  componentScore: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  textCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 22,
  },
});
