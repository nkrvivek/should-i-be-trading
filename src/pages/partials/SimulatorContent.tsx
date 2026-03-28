/**
 * Strategy Simulator content — wraps the existing StrategiesPage content.
 * Used as a sub-tab within SignalsPage. Provides execution context.
 */

import { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import StrategiesPage from "../StrategiesPage";
import OrderReviewModal from "../../components/trading/OrderReviewModal";
import { useBrokerStore } from "../../stores/brokerStore";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";
import type { SimulatorLeg } from "../../lib/strategy/payoff";

export default function SimulatorContent() {
  const connections = useBrokerStore((s) => s.connections);
  const canExecute = connections.length > 0;
  const location = useLocation();
  const navState = location.state as { initialLegs?: SimulatorLeg[]; initialPrice?: number; initialTicker?: string } | null;
  const [modal, setModal] = useState<{ symbol: string; price: number; suggestion: StrategySuggestion } | null>(null);

  const handleExecute = useCallback((symbol: string, price: number, suggestion: StrategySuggestion) => {
    setModal({ symbol, price, suggestion });
  }, []);

  return (
    <>
      <StrategiesPage
        onExecute={handleExecute}
        canExecute={canExecute}
        initialSimLegs={navState?.initialLegs}
        initialSimPrice={navState?.initialPrice}
        initialSimTicker={navState?.initialTicker}
      />
      {modal && (
        <OrderReviewModal
          symbol={modal.symbol}
          currentPrice={modal.price}
          suggestion={modal.suggestion}
          onClose={() => setModal(null)}
          onComplete={() => setModal(null)}
          onViewOrders={() => setModal(null)}
        />
      )}
    </>
  );
}
