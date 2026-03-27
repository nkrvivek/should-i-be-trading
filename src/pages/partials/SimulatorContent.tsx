/**
 * Strategy Simulator content — wraps the existing StrategiesPage content.
 * Used as a sub-tab within SignalsPage. Provides execution context.
 */

import { useState, useCallback } from "react";
import StrategiesPage from "../StrategiesPage";
import OrderReviewModal from "../../components/trading/OrderReviewModal";
import { useBrokerStore } from "../../stores/brokerStore";
import type { StrategySuggestion } from "../../lib/portfolio/strategyAnalyzer";

export default function SimulatorContent() {
  const connections = useBrokerStore((s) => s.connections);
  const canExecute = connections.some((c) => c.slug !== "snaptrade");
  const [modal, setModal] = useState<{ symbol: string; price: number; suggestion: StrategySuggestion } | null>(null);

  const handleExecute = useCallback((symbol: string, price: number, suggestion: StrategySuggestion) => {
    setModal({ symbol, price, suggestion });
  }, []);

  return (
    <>
      <StrategiesPage onExecute={handleExecute} canExecute={canExecute} />
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
