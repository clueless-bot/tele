import { Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';

// Plugin to draw a vertical line on the highest point
const highestPointPlugin = {
    id: 'highestPointLine',
    afterDatasetsDraw(chart) {
        if (chart.data.datasets.length === 0) {
            return;
        }

        const { ctx, data, chartArea } = chart;
        const { datasets } = data;
        const highestData = Math.max(...datasets[0].data);
        const highestIndex = datasets[0].data.indexOf(highestData);
        const xValue = chart.scales.x.getPixelForValue(highestIndex);
        const yValue = chart.scales.y.getPixelForValue(highestData);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xValue, chartArea.bottom);
        ctx.lineTo(xValue, yValue);
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.stroke();
        ctx.restore();
    },
};

Chart.register(highestPointPlugin);

const generateRandomData = () => {
    const labels = Array.from({ length: 25 }, (_, i) => i + 10);
    const data = labels.map(() => Math.floor(Math.random() * 80000) + 20000);
    return { labels, data };
};

const { labels, data } = generateRandomData();

const chartData = {
    labels,
    datasets: [
        {
            label: 'Views',
            data,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
        },
    ],
};

const options = {
    scales: {
        y: {
            beginAtZero: true,
        },
    },
    plugins: {
        highestPointLine: {},
    },
};

export const ChartCode = () => {
    return (
        <div className='chart-div'>
            <Line data={ chartData } options={ options } />
        </div>
    );
};
