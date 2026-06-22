// The branded PDF rendering of a quote — the print counterpart of the on-screen
// <QuoteDocument />. Built with @react-pdf/renderer primitives (its own layout
// engine, not the DOM), so it can't share the React component, but it mirrors
// the same sections and the same QuoteDocumentData shape. Render it to a buffer
// with renderToBuffer(<QuotePdf data={...} />) on the server.

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatCurrency, formatDate } from "@/lib/format";
import { deriveQuoteNumber, type QuoteDocumentData } from "@/components/quote/quote-document";

// Neutral, professional palette — hex literals (no CSS vars in react-pdf).
const INK = "#1a1a1a";
const MUTED = "#6b7280";
const FAINT = "#9ca3af";
const LINE = "#e5e7eb";
const SUCCESS = "#15803d";
const PANEL = "#f9fafb";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, maxWidth: 320 },
  logo: { width: 44, height: 44, borderRadius: 6, objectFit: "cover", border: `1 solid ${LINE}` },
  logoFallback: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
    color: MUTED,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  companyName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  trust: { fontSize: 8, color: MUTED },
  trustVerified: { fontSize: 8, color: SUCCESS, fontFamily: "Helvetica-Bold" },
  headerRight: { alignItems: "flex-end" },
  quoteLabel: { fontSize: 8, color: FAINT, letterSpacing: 1.5, fontFamily: "Helvetica-Bold" },
  quoteNumber: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  statusPill: { fontSize: 8, marginTop: 4, color: MUTED },
  statusAccepted: { color: SUCCESS, fontFamily: "Helvetica-Bold" },
  // Meta
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 14,
  },
  metaCell: { width: "50%", marginBottom: 8, paddingRight: 12 },
  metaCellFull: { width: "100%", paddingRight: 12 },
  metaLabel: { fontSize: 7.5, color: FAINT, letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2 },
  warrantyValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 2, color: SUCCESS },
  // Line items
  section: { paddingTop: 16 },
  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingBottom: 5,
  },
  tableHeadText: { fontSize: 7.5, color: FAINT, letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 16,
  },
  itemLabel: { flex: 1, fontSize: 10 },
  itemAmount: { fontSize: 10 },
  // Totals
  totals: { marginTop: 12, marginLeft: "auto", width: 200 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, color: MUTED },
  totalRowText: { fontSize: 10, color: MUTED },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    marginTop: 2,
  },
  grandText: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  // Scope
  scopeSection: { borderTopWidth: 1, borderTopColor: LINE, marginTop: 16, paddingTop: 14 },
  scopeLabel: { fontSize: 7.5, color: FAINT, letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  scopeText: { fontSize: 10, marginTop: 5, color: "#374151" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: FAINT },
});

function percent(fraction: string | null): string | null {
  if (!fraction) return null;
  const pct = parseFloat(fraction) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return null;
  return `${+pct.toFixed(2)}%`;
}

export function QuotePdf({ data }: { data: QuoteDocumentData }) {
  const { company } = data;
  const quoteNumber = deriveQuoteNumber(data.estimateId, data.issuedAt);
  const taxPercent = percent(data.taxRate);
  const accepted = data.status === "accepted";
  const superseded = data.status === "rejected";
  const serviceLabel = data.subtype ?? data.serviceName ?? null;
  const rating =
    company.avgRating && company.totalReviews > 0 ? +company.avgRating : null;
  const initial = (company.name ?? "Q").trim().charAt(0).toUpperCase();

  return (
    <Document
      title={`Quote ${quoteNumber}`}
      author={company.name ?? "Hommy"}
      creator="Hommy"
      producer="Hommy"
    >
      <Page size="LETTER" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logoUrl ? (
              // @react-pdf/renderer's Image is a PDF primitive, not an <img> — no alt.
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={company.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoFallback}>{initial}</Text>
            )}
            <View>
              <Text style={styles.companyName}>{company.name ?? "Your contractor"}</Text>
              <View style={styles.trustRow}>
                {company.verified ? <Text style={styles.trustVerified}>Verified</Text> : null}
                {rating !== null ? (
                  <Text style={styles.trust}>
                    {rating.toFixed(1)} ({company.totalReviews})
                  </Text>
                ) : null}
                {company.licenseNumber ? (
                  <Text style={styles.trust}>License #{company.licenseNumber}</Text>
                ) : null}
                {company.insuranceProvider ? <Text style={styles.trust}>Insured</Text> : null}
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.quoteLabel}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{quoteNumber}</Text>
            <Text style={[styles.statusPill, accepted ? styles.statusAccepted : {}]}>
              {accepted ? "Accepted" : superseded ? "Superseded" : "Awaiting decision"}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaGrid}>
          {data.clientName ? <MetaCell label="PREPARED FOR" value={data.clientName} /> : null}
          {serviceLabel ? <MetaCell label="SERVICE" value={serviceLabel} /> : null}
          <MetaCell
            label="ISSUED"
            value={data.issuedAt ? formatDate(new Date(data.issuedAt)) : "—"}
          />
          <MetaCell
            label="VALID UNTIL"
            value={data.validUntil ? formatDate(new Date(data.validUntil)) : "—"}
          />
          {data.warranty ? (
            <View style={styles.metaCellFull}>
              <Text style={styles.metaLabel}>WARRANTY</Text>
              <Text style={styles.warrantyValue}>{data.warranty}</Text>
            </View>
          ) : null}
        </View>

        {/* Line items */}
        <View style={styles.section}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadText}>DESCRIPTION</Text>
            <Text style={styles.tableHeadText}>AMOUNT</Text>
          </View>
          {data.lineItems.map((li, i) => (
            <View key={i} style={styles.itemRow} wrap={false}>
              <Text style={styles.itemLabel}>{li.label}</Text>
              <Text style={styles.itemAmount}>{formatCurrency(li.amount)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totals}>
            {data.subtotal ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowText}>Subtotal</Text>
                <Text style={styles.totalRowText}>{formatCurrency(data.subtotal)}</Text>
              </View>
            ) : null}
            {data.taxAmount ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalRowText}>Tax{taxPercent ? ` (${taxPercent})` : ""}</Text>
                <Text style={styles.totalRowText}>{formatCurrency(data.taxAmount)}</Text>
              </View>
            ) : null}
            <View style={styles.grandRow}>
              <Text style={styles.grandText}>Total</Text>
              <Text style={styles.grandText}>
                {data.total ? formatCurrency(data.total) : "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Scope */}
        {data.scopeNotes ? (
          <View style={styles.scopeSection}>
            <Text style={styles.scopeLabel}>SCOPE OF WORK</Text>
            <Text style={styles.scopeText}>{data.scopeNotes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.yearsInBusiness ? `${company.yearsInBusiness} years in business` : "Hommy"}
          </Text>
          <Text style={styles.footerText}>
            Quote {quoteNumber}
            {company.name ? ` · ${company.name}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

/** Render the branded quote PDF to a Buffer (server-only). */
export function renderQuotePdf(data: QuoteDocumentData): Promise<Buffer> {
  return renderToBuffer(<QuotePdf data={data} />);
}
