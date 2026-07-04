type ChartSummary = {
  id: string;
  title: string;
  sourceKey: string;
  href: string;
};

type ChartListProps = {
  charts: ChartSummary[];
};

export function ChartList({ charts }: ChartListProps) {
  return (
    <ul className="chart-list">
      {charts.map((chart) => (
        <li key={chart.id}>
          <a href={chart.href}>
            <span>{chart.title}</span>
            <small>{chart.sourceKey}</small>
          </a>
        </li>
      ))}
    </ul>
  );
}
