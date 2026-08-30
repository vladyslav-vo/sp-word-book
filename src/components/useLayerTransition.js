import { useLayoutEffect, useRef, useState } from "react";

export function useLayerTransition(layerKey, node, transitionData = {}) {
  const [settledLayer, setSettledLayer] = useState({ key: layerKey, node });
  const [transition, setTransition] = useState(null);
  const settledLayerRef = useRef(settledLayer);
  const settledNodeRef = useRef(node);
  const nextLayerRef = useRef({ node, transitionData });
  nextLayerRef.current = { node, transitionData };

  if (!transition && settledLayer.key === layerKey) settledNodeRef.current = node;

  useLayoutEffect(() => {
    const settled = settledLayerRef.current;
    if (settled.key === layerKey) return;
    const next = nextLayerRef.current;
    setTransition({
      ...next.transitionData,
      outgoing: { ...settled, node: settledNodeRef.current },
      incoming: { key: layerKey, node: next.node }
    });
  }, [layerKey]);

  function completeTransition() {
    if (!transition) return false;
    settledNodeRef.current = transition.incoming.node;
    settledLayerRef.current = transition.incoming;
    setSettledLayer(transition.incoming);
    setTransition(null);
    return true;
  }

  return {
    settledLayer,
    transition,
    activeNode: settledLayer.key === layerKey ? node : settledLayer.node,
    completeTransition
  };
}
