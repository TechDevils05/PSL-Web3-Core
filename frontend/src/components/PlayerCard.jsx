import { useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";

const rarityBorder = {
  legendary: "border-amber-300/90 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
  common: "border-lime-300/70 shadow-[0_0_14px_rgba(163,230,53,0.3)]",
};

function initialsFromName(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PlayerCard({ player, isActive = false, compact = false, className = "", trading = false }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1, glareX: 50, glareY: 50 });

  const maxTilt = 15;

  function handleMouseMove(event) {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const percentX = x / rect.width;
    const percentY = y / rect.height;
    const offsetX = percentX - 0.5;
    const offsetY = percentY - 0.5;

    setTilt({
      rotateX: -(offsetY * maxTilt * 2),
      rotateY: offsetX * maxTilt * 2,
      scale: 1.05,
      glareX: percentX * 100,
      glareY: percentY * 100,
    });
  }

  function handleMouseLeave() {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1, glareX: 50, glareY: 50 });
  }

  return (
    <article
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(${tilt.scale}, ${tilt.scale}, ${tilt.scale})`,
        transition: "transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
      }}
      className={`relative overflow-hidden rounded-xl border bg-[#1a2814]/72 ${
        rarityBorder[player.rarity] ?? rarityBorder.common
      } ${isActive ? "animate-pulseGlow border-cyan-300 shadow-cyanStrong" : ""} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10 mix-blend-screen"
        style={{
          background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.3) 0%, rgba(103,232,249,0.2) 18%, rgba(56,189,248,0.08) 36%, rgba(0,0,0,0) 64%)`,
          opacity: 0.85,
          transition: "background-position 120ms ease-out, opacity 200ms ease-out",
        }}
      />
      <div
        className={`relative z-20 border-b border-lime-100/10 bg-gradient-to-b from-lime-300/24 via-green-300/14 to-transparent ${
          compact ? "p-2" : "p-3"
        }`}
      >
        <div
          className={`mx-auto flex items-center justify-center rounded-full border border-lime-200/30 bg-gradient-to-br from-lime-400/35 to-green-400/28 font-bold text-white ${
            compact ? "h-12 w-12 text-sm" : "h-16 w-16 text-lg"
          }`}
        >
          {initialsFromName(player.name)}
        </div>
        <p className={`mt-2 truncate text-center font-bold uppercase text-white ${compact ? "text-xs" : "text-sm"}`}>
          {player.name}
        </p>
        <p className={`text-center uppercase tracking-widest text-zinc-300 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {player.team}
        </p>
      </div>

      <div
        className={`relative z-20 space-y-1 text-zinc-200 ${compact ? "px-2 py-1 text-[10px]" : "min-h-20 px-3 py-2 text-[11px]"}`}
      >
        {trading ? (
          <>
            <p>Current Bid: {player.currentBid}</p>
            <p>Buy Now: {player.buyNow}</p>
            <p>Time Left: {player.timeLeft}</p>
          </>
        ) : (
          <>
            <p>Rating: {player.rating}</p>
            {!compact && <p>Strike Rate: {player.strikeRate}</p>}
            <p>{compact ? `Role: ${player.role}` : `Economy: ${player.economy}`}</p>
          </>
        )}
      </div>

      {!compact && (
        <div className="relative z-20 flex items-center justify-between border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-300">
          <span>{player.role}</span>
          <span className="inline-flex items-center gap-1 text-cyan-200">
            <ShieldCheck className="h-3 w-3" />
            {player.points} pts
          </span>
        </div>
      )}
    </article>
  );
}

export default PlayerCard;
