 
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

// ─── SHARED TOOLTIP STYLE ─────────────────────────────────────────────────────
const tooltipDefaults = {
  backgroundColor: "#1a1814",
  borderColor: "#2a2620",
  borderWidth: 1,
  titleColor: "#f0e6d3",
  bodyColor: "#7a7570",
};

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, trend, trendDir, sub }) {
  const colors = { up: "#22c55e", down: "#ef4444", neu: "#f97316" };
  const bgs    = { up: "#22c55e18", down: "#ef444418", neu: "#f9731618" };

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "#141210", border: "1px solid #1e1c19" }}
    >
      <p
        className="text-xs font-medium uppercase tracking-widest text-[#7a7570]"
        style={{ fontFamily: "'DM Sans',sans-serif" }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-black text-[#f0e6d3] leading-none"
        style={{ fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em" }}
      >
        {value}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ color: colors[trendDir], background: bgs[trendDir] }}
        >
          {trend}
        </span>
        {sub && <span className="text-xs text-[#7a7570]">{sub}</span>}
      </div>
    </div>
  );
}

// ─── CHART CARD WRAPPER ───────────────────────────────────────────────────────
function ChartCard({ title, sub, children, className = "" }) {
  return (
    <div
      className={`rounded-2xl p-5 flex flex-col ${className}`}
      style={{ background: "#141210", border: "1px solid #1e1c19" }}
    >
      <div className="mb-4">
        <h3
          className="font-bold text-[#f0e6d3] text-base"
          style={{ fontFamily: "'Syne',sans-serif" }}
        >
          {title}
        </h3>
        {sub && <p className="text-xs text-[#7a7570] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── REVENUE BAR + LINE ───────────────────────────────────────────────────────
function RevenueChart() {
  const labels = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const values = [320000, 285000, 410000, 370000, 445000, 482310];

  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: "Revenue",
        data: values,
        backgroundColor: "rgba(249,115,22,0.12)",
        borderColor: "rgba(249,115,22,0.6)",
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "Trend",
        data: values,
        borderColor: "#f97316",
        borderWidth: 2.5,
        pointRadius: 5,
        pointBackgroundColor: "#f97316",
        pointBorderColor: "#141210",
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
      tooltip: {
        ...tooltipDefaults,
        callbacks: { label: (ctx) => " ₹" + ctx.raw.toLocaleString("en-IN") },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#7a7570", font: { size: 12 } },
      },
      y: {
        grid: { color: "#1a1814" },
        ticks: {
          color: "#7a7570",
          font: { size: 11 },
          callback: (v) => "₹" + v / 1000 + "k",
        },
      },
    },
  };

  return (
    <div style={{ height: 240 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// ─── ORDER STATUS DONUT ───────────────────────────────────────────────────────
function OrderDonut() {
  const data = {
    labels: ["Delivered", "Pending", "Processing", "Cancelled"],
    datasets: [
      {
        data: [580, 312, 268, 88],
        backgroundColor: ["#22c55e", "#f97316", "#3b82f6", "#ef4444"],
        borderColor: "#141210",
        borderWidth: 3,
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#7a7570",
          font: { size: 12 },
          padding: 14,
          boxWidth: 10,
          borderRadius: 3,
        },
      },
      tooltip: tooltipDefaults,
    },
  };

  return (
    <div style={{ height: 240 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}

// ─── STOCK HORIZONTAL BAR ─────────────────────────────────────────────────────
function StockBar() {
  const data = {
    labels: ["Prod-Alpha", "Prod-Beta", "Prod-Gamma", "Prod-Delta", "Prod-Sigma"],
    datasets: [
      {
        label: "In Stock",
        data: [420, 280, 610, 190, 380],
        backgroundColor: [
          "#f9731622",
          "#22c55e22",
          "#3b82f622",
          "#f9731622",
          "#a855f722",
        ],
        borderColor: ["#f97316", "#22c55e", "#3b82f6", "#fb923c", "#a855f7"],
        borderWidth: 1.5,
        borderRadius: 5,
      },
    ],
  };

  const options = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipDefaults,
    },
    scales: {
      x: {
        grid: { color: "#1a1814" },
        ticks: { color: "#7a7570", font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: "#7a7570", font: { size: 12 } },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// ─── CUSTOMER GROWTH AREA ─────────────────────────────────────────────────────
function CustomerArea() {
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Customers",
        data: [210, 245, 280, 305, 326],
        borderColor: "#3b82f6",
        borderWidth: 2.5,
        backgroundColor: "rgba(59,130,246,0.1)",
        pointRadius: 4,
        pointBackgroundColor: "#3b82f6",
        pointBorderColor: "#141210",
        pointBorderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipDefaults },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#7a7570", font: { size: 12 } },
      },
      y: {
        grid: { color: "#1a1814" },
        ticks: { color: "#7a7570", font: { size: 11 } },
      },
    },
  };

  return (
    <div style={{ height: 160 }}>
      <Line data={data} options={options} />
    </div>
  );
}

// ─── RECENT INVOICES TABLE ────────────────────────────────────────────────────
const INVOICES = [
  { id: "#INV-0091", customer: "Arjun Sharma", amount: "₹12,400", status: "Paid",    date: "07 May" },
  { id: "#INV-0090", customer: "Priya Verma",  amount: "₹8,750",  status: "Pending", date: "06 May" },
  { id: "#INV-0089", customer: "Ravi Patel",   amount: "₹21,000", status: "Paid",    date: "05 May" },
  { id: "#INV-0088", customer: "Sneha Mehta",  amount: "₹5,300",  status: "Overdue", date: "02 May" },
  { id: "#INV-0087", customer: "Vikram Das",   amount: "₹9,800",  status: "Paid",    date: "01 May" },
];

const STATUS_STYLE = {
  Paid:    { color: "#22c55e", bg: "#22c55e18" },
  Pending: { color: "#f97316", bg: "#f9731618" },
  Overdue: { color: "#ef4444", bg: "#ef444418" },
};

function InvoicesTable() {
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #1e1c19" }}>
            {["Invoice", "Customer", "Date", "Amount", "Status"].map((h) => (
              <th
                key={h}
                className="text-left pb-3 text-xs font-medium uppercase tracking-widest text-[#7a7570]"
                style={{ fontFamily: "'DM Sans',sans-serif" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INVOICES.map((inv, i) => (
            <tr
              key={inv.id}
              style={{
                borderBottom: i < INVOICES.length - 1 ? "1px solid #1a1814" : "none",
              }}
            >
              <td className="py-3 font-mono text-xs text-[#7a7570]">{inv.id}</td>
              <td
                className="py-3 font-medium text-[#f0e6d3]"
                style={{ fontFamily: "'DM Sans',sans-serif" }}
              >
                {inv.customer}
              </td>
              <td className="py-3 text-xs text-[#7a7570]">{inv.date}</td>
              <td
                className="py-3 font-bold text-[#f0e6d3]"
                style={{ fontFamily: "'Syne',sans-serif" }}
              >
                {inv.amount}
              </td>
              <td className="py-3">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{
                    color: STATUS_STYLE[inv.status].color,
                    background: STATUS_STYLE[inv.status].bg,
                  }}
                >
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
export default function Dashboard() {
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1
          className="text-3xl font-black text-[#f0e6d3]"
          style={{ fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em" }}
        >
          Dashboard
        </h1>
        <p
          className="text-sm text-[#7a7570] mt-1"
          style={{ fontFamily: "'DM Sans',sans-serif" }}
        >
          Welcome back — here's your business at a glance
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue"    value="₹4,82,310" trend="↑ 12.4%"   trendDir="up"  sub="vs last month"    />
        <KpiCard label="Total Orders"     value="1,248"      trend="↑ 8.1%"    trendDir="up"  sub="this month"       />
        <KpiCard label="Customers"        value="326"        trend="+14 new"   trendDir="neu" sub="this month"       />
        <KpiCard label="Pending Invoices" value="₹38,500"    trend="3 overdue" trendDir="down" sub="needs attention" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Revenue Overview" sub="Monthly — last 6 months" className="lg:col-span-2">
          <RevenueChart />
        </ChartCard>
        <ChartCard title="Order Status" sub="This month breakdown">
          <OrderDonut />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Stock Levels" sub="Top 5 products">
          <StockBar />
        </ChartCard>

        <ChartCard title="Customer Growth" sub="Last 5 months">
          <CustomerArea />
          <div className="mt-4 flex gap-6">
            {[["Total", "326"], ["Active", "291"], ["New", "+14"]].map(([l, v]) => (
              <div key={l}>
                <p className="text-xs text-[#7a7570]">{l}</p>
                <p
                  className="text-lg font-black text-[#f0e6d3]"
                  style={{ fontFamily: "'Syne',sans-serif" }}
                >
                  {v}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Recent Invoices" sub="Latest 5 transactions">
          <InvoicesTable />
        </ChartCard>
      </div>
    </div>
  );
}