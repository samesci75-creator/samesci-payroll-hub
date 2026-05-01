import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';

interface DailyPointage {
  date: string;
  label: string;
  presents: number;
  valides: number;
}

interface MonthlyPaiement {
  date: string;
  label: string;
  montant: number;
}

interface DashboardChartsProps {
  dailyPointages: DailyPointage[];
  monthlyPaiements: MonthlyPaiement[];
}

export const DashboardCharts = ({ dailyPointages, monthlyPaiements }: DashboardChartsProps) => {
  return (
    <div className="grid gap-4 mt-8 lg:grid-cols-2">
      <Card className="col-span-1 border-none shadow-2xl bg-slate-900/40 backdrop-blur-md playful-section-hover overflow-hidden transition-all duration-500 group">
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg flex items-center gap-2">
            Pointages – 30 derniers jours
            <span className="h-2 w-2 rounded-full bg-success animate-ping" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 bg-slate-950/20 backdrop-blur-sm rounded-b-xl border-t border-white/5 relative z-0">
          <ChartContainer config={{
            presents: { label: 'Présents', color: '#D32F2F' },
            valides: { label: 'Validés', color: '#5C6288' },
          }} className="h-[250px] sm:h-[300px] w-full">
            <AreaChart 
              data={dailyPointages} 
              margin={{ top: 20, right: 0, left: -35, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPresents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#D32F2F" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorValides" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5C6288" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#5C6288" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} interval={4} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-900 border-slate-700 shadow-2xl" />} />
              <Area 
                type="monotone" 
                dataKey="presents" 
                stroke="#D32F2F" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorPresents)" 
                animationDuration={1500}
                className="animate-water-wave origin-bottom"
              />
              <Area 
                type="monotone" 
                dataKey="valides" 
                stroke="#5C6288" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValides)" 
                animationDuration={2000}
                className="animate-water-wave origin-bottom [animation-delay:1s]"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-1 border-none shadow-2xl bg-slate-900/40 backdrop-blur-md playful-section-hover overflow-hidden transition-all duration-500 group">
        <CardHeader className="relative z-10">
          <CardTitle className="text-lg flex items-center gap-2">
            Paiements – 30 derniers jours
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 bg-slate-950/20 backdrop-blur-sm rounded-b-xl border-t border-white/5 relative z-0">
          <ChartContainer config={{
            montant: { label: 'Montant (FCFA)', color: '#D32F2F' },
          }} className="h-[250px] sm:h-[300px] w-full">
            <AreaChart 
              data={monthlyPaiements} 
              margin={{ top: 20, right: 0, left: -30, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D32F2F" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#D32F2F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}k`} />
              <ChartTooltip content={<ChartTooltipContent className="bg-slate-900 border-slate-700 shadow-2xl" />} />
              <Area 
                type="monotone" 
                dataKey="montant" 
                stroke="#D32F2F" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMontant)"
                animationDuration={2500}
                className="animate-radio-signal"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
