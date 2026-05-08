import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useTheme } from "../components/ThemeContext";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Tooltip, Legend, Filler
);

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendDir, sub }) {
  const { t } = useTheme();
  const colors = { up: t.green,    down: t.red,    neu: t.orange   };
  const bgs    = { up: t.greenBg,  down: t.redBg,  neu: t.orangeBg };

  return (
    <div style={{
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
    }}>
      <p style={{
        fontSize: "10px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: t.textMuted,
        fontFamily: "'DM Sans', sans-serif",
      }}>{label}</p>
      <p style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "26px",
        fontWeight: 900,
        color: t.textPrimary,
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}>{value}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "3px 10px",
          borderRadius: "99px",
          color: colors[trendDir],
          background: bgs[trendDir],
        }}>{trend}</span>
        {sub && <span style={{ fontSize: "11px", color: t.textMuted }}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── CHART CARD WRAPPER ───────────────────────────────────────────────────────
function ChartCard({ title, sub, children, style = {} }) {
  const { t } = useTheme();
  return (
    <div style={{
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      transition: "background 0.25s ease, border-color 0.25s ease",
      ...style,
    }}>
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          color: t.textPrimary,
        }}>{title}</h3>
        {sub && <p style={{ fontSize: "11px", color: t.textMuted, marginTop: "2px" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── REVENUE BAR + LINE ───────────────────────────────────────────────────────
function RevenueChart() {
  const { t } = useTheme();
  const labels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const values = [320000, 285000, 410000, 370000, 445000, 482310];

  const tooltipDefaults = {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    titleColor: t.tooltipTitle,
    bodyColor: t.tooltipBody,
  };

  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Revenue",
        data: values,
        backgroundColor: `${t.accent}18`,
        borderColor: `${t.accent}90`,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "Trend",
        data: values,
        borderColor: t.accent,
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: t.accent,
        pointBorderColor: t.bgCard,
        pointBorderWidth: 2,
        tension: 0.45,
        fill: false,
        yAxisID: "y",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { ...tooltipDefaults, callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 12 } } },
      y: {
        grid: { color: t.gridColor },
        ticks: { color: t.textMuted, font: { size: 11 }, callback: (v) => "₹" + v / 1000 + "k" },
      },
    },
  };

  return <div style={{ height: 240 }}><Bar data={data} options={options} /></div>;
}

// ─── ORDER STATUS DONUT ───────────────────────────────────────────────────────
function OrderDonut() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    titleColor: t.tooltipTitle,
    bodyColor: t.tooltipBody,
  };

  const data = {
    labels: ["Delivered", "Pending", "Processing", "Cancelled"],
    datasets: [{
      data: [580, 312, 268, 88],
      backgroundColor: [t.green, t.orange, t.blue, t.red],
      borderColor: t.bgCard,
      borderWidth: 3,
      hoverOffset: 8,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: t.textMuted, font: { size: 12 }, padding: 14, boxWidth: 10 },
      },
      tooltip: tooltipDefaults,
    },
  };

  return <div style={{ height: 240 }}><Doughnut data={data} options={options} /></div>;
}

// ─── STOCK HORIZONTAL BAR ─────────────────────────────────────────────────────
function StockBar() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    titleColor: t.tooltipTitle,
    bodyColor: t.tooltipBody,
  };

  const data = {
    labels: ["Prod-Alpha", "Prod-Beta", "Prod-Gamma", "Prod-Delta", "Prod-Sigma"],
    datasets: [{
      label: "In Stock",
      data: [420, 280, 610, 190, 380],
      backgroundColor: [`${t.orange}20`, `${t.green}20`, `${t.blue}20`, `${t.orange}20`, "#a855f720"],
      borderColor: [t.orange, t.green, t.blue, t.accentLight, "#a855f7"],
      borderWidth: 1.5,
      borderRadius: 5,
    }],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 12 } } },
    },
  };

  return <div style={{ height: 220 }}><Bar data={data} options={options} /></div>;
}

// ─── CUSTOMER GROWTH AREA ─────────────────────────────────────────────────────
function CustomerArea() {
  const { t } = useTheme();
  const tooltipDefaults = {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    titleColor: t.tooltipTitle,
    bodyColor: t.tooltipBody,
  };

  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [{
      label: "Customers",
      data: [210, 245, 280, 305, 326],
      borderColor: t.blue,
      borderWidth: 2.5,
      backgroundColor: `${t.blue}18`,
      pointRadius: 4,
      pointBackgroundColor: t.blue,
      pointBorderColor: t.bgCard,
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: { grid: { display: false }, ticks: { color: t.textMuted, font: { size: 12 } } },
      y: { grid: { color: t.gridColor }, ticks: { color: t.textMuted, font: { size: 11 } } },
    },
  };

  return <div style={{ height: 160 }}><Line data={data} options={options} /></div>;
}

// ─── RECENT INVOICES TABLE ────────────────────────────────────────────────────
const INVOICES = [
  { id: "#INV-0091", customer: "Arjun Sharma", amount: "₹12,400", status: "Paid",    date: "07 May" },
  { id: "#INV-0090", customer: "Priya Verma",  amount: "₹8,750",  status: "Pending", date: "06 May" },
  { id: "#INV-0089", customer: "Ravi Patel",   amount: "₹21,000", status: "Paid",    date: "05 May" },
  { id: "#INV-0088", customer: "Sneha Mehta",  amount: "₹5,300",  status: "Overdue", date: "02 May" },
  { id: "#INV-0087", customer: "Vikram Das",   amount: "₹9,800",  status: "Paid",    date: "01 May" },
];

function InvoicesTable() {
  const { t } = useTheme();
  const statusStyle = {
    Paid:    { color: t.green,  bg: t.greenBg  },
    Pending: { color: t.orange, bg: t.orangeBg },
    Overdue: { color: t.red,    bg: t.redBg    },
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border}` }}>
            {["Invoice", "Customer", "Date", "Amount", "Status"].map((h) => (
              <th key={h} style={{
                textAlign: "left",
                paddingBottom: "10px",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: t.textMuted,
                fontFamily: "'DM Sans', sans-serif",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INVOICES.map((inv, i) => (
            <tr key={inv.id} style={{
              borderBottom: i < INVOICES.length - 1 ? `1px solid ${t.borderLight}` : "none",
            }}>
              <td style={{ padding: "10px 0", fontFamily: "monospace", fontSize: "11px", color: t.textMuted }}>{inv.id}</td>
              <td style={{ padding: "10px 0", fontWeight: 500, color: t.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{inv.customer}</td>
              <td style={{ padding: "10px 0", fontSize: "11px", color: t.textMuted }}>{inv.date}</td>
              <td style={{ padding: "10px 0", fontWeight: 700, color: t.textPrimary, fontFamily: "'Syne', sans-serif" }}>{inv.amount}</td>
              <td style={{ padding: "10px 0" }}>
                <span style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: "99px",
                  color: statusStyle[inv.status].color,
                  background: statusStyle[inv.status].bg,
                }}>{inv.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── RESPONSIVE STYLES ────────────────────────────────────────────────────────
const styles = `
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  .charts-row-1 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
  }
  .charts-row-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }
  @media (max-width: 640px) {
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .charts-row-1,
    .charts-row-2 {
      grid-template-columns: 1fr;
    }
  }
`;

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useTheme();

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Page Header */}
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "28px",
            fontWeight: 900,
            color: t.textPrimary,
            letterSpacing: "-0.03em",
            transition: "color 0.25s ease",
          }}>Dashboard</h1>
          <p style={{ fontSize: "13px", color: t.textMuted, marginTop: "4px" }}>
            Welcome back — here's your business at a glance
          </p>
        </div>

        {/* KPI Row — 4 cols desktop, 2 cols mobile */}
        <div className="kpi-grid">
          <KpiCard label="Total Revenue"    value="₹4,82,310" trend="↑ 12.4%"   trendDir="up"   sub="vs last month"    />
          <KpiCard label="Total Orders"     value="1,248"     trend="↑ 8.1%"    trendDir="up"   sub="this month"       />
          <KpiCard label="Customers"        value="326"       trend="+14 new"   trendDir="neu"  sub="this month"       />
          <KpiCard label="Pending Invoices" value="₹38,500"   trend="3 overdue" trendDir="down" sub="needs attention"  />
        </div>

        {/* Charts Row 1 — Revenue + Donut */}
        <div className="charts-row-1">
          <ChartCard title="Revenue Overview" sub="Monthly — last 6 months">
            <RevenueChart />
          </ChartCard>
          <ChartCard title="Order Status" sub="This month breakdown">
            <OrderDonut />
          </ChartCard>
        </div>

        {/* Charts Row 2 — Stock, Customers, Invoices */}
        <div className="charts-row-2">
          <ChartCard title="Stock Levels" sub="Top 5 products">
            <StockBar />
          </ChartCard>

          <ChartCard title="Customer Growth" sub="Last 5 months">
            <CustomerArea />
            <div style={{ marginTop: "12px", display: "flex", gap: "24px" }}>
              {[["Total", "326"], ["Active", "291"], ["New", "+14"]].map(([l, v]) => (
                <div key={l}>
                  <p style={{ fontSize: "11px", color: t.textMuted }}>{l}</p>
                  <p style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 900,
                    fontSize: "18px",
                    color: t.textPrimary,
                  }}>{v}</p>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Recent Invoices" sub="Latest 5 transactions">
            <InvoicesTable />
          </ChartCard>
        </div>

      </div>
    </>
  );
}