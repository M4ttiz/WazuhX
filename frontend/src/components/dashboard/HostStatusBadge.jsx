import { HOST_STATUS } from '../../utils/dashboardMappers';

const STYLES = {
  [HOST_STATUS.OK]: 'bg-[rgba(115,191,105,0.15)] text-[#73bf69] border-[rgba(115,191,105,0.3)]',
  [HOST_STATUS.WARNING]: 'bg-[rgba(245,166,35,0.15)] text-[#f5a623] border-[rgba(245,166,35,0.3)]',
  [HOST_STATUS.DOWN]: 'bg-[rgba(242,73,92,0.15)] text-[#f2495c] border-[rgba(242,73,92,0.3)]',
};

export default function HostStatusBadge({ status }) {
  const cls = STYLES[status] || STYLES[HOST_STATUS.DOWN];
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
}
