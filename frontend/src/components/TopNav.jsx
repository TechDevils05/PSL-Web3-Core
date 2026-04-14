import { Home, UserCircle2 } from "lucide-react";
import { navItems } from "../data/mockData";

function TopNav({ activeView, onChange }) {
  return (
    <header className="sticky top-0 z-40 border-b border-lime-300/25 bg-[#182413]/78 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-2 text-emerald-100">
          <span className="rounded-full border border-cyan-400/50 bg-cyan-500/10 p-2">
            <Home className="h-4 w-4 text-cyan-300" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] md:text-base">PSL Fantasy League</p>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={`ui-hover-btn relative rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide ${
                  active ? "text-cyan-300 shadow-cyanGlow" : "text-zinc-300 hover:text-cyan-200 hover:bg-cyan-500/10"
                }`}
              >
                {item.label}
                {active && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded bg-cyan-400" />}
              </button>
            );
          })}
        </nav>

        <button className="ui-hover-btn rounded-full border border-white/20 bg-white/5 p-1 text-zinc-300 hover:border-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
          <UserCircle2 className="h-8 w-8" />
        </button>
      </div>
    </header>
  );
}

export default TopNav;
