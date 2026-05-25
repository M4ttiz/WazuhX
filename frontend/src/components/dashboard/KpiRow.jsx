import {
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Layers,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';
import KpiCard from '../KpiCard';

const KPI_CONFIG = [
  { key: 'totalHosts', label: 'Total Hosts', variant: 'info', icon: Server, pctKey: null },
  { key: 'upHosts', label: 'Up Hosts', variant: 'ok', icon: CheckCircle, pctKey: 'upHostsPct' },
  { key: 'warningHosts', label: 'Warning Hosts', variant: 'warning', icon: AlertTriangle, pctKey: 'warningHostsPct' },
  { key: 'criticalHosts', label: 'Critical Hosts', variant: 'critical', icon: AlertOctagon, pctKey: null },
  { key: 'downHosts', label: 'Down Hosts', variant: 'critical', icon: XCircle, pctKey: 'downHostsPct' },
  { key: 'totalServices', label: 'Total Services', variant: 'accent', icon: Layers, pctKey: null },
  { key: 'problems', label: 'Problems', variant: 'warning', icon: AlertTriangle, pctKey: null },
  { key: 'unchecked', label: 'Unchecked', variant: 'info', icon: HelpCircle, pctKey: null },
];

export default function KpiRow({ kpis, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {KPI_CONFIG.map(({ key, label, variant, icon, pctKey }) => {
        const value = kpis?.[key] ?? 0;
        const sub = pctKey != null && kpis ? `${kpis[pctKey]}%` : undefined;
        return (
          <KpiCard
            key={key}
            hero
            label={label}
            value={value}
            sub={sub}
            variant={variant}
            icon={icon}
            loading={loading}
          />
        );
      })}
    </div>
  );
}
