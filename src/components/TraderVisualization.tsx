import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Scatter, ScatterChart, ZAxis, 
} from "recharts";
import { type Trader, type TraderInfluence } from "@/utils/calculateSmartEdge";

// Custom color scales for visualizations
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#a05195", "#d45087"];
const YES_COLOR = "#22c55e";
const NO_COLOR = "#ef4444";

interface TraderVisualizationProps {
  traders: Trader[];
  traderInfluences: TraderInfluence[];
  smartYesCapital: number;
  smartNoCapital: number;
}

const TraderVisualization: React.FC<TraderVisualizationProps> = ({
  traders,
  traderInfluences,
  smartYesCapital,
  smartNoCapital,
}) => {
  const [visualizationType, setVisualizationType] = React.useState<string>("smartScore");

  // Group traders by smart score ranges for the bar chart
  const prepareSmartScoreDistribution = () => {
    const ranges = [
      { name: "<0", min: -100, max: 0 },
      { name: "0-20", min: 0, max: 20 },
      { name: "21-40", min: 21, max: 40 },
      { name: "41-60", min: 41, max: 60 },
      { name: "61-80", min: 61, max: 80 },
      { name: "81-100", min: 81, max: 100 },
    ];

    const yesData = ranges.map(range => ({
      range: range.name,
      influence: traderInfluences
        .filter(t => 
          t.sentiment === "yes" && 
          t.smartScore >= range.min && 
          t.smartScore <= range.max
        )
        .reduce((sum, t) => sum + t.influencePercent, 0)
    }));

    const noData = ranges.map(range => ({
      range: range.name,
      influence: traderInfluences
        .filter(t => 
          t.sentiment === "no" && 
          t.smartScore >= range.min && 
          t.smartScore <= range.max
        )
        .reduce((sum, t) => sum + t.influencePercent, 0)
    }));

    return {
      yesData,
      noData
    };
  };

  // Prepare data for smart capital distribution pie chart
  const prepareSmartCapitalData = () => {
    return [
      { name: "Smart YES Capital", value: smartYesCapital, color: YES_COLOR },
      { name: "Smart NO Capital", value: smartNoCapital, color: NO_COLOR },
    ];
  };

  // Prepare scatter plot data - smart score vs position size vs influence
  const prepareScatterData = () => {
    return traderInfluences.map(trader => ({
      name: trader.name,
      smartScore: trader.smartScore,
      dollarPosition: Math.log10(trader.dollarPosition + 1) * 10, // Log scale for better visualization
      influence: trader.influencePercent,
      sentiment: trader.sentiment,
    }));
  };

  // Prepare top influencers chart data
  const prepareTopInfluencersData = () => {
    return traderInfluences
      .slice(0, 10) // Top 10 influencers
      .map(t => ({
        name: t.name,
        influence: t.influencePercent,
        sentiment: t.sentiment
      }));
  };

  const { yesData, noData } = prepareSmartScoreDistribution();
  const smartCapitalData = prepareSmartCapitalData();
  const scatterData = prepareScatterData();
  const topInfluencersData = prepareTopInfluencersData();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-xl">Edge Distribution Visualization</CardTitle>
          <Select
            value={visualizationType}
            onValueChange={setVisualizationType}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select visualization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smartScore">By Smart Score Range</SelectItem>
              <SelectItem value="smartCapital">By Smart Capital</SelectItem>
              <SelectItem value="heatmap">Smart Score vs Position Size</SelectItem>
              <SelectItem value="topInfluencers">Top Influencers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          {visualizationType === "smartScore" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...yesData, ...noData]}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="range" 
                  label={{ 
                    value: 'Smart Score Range', 
                    position: 'bottom', 
                    offset: 0 
                  }} 
                />
                <YAxis 
                  label={{ 
                    value: 'Influence %', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }} 
                />
                <Tooltip 
                  formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Influence']}
                  labelFormatter={(label) => `Smart Score: ${label}`}
                />
                <Legend verticalAlign="top" />
                <Bar 
                  dataKey="influence" 
                  name="YES Traders" 
                  fill={YES_COLOR} 
                  stackId="a"
                />
                <Bar 
                  dataKey="influence" 
                  name="NO Traders" 
                  fill={NO_COLOR} 
                  stackId="b"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {visualizationType === "smartCapital" && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={smartCapitalData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: { name: string, percent: number }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                >
                  {smartCapitalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
          
          {visualizationType === "heatmap" && (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 70, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="smartScore" 
                  name="Smart Score" 
                  domain={[-100, 100]}
                  label={{ 
                    value: 'Smart Score', 
                    position: 'bottom', 
                    offset: 0 
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="dollarPosition" 
                  name="Position Size" 
                  label={{ 
                    value: 'Position Size (log scale)', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <ZAxis
                  type="number"
                  dataKey="influence"
                  range={[20, 600]}
                  name="Influence"
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Smart Score') return [value, name];
                    if (name === 'Position Size') return [`$${Math.pow(10, Number(value)/10).toFixed(2)}`, 'Position Size'];
                    if (name === 'Influence') return [`${Number(value).toFixed(2)}%`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Scatter
                  name="YES Traders"
                  data={scatterData.filter(d => d.sentiment === 'yes')}
                  fill={YES_COLOR}
                />
                <Scatter
                  name="NO Traders"
                  data={scatterData.filter(d => d.sentiment === 'no')}
                  fill={NO_COLOR}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
          
          {visualizationType === "topInfluencers" && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topInfluencersData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" label={{ value: 'Influence %', position: 'bottom' }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, 'Influence']} />
                <Legend />
                <Bar 
                  dataKey="influence" 
                  name="Trader Influence"
                >
                  {topInfluencersData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.sentiment === "yes" ? YES_COLOR : NO_COLOR} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TraderVisualization; 