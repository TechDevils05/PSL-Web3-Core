import PlayerCard from "../components/PlayerCard";
import { players } from "../data/mockData";

const formation = [
  { left: "50%", top: "14%" },
  { left: "35%", top: "24%" },
  { left: "65%", top: "24%" },
  { left: "22%", top: "40%" },
  { left: "40%", top: "40%" },
  { left: "60%", top: "40%" },
  { left: "78%", top: "40%" },
  { left: "16%", top: "62%" },
  { left: "36%", top: "67%" },
  { left: "64%", top: "67%" },
  { left: "84%", top: "62%" },
];

function MyTeam() {
  const eleven = players.slice(0, 11);

  return (
    <section className="relative min-h-[820px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#162311] via-[#2c421c]/80 to-[#0a0e08] p-4 md:p-6">
      <div className="pointer-events-none absolute inset-6 rounded-2xl border border-white/15" />
      <div className="pointer-events-none absolute bottom-[14%] left-1/2 h-24 w-48 -translate-x-1/2 rounded border-2 border-pitch-line/70" />
      <div className="pointer-events-none absolute bottom-[20%] left-1/2 h-2 w-56 -translate-x-1/2 bg-pitch-line/70" />

      <div className="ui-hover-panel absolute right-4 top-4 z-20 rounded-xl border border-white/20 bg-[#1e2e17]/70 p-4 shadow-cyanGlow backdrop-blur-md">
        <h3 className="text-sm font-semibold text-lime-100">Team Score Prediction: 425 pts</h3>
        <ul className="mt-2 space-y-1 text-xs text-zinc-100">
          <li>3x Captain Multiplier</li>
          <li>1.5x Bowler Boost</li>
        </ul>
      </div>

      <h2 className="relative z-10 mb-4 text-xl font-bold uppercase tracking-wide text-zinc-100">My Fantasy Best 11</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {eleven.map((player, index) => (
          <PlayerCard key={player.id} player={player} isActive={index === 0 || index === 4} compact />
        ))}
      </div>

      <div className="relative hidden h-[720px] lg:block">
        {eleven.map((player, index) => (
          <div
            key={player.id}
            className="absolute w-[128px] -translate-x-1/2 xl:w-[140px]"
            style={{ left: formation[index].left, top: formation[index].top }}
          >
            <PlayerCard player={player} isActive={index === 3 || index === 4} compact />
          </div>
        ))}
      </div>
    </section>
  );
}

export default MyTeam;
