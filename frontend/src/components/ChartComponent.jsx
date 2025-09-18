import React, { memo } from 'react';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const ChartComponent = memo(({ chartData }) => {
    const pieData = {
        labels: chartData.appsByCompany.map(d => d.company_name),
        datasets: [{
            label: '# of Applications',
            data: chartData.appsByCompany.map(d => d.count),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
        }]
    };

    const barData = {
        labels: chartData.commissionsByMonth.map(d => d.month),
        datasets: [{
            label: 'Total Commissions (€)',
            data: chartData.commissionsByMonth.map(d => d.total),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
        }]
    };

    return (
        <div className="charts-grid">
            <div className="chart-container">
                <h3>Αιτήσεις ανά Εταιρεία</h3>
                <Pie data={pieData} />
            </div>
             <div className="chart-container">
                <h3>Αμοιβές ανά Μήνα</h3>
                <Bar data={barData} />
            </div>
        </div>
    );
});

export default ChartComponent;