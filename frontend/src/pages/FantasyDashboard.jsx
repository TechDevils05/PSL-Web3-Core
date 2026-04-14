import PlayerCard from "../components/PlayerCard";
import { players } from "../data/mockData";

function FilterPanel({ title, children }) {
  return (
    <section className="ui-hover-panel rounded-xl border border-white/10 bg-[#24381a]/72 p-4 backdrop-blur-md">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-cyan-200">{title}</h3>
      {children}
    </section>
  );
}

function FantasyDashboard() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <FilterPanel title="Filter by Team">
          <div className="grid grid-cols-3 gap-2">
            {["LQ", "KK", "IU", "MS"].map((code) => (
              <div
                key={code}
                className="ui-hover-chip flex h-10 cursor-pointer items-center justify-center rounded-full border border-lime-200/20 bg-lime-300/20 text-xs font-bold text-white"
              >
                {code}
              </div>
            ))}
          </div>
        </FilterPanel>
        <FilterPanel title="Filter by Role">
          <div className="flex flex-wrap gap-2 text-xs">
            {["Batsman", "Bowler", "All-Rounder"].map((role) => (
              <span key={role} className="ui-hover-chip cursor-pointer rounded-full border border-lime-300/45 bg-lime-300/10 px-3 py-1 text-lime-100">
                {role}
              </span>
            ))}
          </div>
        </FilterPanel>
        <FilterPanel title="Player Stats">
          <div className="space-y-2 text-xs text-zinc-200">
            {["Strike Rate", "Average", "Economy", "Catches"].map((entry) => (
              <div key={entry} className="ui-hover-chip flex cursor-pointer items-center justify-between rounded-md px-2 py-1">
                <span>{entry}</span>
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
              </div>
            ))}
          </div>
        </FilterPanel>
      </aside>

      <main className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {players.map((player, idx) => (
          <PlayerCard key={player.id} player={player} isActive={idx === 3 || idx === 7} />
        ))}
      </main>
    </div>
  );
}

export default FantasyDashboard;
