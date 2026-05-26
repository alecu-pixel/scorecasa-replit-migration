import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type CalculatorType = "mortgage" | "arv" | "rehab" | "capitalGains" | "exchange1031";

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState("300000");
  const [downPayment, setDownPayment] = useState("60000");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");

  const principal = Number(homePrice) - Number(downPayment);
  const monthlyRate = Number(rate) / 100 / 12;
  const numPayments = Number(term) * 12;
  const monthly =
    monthlyRate > 0
      ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : principal / numPayments;
  const totalPaid = monthly * numPayments;
  const totalInterest = totalPaid - principal;

  return (
    <View style={styles.calcCard}>
      <InputRow label="Home Price" value={homePrice} onChange={setHomePrice} prefix="$" testID="input-home-price" />
      <InputRow label="Down Payment" value={downPayment} onChange={setDownPayment} prefix="$" testID="input-down-payment" />
      <InputRow label="Interest Rate" value={rate} onChange={setRate} suffix="%" testID="input-rate" />
      <InputRow label="Loan Term" value={term} onChange={setTerm} suffix="yrs" testID="input-term" />
      <View style={styles.resultSection}>
        <ResultRow label="Monthly Payment" value={formatCurrency(monthly || 0)} highlight />
        <ResultRow label="Loan Amount" value={formatCurrency(principal)} />
        <ResultRow label="Total Interest" value={formatCurrency(totalInterest > 0 ? totalInterest : 0)} />
        <ResultRow label="Total Paid" value={formatCurrency(totalPaid > 0 ? totalPaid : 0)} />
      </View>
    </View>
  );
}

function ArvCalculator() {
  const [purchasePrice, setPurchasePrice] = useState("200000");
  const [rehabCost, setRehabCost] = useState("50000");
  const [arv, setArv] = useState("320000");

  const totalInvestment = Number(purchasePrice) + Number(rehabCost);
  const profit = Number(arv) - totalInvestment;
  const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
  const seventyRule = Number(arv) * 0.7 - Number(rehabCost);

  return (
    <View style={styles.calcCard}>
      <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" testID="input-purchase-price" />
      <InputRow label="Rehab Cost" value={rehabCost} onChange={setRehabCost} prefix="$" testID="input-rehab-cost" />
      <InputRow label="After Repair Value" value={arv} onChange={setArv} prefix="$" testID="input-arv" />
      <View style={styles.resultSection}>
        <ResultRow label="Total Investment" value={formatCurrency(totalInvestment)} />
        <ResultRow label="Estimated Profit" value={formatCurrency(profit)} highlight />
        <ResultRow label="ROI" value={`${roi.toFixed(1)}%`} />
        <ResultRow label="70% Rule Max Offer" value={formatCurrency(seventyRule)} />
      </View>
    </View>
  );
}

function RehabEstimator() {
  const [sqft, setSqft] = useState("1500");
  const [level, setLevel] = useState<"cosmetic" | "moderate" | "full">("moderate");

  const costPerSqft = level === "cosmetic" ? 15 : level === "moderate" ? 35 : 75;
  const total = Number(sqft) * costPerSqft;

  return (
    <View style={styles.calcCard}>
      <InputRow label="Square Footage" value={sqft} onChange={setSqft} suffix="sqft" testID="input-sqft" />
      <Text style={styles.inputLabel}>Rehab Level</Text>
      <View style={styles.segmentControl}>
        {(["cosmetic", "moderate", "full"] as const).map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.segmentBtn, level === l && styles.segmentBtnActive]}
            onPress={() => setLevel(l)}
            testID={`button-level-${l}`}
          >
            <Text style={[styles.segmentText, level === l && styles.segmentTextActive]}>
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.resultSection}>
        <ResultRow label="Cost per sqft" value={formatCurrency(costPerSqft)} />
        <ResultRow label="Estimated Total" value={formatCurrency(total)} highlight />
      </View>
    </View>
  );
}

function CapitalGainsCalculator() {
  const [purchasePrice, setPurchasePrice] = useState("250000");
  const [salePrice, setSalePrice] = useState("400000");
  const [yearsOwned, setYearsOwned] = useState("3");
  const [filingStatus, setFilingStatus] = useState<"single" | "married">("single");

  const gain = Number(salePrice) - Number(purchasePrice);
  const exclusion = Number(yearsOwned) >= 2 ? (filingStatus === "married" ? 500000 : 250000) : 0;
  const taxableGain = Math.max(0, gain - exclusion);
  const longTerm = Number(yearsOwned) >= 1;
  const taxRate = longTerm ? 0.15 : 0.22;
  const estimatedTax = taxableGain * taxRate;

  return (
    <View style={styles.calcCard}>
      <InputRow label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" testID="input-purchase" />
      <InputRow label="Sale Price" value={salePrice} onChange={setSalePrice} prefix="$" testID="input-sale" />
      <InputRow label="Years Owned" value={yearsOwned} onChange={setYearsOwned} suffix="yrs" testID="input-years" />
      <Text style={styles.inputLabel}>Filing Status</Text>
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, filingStatus === "single" && styles.segmentBtnActive]}
          onPress={() => setFilingStatus("single")}
          testID="button-filing-single"
        >
          <Text style={[styles.segmentText, filingStatus === "single" && styles.segmentTextActive]}>
            Single
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, filingStatus === "married" && styles.segmentBtnActive]}
          onPress={() => setFilingStatus("married")}
          testID="button-filing-married"
        >
          <Text style={[styles.segmentText, filingStatus === "married" && styles.segmentTextActive]}>
            Married
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.resultSection}>
        <ResultRow label="Total Gain" value={formatCurrency(gain)} />
        <ResultRow label="Exclusion" value={formatCurrency(exclusion)} />
        <ResultRow label="Taxable Gain" value={formatCurrency(taxableGain)} />
        <ResultRow label="Est. Tax" value={formatCurrency(estimatedTax)} highlight />
      </View>
    </View>
  );
}

function Exchange1031Calculator() {
  const [salePrice, setSalePrice] = useState("500000");
  const [originalPrice, setOriginalPrice] = useState("300000");
  const [replacementPrice, setReplacementPrice] = useState("600000");

  const gain = Number(salePrice) - Number(originalPrice);
  const deferredGain = Math.min(gain, Number(replacementPrice) > Number(salePrice) ? gain : Number(replacementPrice) - Number(originalPrice));
  const taxSaved = Math.max(0, deferredGain) * 0.15;
  const bootReceived = Math.max(0, Number(salePrice) - Number(replacementPrice));

  return (
    <View style={styles.calcCard}>
      <InputRow label="Sale Price" value={salePrice} onChange={setSalePrice} prefix="$" testID="input-1031-sale" />
      <InputRow label="Original Purchase" value={originalPrice} onChange={setOriginalPrice} prefix="$" testID="input-1031-purchase" />
      <InputRow label="Replacement Property" value={replacementPrice} onChange={setReplacementPrice} prefix="$" testID="input-1031-replacement" />
      <View style={styles.resultSection}>
        <ResultRow label="Capital Gain" value={formatCurrency(gain > 0 ? gain : 0)} />
        <ResultRow label="Deferred Gain" value={formatCurrency(deferredGain > 0 ? deferredGain : 0)} highlight />
        <ResultRow label="Est. Tax Saved" value={formatCurrency(taxSaved > 0 ? taxSaved : 0)} />
        <ResultRow label="Boot (taxable)" value={formatCurrency(bootReceived)} />
      </View>
    </View>
  );
}

function InputRow({
  label,
  value,
  onChange,
  prefix,
  suffix,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  testID?: string;
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.calcInput}
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.]/g, ""))}
          keyboardType="numeric"
          testID={testID}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && styles.resultHighlight]}>{value}</Text>
    </View>
  );
}

const calculators: { key: CalculatorType; title: string; icon: string }[] = [
  { key: "mortgage", title: "Mortgage", icon: "home" },
  { key: "arv", title: "ARV", icon: "analytics" },
  { key: "rehab", title: "Rehab", icon: "hammer" },
  { key: "capitalGains", title: "Tax", icon: "receipt" },
  { key: "exchange1031", title: "1031", icon: "swap-horizontal" },
];

export default function ToolkitScreen() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<CalculatorType>("mortgage");

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopPadding }]}>
      <View style={styles.header}>
        <Ionicons name="calculator" size={22} color="#06b6d4" />
        <Text style={styles.headerTitle}>Investor Toolkit</Text>
      </View>

      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {calculators.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.tab, active === c.key && styles.tabActive]}
              onPress={() => setActive(c.key)}
              testID={`tab-${c.key}`}
            >
              <Ionicons
                name={c.icon as any}
                size={16}
                color={active === c.key ? "#ffffff" : "#64748b"}
              />
              <Text style={[styles.tabText, active === c.key && styles.tabTextActive]}>
                {c.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + 20 + (Platform.OS === "web" ? 34 : 0),
        }}
        keyboardShouldPersistTaps="handled"
      >
        {active === "mortgage" && <MortgageCalculator />}
        {active === "arv" && <ArvCalculator />}
        {active === "rehab" && <RehabEstimator />}
        {active === "capitalGains" && <CapitalGainsCalculator />}
        {active === "exchange1031" && <Exchange1031Calculator />}
      </ScrollView>
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
  tabs: {
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    backgroundColor: "#1e293b",
  },
  tabActive: {
    backgroundColor: "#06b6d4",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  calcCard: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 20,
  },
  inputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#94a3b8",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
    marginRight: 4,
  },
  inputSuffix: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    marginLeft: 4,
  },
  calcInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#ffffff",
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#06b6d4",
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  resultSection: {
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 14,
    marginTop: 4,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  resultLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
  },
  resultValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
  },
  resultHighlight: {
    color: "#06b6d4",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
});
