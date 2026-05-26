import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";

type ScoringMode = "homebuyer" | "investor";

const HOMEBUYER_WEIGHTS: Record<string, number> = {
  "Market Strength": 0.25,
  "Demographic Trends": 0.2,
  "School Quality": 0.2,
  "Safety Score": 0.15,
  "Walkability": 0.1,
  "Rental Potential": 0.1,
};

const INVESTOR_WEIGHTS: Record<string, number> = {
  "Market Strength": 0.3,
  "Rental Potential": 0.25,
  "Demographic Trends": 0.2,
  "Safety Score": 0.1,
  "Walkability": 0.1,
  "School Quality": 0.05,
};

interface ScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
  reasoning?: { factor: string; detail: string; impact: string }[];
}

interface AnalysisResult {
  address: string;
  zipCode: string;
  score: number;
  scoreBreakdown: ScoreBreakdownItem[];
  investmentAnalysis?: {
    shortTermOutlook?: string;
    longTermOutlook?: string;
    pros?: string[];
    cons?: string[];
  };
  demographics?: any;
  walkability?: any;
  marketData?: any;
  apiStatus: Record<string, string>;
}

function computeModeScore(
  components: ScoreBreakdownItem[],
  weights: Record<string, number>
): number {
  let total = 0;
  let totalWeight = 0;
  for (const c of components) {
    const w = weights[c.label] ?? c.weight;
    total += c.score * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return parseFloat((total / totalWeight).toFixed(1));
}

function getWeightedComponents(
  components: ScoreBreakdownItem[],
  weights: Record<string, number>
): (ScoreBreakdownItem & { displayWeight: number })[] {
  return components.map((c) => ({
    ...c,
    displayWeight: weights[c.label] ?? c.weight,
  }));
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<ScoringMode>("homebuyer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!address.trim()) {
      Alert.alert("Error", "Please enter a property address");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await apiRequest("POST", "/api/analyze", { address: address.trim() });
      setResult(data);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["/api/search-history"] });
    } catch (error: any) {
      if (error.message?.includes("Insufficient credits") || error.message?.includes("credits")) {
        Alert.alert("Insufficient Credits", "You need more credits to analyze properties.");
      } else {
        Alert.alert("Analysis Failed", error.message || "Please try again");
      }
    } finally {
      setLoading(false);
    }
  }, [address, refreshUser]);

  const activeWeights = mode === "homebuyer" ? HOMEBUYER_WEIGHTS : INVESTOR_WEIGHTS;

  const displayScore = useMemo(() => {
    if (!result?.scoreBreakdown) return result?.score ?? 0;
    return computeModeScore(result.scoreBreakdown, activeWeights);
  }, [result, activeWeights]);

  const weightedComponents = useMemo(() => {
    if (!result?.scoreBreakdown) return [];
    return getWeightedComponents(result.scoreBreakdown, activeWeights);
  }, [result, activeWeights]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return "#22c55e";
    if (score >= 6) return "#06b6d4";
    if (score >= 4) return "#eab308";
    return "#ef4444";
  };

  const getScoreLabel = (score: number) => {
    if (mode === "homebuyer") {
      if (score >= 8) return "Excellent Place to Live";
      if (score >= 6) return "Great Place to Live";
      if (score >= 4) return "Decent Place to Live";
      return "Below Average";
    }
    if (score >= 8) return "Strong Investment";
    if (score >= 6) return "Good Investment";
    if (score >= 4) return "Moderate Investment";
    return "Weak Investment";
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + webTopPadding }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ScoreCasa</Text>
        <View style={styles.creditBadge} testID="badge-credits">
          <Ionicons name="diamond" size={14} color="#06b6d4" />
          <Text style={styles.creditText}>{user?.creditBalance ?? 0}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20 + (Platform.OS === "web" ? 34 : 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Property Analysis</Text>
          <Text style={styles.sectionSubtitle}>
            Enter a US property address with ZIP code
          </Text>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "homebuyer" && styles.modeBtnActive]}
              onPress={() => setMode("homebuyer")}
              testID="button-mode-homebuyer"
            >
              <Ionicons
                name="home"
                size={16}
                color={mode === "homebuyer" ? "#ffffff" : "#64748b"}
              />
              <Text
                style={[styles.modeBtnText, mode === "homebuyer" && styles.modeBtnTextActive]}
              >
                Homebuyer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "investor" && styles.modeBtnActive]}
              onPress={() => setMode("investor")}
              testID="button-mode-investor"
            >
              <Ionicons
                name="trending-up"
                size={16}
                color={mode === "investor" ? "#ffffff" : "#64748b"}
              />
              <Text
                style={[styles.modeBtnText, mode === "investor" && styles.modeBtnTextActive]}
              >
                Investor
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, City, State 12345"
              placeholderTextColor="#4b5563"
              returnKeyType="search"
              onSubmitEditing={handleAnalyze}
              testID="input-address"
            />
            <TouchableOpacity
              style={[styles.searchButton, loading && styles.buttonDisabled]}
              onPress={handleAnalyze}
              disabled={loading}
              testID="button-analyze"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Analyzing property...</Text>
            <Text style={styles.loadingSubtext}>
              Fetching Census, walkability, market data...
            </Text>
          </View>
        )}

        {result && (
          <View style={styles.resultsSection}>
            <View style={styles.scoreCard}>
              <Text style={styles.addressText}>{result.address}</Text>
              <View style={styles.scoreRow}>
                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(displayScore) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreValue,
                      { color: getScoreColor(displayScore) },
                    ]}
                  >
                    {displayScore.toFixed(1)}
                  </Text>
                  <Text style={styles.scoreOutOf}>/10</Text>
                </View>
                <Text style={styles.scoreLabel}>{getScoreLabel(displayScore)}</Text>
              </View>
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  {mode === "homebuyer" ? "Homebuyer" : "Investor"} Scoring
                </Text>
              </View>
            </View>

            {weightedComponents.map((component) => (
              <View key={component.label} style={styles.componentCard}>
                <View style={styles.componentHeader}>
                  <View style={styles.componentNameRow}>
                    <Text style={styles.componentName}>{component.label}</Text>
                    <Text style={styles.componentWeight}>
                      {(component.displayWeight * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.componentScore,
                      { color: getScoreColor(component.score) },
                    ]}
                  >
                    {component.score.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(component.score / 10) * 100}%`,
                        backgroundColor: getScoreColor(component.score),
                      },
                    ]}
                  />
                </View>
                {component.reasoning && component.reasoning.length > 0 ? (
                  <Text style={styles.componentDesc}>
                    {component.reasoning.map((r) => r.detail).join(". ")}
                  </Text>
                ) : null}
              </View>
            ))}

            {result.investmentAnalysis?.shortTermOutlook && (
              <View style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="analytics" size={18} color="#06b6d4" />
                  <Text style={styles.analysisTitle}>Short-Term Outlook</Text>
                </View>
                <Text style={styles.analysisText}>
                  {result.investmentAnalysis.shortTermOutlook}
                </Text>
              </View>
            )}

            {result.investmentAnalysis?.longTermOutlook && (
              <View style={styles.analysisCard}>
                <View style={styles.analysisHeader}>
                  <Ionicons name="telescope" size={18} color="#a78bfa" />
                  <Text style={styles.analysisTitle}>Long-Term Outlook</Text>
                </View>
                <Text style={styles.analysisText}>
                  {result.investmentAnalysis.longTermOutlook}
                </Text>
              </View>
            )}

            {result.investmentAnalysis?.pros && result.investmentAnalysis.pros.length > 0 && (
              <View style={styles.prosConsCard}>
                <Text style={styles.prosTitle}>Strengths</Text>
                {result.investmentAnalysis.pros.map((pro, i) => (
                  <View key={i} style={styles.prosItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.prosText}>{pro}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.investmentAnalysis?.cons && result.investmentAnalysis.cons.length > 0 && (
              <View style={styles.prosConsCard}>
                <Text style={styles.consTitle}>Considerations</Text>
                {result.investmentAnalysis.cons.map((con, i) => (
                  <View key={i} style={styles.prosItem}>
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text style={styles.prosText}>{con}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {!loading && !result && (
          <View style={styles.emptyState}>
            <Ionicons name="home" size={48} color="#1e293b" />
            <Text style={styles.emptyTitle}>Enter an address to start</Text>
            <Text style={styles.emptySubtitle}>
              Get comprehensive property scores powered by real Census, walkability,
              and market data
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0f1e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#06b6d4",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#06b6d4" + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  creditText: {
    color: "#06b6d4",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    flex: 1,
  },
  searchSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: "#06b6d4",
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
  },
  modeBtnTextActive: {
    color: "#ffffff",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchButton: {
    backgroundColor: "#06b6d4",
    borderRadius: 8,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingCard: {
    margin: 20,
    padding: 32,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    textAlign: "center",
  },
  resultsSection: {
    paddingHorizontal: 20,
    gap: 12,
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
  scoreRow: {
    alignItems: "center",
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
  scoreLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#94a3b8",
    marginTop: 8,
  },
  modeBadge: {
    marginTop: 12,
    backgroundColor: "#06b6d4" + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#06b6d4",
  },
  componentCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  componentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  componentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  componentName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  componentWeight: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  componentScore: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  componentDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    lineHeight: 18,
  },
  analysisCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  analysisTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  analysisText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 22,
  },
  prosConsCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  prosTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#22c55e",
    marginBottom: 10,
  },
  consTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ef4444",
    marginBottom: 10,
  },
  prosItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  prosText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
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
    lineHeight: 20,
  },
});
