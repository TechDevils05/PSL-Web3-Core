import { topBatsmen, topBowlers } from "../data/mockData";

function StatList({ title, rows, leftKey, rightKey }) {
  return (
    <section className="ui-hover-panel rounded-xl border border-white/10 bg-[#24381a]/72 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-lime-100">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.name}
            className="ui-hover-chip flex cursor-pointer items-center justify-between rounded-md border border-lime-100/10 bg-[#1f2d17]/88 px-3 py-2 text-xs text-zinc-100"
          >
            <p className="font-medium">{row.name}</p>
            <div className="text-right">
              <p>{leftKey}: {row[leftKey]}</p>
              <p>{rightKey}: {row[rightKey]}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  return (
    <div className="columns-1 gap-4 space-y-4 md:columns-2">
      <StatList title="Top Batsmen" rows={topBatsmen} leftKey="runs" rightKey="avg" />
      <StatList title="Top Bowlers" rows={topBowlers} leftKey="wickets" rightKey="economy" />
      <StatList title="Fantasy Points Leaders" rows={topBatsmen} leftKey="points" rightKey="avg" />
      <StatList title="Bowling Impact" rows={topBowlers} leftKey="points" rightKey="economy" />
    </div>
  );
}

export default Stats;
