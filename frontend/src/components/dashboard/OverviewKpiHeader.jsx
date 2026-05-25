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
  { key: 'totalHosts', label: 'Total Hosts', variant: 'info', icon: Server },
  { key: 'upHosts', label: 'Up Hosts', variant: 'ok', icon: CheckCircle },
  { key: 'warningHosts', label: 'Warning Hosts', variant: 'warning', icon: AlertTriangle },
  { key: 'criticalHosts', label: 'Critical Hosts', variant: 'critical', icon: AlertOctagon },
  { key: 'downHosts', label: 'Down Hosts', variant: 'critical', icon: XCircle },
  { key: 'totalServices', label: 'Total Services', variant: 'accent', icon: Layers },
  { key: 'problems', label: 'Problems', variant: 'warning', icon: AlertTriangle },
  { key: 'unchecked', label: 'Unchecked', variant: 'info', icon: HelpCircle },
];

export default function OverviewKpiHeader({ kpis, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
      {KPI_CONFIG.map(({ key, label, variant, icon }) => (
        <KpiCard
          key={key}
          hero
          label={label}
          value={kpis?.[key] ?? 0}
          variant={variant}
          icon={icon}
          loading={loading}
        />
      ))}
    </div>
  );
}
