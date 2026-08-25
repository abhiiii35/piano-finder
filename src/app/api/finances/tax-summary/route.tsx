import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  getIncomePayments,
  getExpensesForRange,
  getMileageLogsForRange,
} from "@/lib/queries/finance";
import { buildProfitAndLoss, type ProfitAndLoss } from "@/lib/finance/report";
import { formatCents } from "@/lib/utils";
import { INCOME_CATEGORY } from "@/lib/constants";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 10,
  },
  rowValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  netLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  netValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  muted: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
  },
});

function TaxSummaryDocument({
  year,
  report,
}: {
  year: number;
  report: ProfitAndLoss;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Tax Summary — {year}</Text>
        <Text style={styles.subtitle}>
          Income, expenses, and mileage recorded in Piano Finder for calendar
          year {year}.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Income by Category</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{INCOME_CATEGORY}</Text>
            <Text style={styles.rowValue}>{formatCents(report.incomeCents)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses by Category</Text>
          {report.expensesByCategory.length === 0 ? (
            <Text style={styles.rowLabel}>No expenses recorded.</Text>
          ) : (
            report.expensesByCategory.map((c) => (
              <View key={c.category} style={styles.row}>
                <Text style={styles.rowLabel}>
                  {c.category} ({c.count})
                </Text>
                <Text style={styles.rowValue}>{formatCents(c.totalCents)}</Text>
              </View>
            ))
          )}
          <Text style={styles.muted}>
            Marked deductible: {formatCents(report.deductibleExpenseCents)} of{" "}
            {formatCents(report.expenseTotalCents)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mileage Deduction</Text>
          {report.mileage.byYear.length === 0 ? (
            <Text style={styles.rowLabel}>No mileage logged.</Text>
          ) : (
            report.mileage.byYear.map((line) => (
              <View key={line.year} style={styles.row}>
                <Text style={styles.rowLabel}>
                  {line.miles} miles
                  {line.rateCentsPerMile !== null
                    ? ` × ${line.rateCentsPerMile}¢/mile`
                    : " (no IRS rate configured for this year)"}
                </Text>
                <Text style={styles.rowValue}>
                  {line.deductionCents !== null
                    ? formatCents(line.deductionCents)
                    : "—"}
                </Text>
              </View>
            ))
          )}
          <Text style={styles.muted}>
            Total mileage deduction: {formatCents(report.mileage.totalDeductionCents)}
          </Text>
        </View>

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net (income − expenses)</Text>
          <Text style={styles.netValue}>{formatCents(report.netCents)}</Text>
        </View>

        <Text style={styles.footer}>
          Prepared from your Book A Piano Tuner records. Not tax advice —
          review with your accountant.
        </Text>
      </Page>
    </Document>
  );
}

function isValidYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return Number.isInteger(year) && year >= 2000 && year <= currentYear + 1;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "TECHNICIAN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return new Response("Profile not found", { status: 404 });

  const url = new URL(request.url);
  const yearParam = url.searchParams.get("year");
  const year = Number(yearParam);
  if (!yearParam || !isValidYear(year)) {
    return new Response("Invalid year", { status: 400 });
  }

  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);

  const [payments, expenses, mileageLogs] = await Promise.all([
    getIncomePayments(profile.id, from, to),
    getExpensesForRange(profile.id, from, to),
    getMileageLogsForRange(profile.id, from, to),
  ]);

  const report = buildProfitAndLoss({ payments, expenses, mileageLogs });

  const buffer = await renderToBuffer(
    <TaxSummaryDocument year={year} report={report} />
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tax-summary-${year}.pdf"`,
    },
  });
}
