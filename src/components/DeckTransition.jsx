import { useLayerTransition } from "./useLayerTransition.js";

export function DeckTransition({ viewKey, direction, children, onSettled }) {
  const { settledLayer, transition, activeNode, completeTransition } = useLayerTransition(viewKey, children, { direction });

  function finishTransition(event) {
    if (event.target !== event.currentTarget || !completeTransition()) return;
    onSettled();
  }

  if (!transition) {
    return <div className="deck-stage"><div className="deck-layer deck-layer-active" key={settledLayer.key}>{activeNode}</div></div>;
  }

  const forward = transition.direction === "forward";
  return (
    <div className={`deck-stage deck-transitioning deck-${transition.direction}`} aria-busy="true">
      <div
        className="deck-layer deck-layer-outgoing"
        key={transition.outgoing.key}
        aria-hidden="true"
        onAnimationEnd={forward ? undefined : finishTransition}
      >
        {transition.outgoing.node}
      </div>
      <div
        className="deck-layer deck-layer-incoming"
        key={transition.incoming.key}
        onAnimationEnd={forward ? finishTransition : undefined}
      >
        {transition.incoming.node}
      </div>
    </div>
  );
}
