import React from "react";
import { ChartLine, BarChart as LucideBarChart, PieChart as LucidePieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  LineChart, 
  BarChart as RechartsBarChart, 
  PieChart as RechartsPieChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line as RechartsLine, 
  Bar as RechartsBar, 
  Pie as RechartsPie 
} from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Mock data for the charts
const cpuData = [
  { name: '00:00', value: 24 },
  { name: '04:00', value: 13 },
  { name: '08:00', value: 42 },
  { name: '12:00', value: 65 },
  { name: '16:00', value: 48 },
  { name: '20:00', value: 30 },
  { name: '24:00', value: 25 },
];

const memoryData = [
  { name: '00:00', used: 410, total: 1024 },
  { name: '04:00', used: 380, total: 1024 },
  { name: '08:00', used: 560, total: 1024 },
  { name: '12:00', used: 890, total: 1024 },
  { name: '16:00', used: 720, total: 1024 },
  { name: '20:00', used: 550, total: 1024 },
  { name: '24:00', used: 480, total: 1024 },
];

const networkData = [
  { name: '00:00', download: 32, upload: 12 },
  { name: '04:00', download: 15, upload: 8 },
  { name: '08:00', download: 45, upload: 26 },
  { name: '12:00', download: 78, upload: 48 },
  { name: '16:00', download: 52, upload: 30 },
  { name: '20:00', download: 38, upload: 20 },
  { name: '24:00', download: 28, upload: 16 },
];

const resourceData = [
  { name: 'CPU', value: 65 },
  { name: 'Memory', value: 45 },
  { name: 'Storage', value: 30 },
];

// Mock API function to fetch dashboard data
const fetchDashboardData = async () => {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return {
    cpuData,
    memoryData,
    networkData,
    resourceData
  };
};

export default function Dashboard() {
  const { toast } = useToast();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: fetchDashboardData
  });

  if (isLoading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (isError) {
    return <div className="container mx-auto p-6">Error fetching data</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
            <CardDescription>CPU load over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.cpuData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <RechartsLine type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
            <CardDescription>Memory consumption over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBarChart data={data.memoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <RechartsBar dataKey="used" fill="#82ca9d" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Network Traffic</CardTitle>
            <CardDescription>Upload and download rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsBarChart data={data.networkData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <RechartsBar dataKey="download" fill="#8884d8" />
                <RechartsBar dataKey="upload" fill="#82ca9d" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Allocation</CardTitle>
            <CardDescription>Percentage of resource usage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Tooltip />
                <RechartsPie 
                  data={data.resourceData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80}
                  fill="#8884d8"
                  label
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
