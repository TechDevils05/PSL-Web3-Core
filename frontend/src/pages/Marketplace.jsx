import PlayerCard from "../components/PlayerCard";
import { players } from "../data/mockData";

function Marketplace() {
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="ui-hover-panel space-y-4 rounded-xl border border-white/10 bg-[#24381a]/72 p-4 backdrop-blur-md">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-lime-100">Market Filters</h3>
        <div className="space-y-2 text-xs text-zinc-200">
          {["Sort by Price", "Filter by Role", "Tier", "Price Range"].map((item) => (
            <div key={item} className="ui-hover-chip cursor-pointer rounded-md border border-lime-100/10 bg-[#1f2d17]/88 p-2">
              {item}
            </div>
          ))}
        </div>
      </aside>
      <main className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {players.slice(0, 9).map((player) => (
          <PlayerCard key={player.id} player={player} trading />
        ))}
      </main>
    </div>
  );
}

export default Marketplace;
