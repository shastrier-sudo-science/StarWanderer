import { useState } from "react";
import type { GameEngine } from "./GameEngine";
import type { PlayerState, Station } from "./types";
import { COMMODITIES, UPGRADES, SHIP_STATS } from "./data";

interface Props {
  engine: GameEngine;
  station: Station;
  player: PlayerState;
}

export function StationUI({ engine, station, player }: Props) {
  const [tab, setTab] = useState<"trade" | "missions" | "upgrades" | "shipyard">("trade");
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const tabs = ["trade", "missions", "upgrades", "shipyard"] as const;

  const getAmount = (id: string) => amounts[id] || 1;

  const calcPrice = (commodity: string, amount: number) => {
    const base = station.prices[commodity] || 0;
    const supply = station.supply[commodity] || 50;
    const demand = station.demand[commodity] || 50;
    const dynamic = base * (1 + (demand - supply) / 100);
    return Math.max(1, Math.floor(dynamic * amount));
  };

  const cargoUsed = player.cargo.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="station-ui">
      <div className="station-header">
        <div>
          <h1 className="station-name">{station.name}</h1>
          <p className="station-system">System: {engine.state.systems[player.currentSystemId]?.name}</p>
        </div>
        <div className="player-info">
          <span className="credits">◈ {Math.floor(player.credits)} CR</span>
          <span className="cargo-info">Cargo: {cargoUsed}/{player.cargoCapacity}</span>
        </div>
      </div>

      <div className="tab-bar">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <button className="undock-btn" onClick={() => engine.undock()}>
          ⚡ UNDOCK
        </button>
      </div>

      <div className="tab-content">
        {tab === "trade" && (
          <div className="trade-panel">
            <div className="trade-grid">
              <div className="trade-header-row">
                <span>COMMODITY</span>
                <span>BUY</span>
                <span>SELL</span>
                <span>YOUR CARGO</span>
                <span>QTY</span>
                <span>ACTION</span>
              </div>
              {COMMODITIES.map(com => {
                const buyPrice = calcPrice(com.id, 1);
                const sellPrice = Math.floor(buyPrice * 0.88);
                const inCargo = player.cargo.find(c => c.commodity === com.id);
                const qty = getAmount(com.id);
                const canBuy = player.credits >= buyPrice * qty && cargoUsed + qty <= player.cargoCapacity;
                const canSell = (inCargo?.amount || 0) >= qty;
                const profit = inCargo ? sellPrice - inCargo.buyPrice : 0;
                return (
                  <div key={com.id} className="trade-row">
                    <span className="commodity-name" style={{ color: com.color }}>{com.name}</span>
                    <span className="price-buy">{buyPrice} CR</span>
                    <span className="price-sell">
                      {sellPrice} CR
                      {inCargo && (
                        <span className={profit >= 0 ? "profit-pos" : "profit-neg"}>
                          {" "}({profit >= 0 ? "+" : ""}{Math.floor(profit)})
                        </span>
                      )}
                    </span>
                    <span className="cargo-amount">{inCargo ? `${inCargo.amount}t` : "—"}</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={qty}
                      className="qty-input"
                      onChange={e => setAmounts(a => ({ ...a, [com.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                    />
                    <div className="action-btns">
                      <button
                        className={`buy-btn ${!canBuy ? "disabled" : ""}`}
                        disabled={!canBuy}
                        onClick={() => engine.buyItem(station.id, com.id, qty)}
                      >BUY</button>
                      <button
                        className={`sell-btn ${!canSell ? "disabled" : ""}`}
                        disabled={!canSell}
                        onClick={() => engine.sellItem(station.id, com.id, qty)}
                      >SELL</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="trade-tip">
              Tip: Buy low in supply-heavy systems, sell high in demand-heavy ones. Prices fluctuate over time.
            </div>
          </div>
        )}

        {tab === "missions" && (
          <div className="missions-panel">
            <div className="missions-header">
              <h2>Available Missions ({station.missions.length})</h2>
              <span className="active-count">Active: {player.activeMissions.length}/4</span>
            </div>
            {station.missions.length === 0 ? (
              <div className="empty-state">No missions available. Check back later.</div>
            ) : (
              <div className="mission-list">
                {station.missions.map(m => (
                  <div key={m.id} className={`mission-card ${m.type}`}>
                    <div className="mission-top">
                      <span className={`mission-type-badge ${m.type}`}>{m.type.toUpperCase()}</span>
                      <span className="mission-reward">+{m.reward} CR / +{m.xpReward} XP</span>
                    </div>
                    <h3 className="mission-title">{m.title}</h3>
                    <p className="mission-desc">{m.description}</p>
                    <button
                      className="accept-btn"
                      disabled={player.activeMissions.length >= 4}
                      onClick={() => engine.acceptMission(station.id, m.id)}
                    >
                      ACCEPT MISSION
                    </button>
                  </div>
                ))}
              </div>
            )}
            {player.activeMissions.length > 0 && (
              <div className="active-missions">
                <h2>Your Active Missions</h2>
                {player.activeMissions.map(m => (
                  <div key={m.id} className={`mission-card active ${m.type}`}>
                    <div className="mission-top">
                      <span className={`mission-type-badge ${m.type}`}>{m.type.toUpperCase()}</span>
                      <span className="mission-reward">+{m.reward} CR</span>
                    </div>
                    <h3 className="mission-title">{m.title}</h3>
                    <p className="mission-desc">{m.description}</p>
                    {m.type === "combat" && m.killsRequired && (
                      <div className="progress-bar-wrap">
                        <div
                          className="progress-bar"
                          style={{ width: `${((m.killCount || 0) / m.killsRequired) * 100}%` }}
                        />
                        <span>{m.killCount || 0}/{m.killsRequired} kills</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "upgrades" && (
          <div className="upgrades-panel">
            <h2>Ship Upgrades</h2>
            <div className="ship-stats-panel">
              <h3>Current Ship: {player.shipStats.name}</h3>
              <div className="stats-grid">
                <StatBar label="Speed" value={player.shipStats.speed} max={7} unit="" color="#00ffcc" />
                <StatBar label="Shield" value={player.shipStats.maxShield} max={200} unit="HP" color="#4466ff" />
                <StatBar label="Hull" value={player.shipStats.maxHull} max={200} unit="HP" color="#ff4444" />
                <StatBar label="Cargo" value={player.shipStats.cargoCapacity} max={150} unit="t" color="#ffaa44" />
                <StatBar label="Fire Rate" value={24 - player.shipStats.fireRate} max={20} unit="" color="#ff88ff" />
                <StatBar label="Damage" value={player.shipStats.bulletDamage} max={40} unit="" color="#ffdd44" />
              </div>
            </div>
            <div className="upgrade-list">
              {UPGRADES.map(upg => {
                const canAfford = player.credits >= upg.cost;
                return (
                  <div key={upg.id} className={`upgrade-card ${!canAfford ? "unaffordable" : ""}`}>
                    <div className="upgrade-top">
                      <span className="upgrade-name">{upg.name}</span>
                      <span className="upgrade-cost">{upg.cost} CR</span>
                    </div>
                    <p className="upgrade-desc">{upg.description}</p>
                    <button
                      className="upgrade-btn"
                      disabled={!canAfford}
                      onClick={() => engine.buyUpgrade(upg.id)}
                    >
                      {canAfford ? "INSTALL" : "INSUFFICIENT CREDITS"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "shipyard" && (
          <div className="shipyard-panel">
            <h2>Shipyard</h2>
            <p className="shipyard-note">Purchase a new ship. Your current cargo will be lost on ship change.</p>
            <div className="ship-list">
              {Object.values(SHIP_STATS).map(ship => {
                const isCurrent = player.shipStats.type === ship.type;
                const canAfford = player.credits >= ship.cost;
                return (
                  <div key={ship.type} className={`ship-card ${isCurrent ? "current" : ""} ${!canAfford && !isCurrent ? "unaffordable" : ""}`}>
                    <div className="ship-top">
                      <span className="ship-name">{ship.name}</span>
                      {isCurrent ? (
                        <span className="current-badge">CURRENT</span>
                      ) : (
                        <span className="ship-cost">{ship.cost === 0 ? "Starter" : `${ship.cost} CR`}</span>
                      )}
                    </div>
                    <div className="ship-specs">
                      <div className="spec"><label>Speed</label><span>{ship.speed}</span></div>
                      <div className="spec"><label>Shield</label><span>{ship.maxShield}</span></div>
                      <div className="spec"><label>Hull</label><span>{ship.maxHull}</span></div>
                      <div className="spec"><label>Cargo</label><span>{ship.cargoCapacity}t</span></div>
                      <div className="spec"><label>Damage</label><span>{ship.bulletDamage}</span></div>
                    </div>
                    {!isCurrent && (
                      <button
                        className="buy-ship-btn"
                        disabled={!canAfford}
                        onClick={() => engine.buyShip(ship.type)}
                      >
                        {canAfford ? `BUY ${ship.name.toUpperCase()}` : "INSUFFICIENT CREDITS"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="stat-bar-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-bg">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="stat-value" style={{ color }}>{typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value}{unit}</span>
    </div>
  );
}
