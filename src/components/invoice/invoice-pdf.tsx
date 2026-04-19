import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatCents } from "@/lib/utils";
import { format } from "date-fns";

export type InvoiceData = {
  bookingId: string;
  date: Date;
  technician: {
    name: string;
    email: string;
    businessName?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  services: {
    name: string;
    durationMin: number;
    priceCents: number;
  }[];
  totalCents: number;
  isPaid: boolean;
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  invoiceId: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  techInfo: {
    textAlign: "right",
  },
  techName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  techDetail: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  customerName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  detail: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
  billToRow: {
    flexDirection: "row",
    gap: 80,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  colService: {
    flex: 3,
  },
  colDuration: {
    flex: 1,
    textAlign: "right",
  },
  colAmount: {
    flex: 1,
    textAlign: "right",
  },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#64748b",
  },
  totalRow: {
    flexDirection: "row",
    paddingTop: 10,
  },
  totalLabel: {
    flex: 4,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    paddingRight: 8,
  },
  totalValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  status: {
    marginTop: 24,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  paid: {
    color: "#16a34a",
  },
  unpaid: {
    color: "#dc2626",
  },
});

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceId}>
              #{data.bookingId.slice(0, 8)}
            </Text>
          </View>
          <View style={styles.techInfo}>
            <Text style={styles.techName}>
              {data.technician.businessName || data.technician.name}
            </Text>
            {data.technician.addressLine1 && (
              <Text style={styles.techDetail}>
                {data.technician.addressLine1}
              </Text>
            )}
            {data.technician.city && (
              <Text style={styles.techDetail}>
                {data.technician.city}, {data.technician.state}{" "}
                {data.technician.zipCode}
              </Text>
            )}
            <Text style={styles.techDetail}>{data.technician.email}</Text>
          </View>
        </View>

        {/* Bill To + Details */}
        <View style={[styles.section, styles.billToRow]}>
          <View>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
            <Text style={styles.detail}>{data.customer.email}</Text>
            {data.customer.phone && (
              <Text style={styles.detail}>{data.customer.phone}</Text>
            )}
          </View>
          <View>
            <Text style={styles.sectionLabel}>Details</Text>
            <Text style={styles.detail}>
              Date: {format(new Date(data.date), "MMMM d, yyyy")}
            </Text>
            <Text style={styles.detail}>
              Status: {data.isPaid ? "Paid" : "Unpaid"}
            </Text>
          </View>
        </View>

        {/* Service Table */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colService]}>Service</Text>
            <Text style={[styles.headerText, styles.colDuration]}>
              Duration
            </Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          {data.services.map((svc, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colService}>{svc.name}</Text>
              <Text style={styles.colDuration}>{svc.durationMin} min</Text>
              <Text style={styles.colAmount}>
                {formatCents(svc.priceCents)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCents(data.totalCents)}
            </Text>
          </View>
        </View>

        {/* Status */}
        <Text
          style={[styles.status, data.isPaid ? styles.paid : styles.unpaid]}
        >
          {data.isPaid ? "PAID" : "UNPAID"}
        </Text>
      </Page>
    </Document>
  );
}
