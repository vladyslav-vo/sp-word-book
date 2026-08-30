import { useRef, useState } from "react";

export function useViewNavigation(initialScreen = "cards") {
  const [screen, setScreen] = useState(initialScreen);
  const [transitionDirection, setTransitionDirection] = useState("forward");
  const [isScreenTransitioning, setIsScreenTransitioning] = useState(false);
  const transitionLockRef = useRef(false);
  const viewHistoryRef = useRef([initialScreen]);

  function beginViewTransition(nextView) {
    if (transitionLockRef.current) return false;
    const history = viewHistoryRef.current;
    const previousView = history.at(-2);
    const direction = previousView === nextView ? "backward" : "forward";

    viewHistoryRef.current = direction === "backward"
      ? history.slice(0, -1)
      : [...history, nextView];
    transitionLockRef.current = true;
    setIsScreenTransitioning(true);
    setTransitionDirection(direction);
    return true;
  }

  function finishViewTransition() {
    transitionLockRef.current = false;
    setIsScreenTransitioning(false);
  }

  function isTransitionLocked() {
    return transitionLockRef.current;
  }

  return {
    screen,
    setScreen,
    transitionDirection,
    isScreenTransitioning,
    beginViewTransition,
    finishViewTransition,
    isTransitionLocked
  };
}
