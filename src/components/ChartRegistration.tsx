import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Filler,
  RadialLinearScale,
  DoughnutController,
  LineController,
  BarController,
  PieController,
  RadarController,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Register Chart.js components
ChartJS.register(
  // Elements
  ArcElement,
  LineElement,
  BarElement,
  PointElement,
  
  // Scales
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  
  // Controllers
  DoughnutController,
  LineController,
  BarController,
  PieController,
  RadarController,
  
  // Plugins
  Tooltip,
  Legend,
  Title,
  Filler,
  ChartDataLabels
);

export default function registerCharts() {
  // This function exists just to ensure the registration happens
  // It doesn't need to return anything
}