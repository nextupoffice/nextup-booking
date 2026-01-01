import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { formatRupiahDisplay } from "../utils/format";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function CashFlowChart({ bookings }) {
  // Kelompokkan per bulan
  const monthly = {};
  bookings.forEach(b=>{
    const month = b.date ? b.date.slice(0,7) : "Unknown";
    if(!monthly[month]) monthly[month]={dp:0,pelunasan:0};
    monthly[month].dp += b.dp;
    monthly[month].pelunasan += b.pelunasan;
  });

  const labels = Object.keys(monthly).sort();
  const dpData = labels.map(m=>monthly[m].dp);
  const pelunasanData = labels.map(m=>monthly[m].pelunasan);

  const data = {
    labels,
    datasets:[
      {label:'DP', data:dpData, borderColor:'#a98367', backgroundColor:'#a98367aa'},
      {label:'Pelunasan', data:pelunasanData, borderColor:'#cba58a', backgroundColor:'#cba58aaa'}
    ]
  };

  const options = {
    responsive:true,
    plugins:{legend:{labels:{color:'#e0e0e0'}}, tooltip:{callbacks:{label:ctx=>formatRupiahDisplay(ctx.raw)}}},
    scales:{x:{ticks:{color:'#e0e0e0'},grid:{color:'#333'}}, y:{ticks:{color:'#e0e0e0'},grid:{color:'#333'}}}
  };

  return <div className="card"><h3>Arus Kas per Bulan</h3><Line data={data} options={options} /></div>;
}
