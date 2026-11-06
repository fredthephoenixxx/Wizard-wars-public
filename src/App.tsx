import React, { useEffect, useRef, useState } from 'react';
import { WizardWarsEngine } from './engine';
import { sfx } from './audio';
import { VisualCard } from './canvas/VisualCard';
import { FloatingText, Projectile, VisualParticle } from './canvas/AnimationObjects';
import { getLayoutMetrics, getVisualCoordinates } from './utils';
import { CARD_TEMPLATES, FACTIONS, GAME_VERSION, CHANGELOG } from './constants';
import { Card, LogItem } from './types';

// Subcomponents
import PortraitGuard from './components/PortraitGuard';
import SplashScreen from './components/SplashScreen';
import DevDrawer from './components/DevDrawer';
import GameOverOverlay from './components/GameOverOverlay';
import CardInspectorModal from './components/CardInspectorModal';
import OptionsModal from './components/OptionsModal';
import { Settings, Volume2, VolumeX, Play, Pause, FastForward } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WizardWarsEngine | null>(null);

  // Visual/Animation Refs to prevent state mutations from triggering unnecessary full React re-renders of Canvas
  const visualCardsMap = useRef<Map<string, VisualCard>>(new Map());
  const projectiles = useRef<Projectile[]>([]);
  const floatingTexts = useRef<FloatingText[]>([]);
  const particles = useRef<VisualParticle[]>([]);
  const screenShake = useRef<number>(0);

  // React State for HUD counters & Controls (so React knows when engine changes)
  const [currentTurn, setCurrentTurn] = useState<number>(1);
  const [activePlayer, setActivePlayer] = useState<'P1' | 'P2'>('P1');
  const [phase, setPhase] = useState<string>('TICK');
  const [combatSlotIndex, setCombatSlotIndex] = useState<number>(-1);
  const [winner, setWinner] = useState<'P1' | 'P2' | null>(null);
  const [gameEnded, setGameEnded] = useState<boolean>(false);

  // App UI State
  const [screenState, setScreenState] = useState<'SPLASH' | 'MAIN_MENU' | 'CHANGELOG' | 'ARENA' | 'LIBRARY' | 'DECK_SELECTION'>('SPLASH');
  const [libraryView, setLibraryView] = useState<'CODEX' | 'GLOSSARY'>('CODEX');
  const [selectedCodexCard, setSelectedCodexCard] = useState<any | null>(null);
  const [splashActive, setSplashActive] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);
  const [stepDelay, setStepDelay] = useState<number>(500);
  const [isFastForward, setIsFastForward] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isAutoplayRunning, setIsAutoplayRunning] = useState<boolean>(false);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 600);

  // Pre-match deck selection states
  const [p1Deck, setP1Deck] = useState<string>('Mixed');
  const [p2Deck, setP2Deck] = useState<string>('Mixed');
  const [deckSelectionStep, setDeckSelectionStep] = useState<number>(1);

  // In-Battle Card Inspector States
  const [inspectedCard, setInspectedCard] = useState<Card | null>(null);
  const [inspectedCardOwner, setInspectedCardOwner] = useState<'P1' | 'P2'>('P1');
  const [wasAutoplayRunning, setWasAutoplayRunning] = useState<boolean>(false);

  // BGM Screen Sync & Audio State Synchronization
  useEffect(() => {
    sfx.syncBgmForScreen(screenState);
  }, [screenState]);

  useEffect(() => {
    const unsubscribe = sfx.subscribe(() => {
      setIsMuted(sfx.isMasterMuted());
    });
    setIsMuted(sfx.isMasterMuted());
    return () => unsubscribe();
  }, []);

  const handleCloseInspector = () => {
    setInspectedCard(null);
    if (wasAutoplayRunning && !gameEnded) {
      setIsAutoplayRunning(true);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !engineRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (event.clientY - rect.top) * (canvas.height / rect.height);

    const engine = engineRef.current;
    const w = canvas.width;
    const h = canvas.height;

    const zones: { tag: 'P1' | 'P2'; zone: 'active' | 'bench'; slots: (Card | null)[] }[] = [
      { tag: 'P1', zone: 'active', slots: engine.p1.active },
      { tag: 'P1', zone: 'bench', slots: engine.p1.bench },
      { tag: 'P2', zone: 'active', slots: engine.p2.active },
      { tag: 'P2', zone: 'bench', slots: engine.p2.bench },
    ];

    for (const z of zones) {
      for (let i = 0; i < z.slots.length; i++) {
        const card = z.slots[i];
        if (card && !card.dead) {
          const coords = getVisualCoordinates(w, h, z.tag, z.zone, i);
          if (
            clickX >= coords.x &&
            clickX <= coords.x + coords.w &&
            clickY >= coords.y &&
            clickY <= coords.y + coords.h
          ) {
            if (isAutoplayRunning) {
              setWasAutoplayRunning(true);
              setIsAutoplayRunning(false);
            } else {
              setWasAutoplayRunning(false);
            }
            setInspectedCard(card);
            setInspectedCardOwner(z.tag);
            sfx.playCast();
            return;
          }
        }
      }
    }
  };

  const logIdCounter = useRef<number>(0);
  const autoplayTimerRef = useRef<any>(null);

  // Add Log helper
  const appendLog = (message: string, textColorClass: string = 'text-slate-300') => {
    logIdCounter.current++;
    setLogs((prev) => [
      ...prev,
      { text: message, colorClass: textColorClass, id: logIdCounter.current }
    ]);
  };

  const clearCombatLog = () => {
    setLogs([]);
    logIdCounter.current = 1;
    setLogs([
      { text: '🎮 Match Sandbox Initialized. Waiting for input actions.', colorClass: 'text-indigo-400 font-bold', id: 1 }
    ]);
  };

  // Helper mapping functions
  const spawnVisualDamageText = (text: string, x: number, y: number, color: string) => {
    floatingTexts.current.push(new FloatingText(text, x, y, color));
  };

  const findVisualCardBySlot = (playerId: 'P1' | 'P2', zone: 'active' | 'bench', index: number): VisualCard | null => {
    if (!engineRef.current) return null;
    const stateCard = engineRef.current[playerId.toLowerCase() as 'p1' | 'p2'][zone][index];
    if (stateCard) {
      return visualCardsMap.current.get(stateCard.id) || null;
    }
    return null;
  };

  // Sync canvas states from the pure Engine to visual card drawing wrappers
  const syncGameStateToVisuals = () => {
    if (!canvasRef.current || !engineRef.current) return;
    const canvas = canvasRef.current;
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;

    const stateIds = new Set<string>();

    function processCard(card: any, playerId: 'P1' | 'P2', zone: 'bench' | 'active', index: number) {
      if (!card) return;
      stateIds.add(card.id);

      const coords = getVisualCoordinates(w, h, playerId, zone, index);
      let vc = visualCardsMap.current.get(card.id);

      if (!vc) {
        const deckLoc = getVisualCoordinates(w, h, playerId, 'deck', 0);
        vc = new VisualCard(card, deckLoc.x, deckLoc.y);
        visualCardsMap.current.set(card.id, vc);
      }

      vc.targetX = coords.x;
      vc.targetY = coords.y;
      vc.targetW = coords.w;
      vc.targetH = coords.h;

      vc.hp = card.hp;
      vc.attack = card.attack;
      vc.currentDelay = card.currentDelay;
      vc.dead = card.dead;
      vc.statuses = card.statuses || [];
    }

    const engine = engineRef.current;
    ['P1', 'P2'].forEach((tagStr) => {
      const tag = tagStr as 'P1' | 'P2';
      const pState = (tag === 'P1') ? engine.p1 : engine.p2;
      for (let i = 0; i < 7; i++) {
        processCard(pState.bench[i], tag, 'bench', i);
      }
      for (let i = 0; i < 5; i++) {
        processCard(pState.active[i], tag, 'active', i);
      }
      pState.graveyard.forEach((card) => {
        stateIds.add(card.id);
        const vc = visualCardsMap.current.get(card.id);
        if (vc) {
          const graveCoords = getVisualCoordinates(w, h, tag, 'graveyard', 0);
          vc.targetX = graveCoords.x;
          vc.targetY = graveCoords.y;
          vc.targetW = graveCoords.w;
          vc.targetH = graveCoords.h;
          vc.targetScale = 0.65;
          vc.targetAlpha = 0.35;
        }
      });
    });

    for (const [id, vc] of visualCardsMap.current.entries()) {
      if (!stateIds.has(id)) {
        vc.targetAlpha = 0;
        if (vc.alpha <= 0.05) {
          visualCardsMap.current.delete(id);
        }
      }
    }
  };

  // Set up the pure engine instance once callbacks are defined
  useEffect(() => {
    engineRef.current = new WizardWarsEngine({
      appendLog,
      playSfx: (type) => {
        if (type === 'draw') sfx.playDraw();
        else if (type === 'tick') sfx.playTick();
        else if (type === 'deploy') sfx.playDeploy();
        else if (type === 'attack') sfx.playAttack();
        else if (type === 'directHit') sfx.playDirectHit();
        else if (type === 'heal') sfx.playHeal();
        else if (type === 'cast') sfx.playCast();
      },
      triggerAttackVisual: (attackerTag, attackSlot, defendSlot, isDirectHit, color) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        const m = getLayoutMetrics(w, h);

        const startCoords = getVisualCoordinates(w, h, attackerTag, 'active', attackSlot);
        let targetCoords;

        if (isDirectHit) {
          targetCoords = {
            x: m.profileX + m.profileW / 2,
            y: attackerTag === 'P1' ? m.p2BenchY + m.cardH / 2 : m.p1BenchY + m.cardH / 2,
            w: 0,
            h: 0
          };
        } else {
          const defenderTag = attackerTag === 'P1' ? 'P2' : 'P1';
          targetCoords = getVisualCoordinates(w, h, defenderTag, 'active', defendSlot);
        }

        const attCard = findVisualCardBySlot(attackerTag, 'active', attackSlot);
        if (attCard) {
          attCard.targetOffsetY = (attackerTag === 'P1') ? -m.cardH * 0.25 : m.cardH * 0.25;
          setTimeout(() => { attCard.targetOffsetY = 0; }, 200);
        }

        const sx = startCoords.x + startCoords.w / 2;
        const sy = startCoords.y + startCoords.h / 2;
        const tx = targetCoords.x + (targetCoords.w ? targetCoords.w / 2 : 0);
        const ty = targetCoords.y + (targetCoords.h ? targetCoords.h / 2 : 0);

        projectiles.current.push(
          new Projectile(sx, sy, tx, ty, color, () => {
            screenShake.current = 10;

            for (let i = 0; i < 12; i++) {
              particles.current.push(new VisualParticle(tx, ty, color));
            }

            if (!isDirectHit) {
              const defenderTag = attackerTag === 'P1' ? 'P2' : 'P1';
              const defCard = findVisualCardBySlot(defenderTag, 'active', defendSlot);
              if (defCard) {
                defCard.shakeTimer = 15;
                const pObj = attackerTag === 'P1' ? engineRef.current!.p1 : engineRef.current!.p2;
                const oppObj = attackerTag === 'P1' ? engineRef.current!.p2 : engineRef.current!.p1;
                if (pObj.active[attackSlot]) {
                  const blockReduction = (oppObj.active[defendSlot] && oppObj.active[defendSlot]!.ability && oppObj.active[defendSlot]!.ability!.type === 'Block')
                    ? (oppObj.active[defendSlot]!.ability!.value ?? 0)
                    : 0;
                  const finalDmg = Math.max(0, pObj.active[attackSlot]!.attack - blockReduction);
                  spawnVisualDamageText(`-${finalDmg}`, tx, ty - 20, '#f43f5e');
                }
              }
            } else {
              const pObj = attackerTag === 'P1' ? engineRef.current!.p1 : engineRef.current!.p2;
              if (pObj.active[attackSlot]) {
                spawnVisualDamageText(`-${pObj.active[attackSlot]!.attack}`, tx, ty, '#f59e0b');
              }
            }
          })
        );
      },
      triggerHealVisual: (playerTag, activeSlotIndex, healedAmount) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;

        const targetCoords = getVisualCoordinates(w, h, playerTag, 'active', activeSlotIndex);
        const tx = targetCoords.x + targetCoords.w / 2;
        const ty = targetCoords.y + targetCoords.h / 2;

        const defCard = findVisualCardBySlot(playerTag, 'active', activeSlotIndex);
        if (defCard) {
          defCard.hp = Math.min(defCard.maxHp, defCard.hp + healedAmount);
        }

        spawnVisualDamageText(`+${healedAmount}`, tx, ty - 25, '#10b981');

        for (let i = 0; i < 15; i++) {
          particles.current.push(new VisualParticle(tx, ty, '#10b981'));
        }
      },
      triggerAbilityVisual: (casterTag, casterSlot, targetTag, targetSlot, dmgAmount, color) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        const m = getLayoutMetrics(w, h);

        const startCoords = getVisualCoordinates(w, h, casterTag, 'active', casterSlot);
        const targetCoords = getVisualCoordinates(w, h, targetTag, 'active', targetSlot);

        const sx = startCoords.x + startCoords.w / 2;
        const sy = startCoords.y + startCoords.h / 2;
        const tx = targetCoords.x + targetCoords.w / 2;
        const ty = targetCoords.y + targetCoords.h / 2;

        const casterCard = findVisualCardBySlot(casterTag, 'active', casterSlot);
        if (casterCard) {
          casterCard.targetOffsetY = (casterTag === 'P1') ? -m.cardH * 0.15 : m.cardH * 0.15;
          setTimeout(() => { casterCard.targetOffsetY = 0; }, 200);
        }

        projectiles.current.push(
          new Projectile(sx, sy, tx, ty, color, () => {
            screenShake.current = 6;

            for (let i = 0; i < 8; i++) {
              particles.current.push(new VisualParticle(tx, ty, color));
            }

            const defCard = findVisualCardBySlot(targetTag, 'active', targetSlot);
            if (defCard) {
              defCard.shakeTimer = 10;
              defCard.hp = Math.max(0, defCard.hp - dmgAmount);
            }
            // Spawn crimson damage indicator tag on hit
            spawnVisualDamageText(`-${dmgAmount}`, tx, ty - 20, '#f43f5e');
          })
        );
      },
      triggerDelayVisual: (playerTag, benchSlotIndex, amount) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;

        const targetCoords = getVisualCoordinates(w, h, playerTag, 'bench', benchSlotIndex);
        const tx = targetCoords.x + targetCoords.w / 2;
        const ty = targetCoords.y + targetCoords.h / 2;

        const sign = amount > 0 ? `+${amount}` : `${amount}`;
        spawnVisualDamageText(sign, tx, ty - 25, '#c084fc');

        for (let i = 0; i < 10; i++) {
          particles.current.push(new VisualParticle(tx, ty, '#c084fc'));
        }
      },
      triggerFatigueVisual: (playerTag) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const w = canvas.clientWidth || canvas.width;
        const h = canvas.clientHeight || canvas.height;
        const m = getLayoutMetrics(w, h);

        const px = m.profileX + m.profileW / 2;
        const py = playerTag === 'P1' ? m.p1BenchY + m.profileH / 2 : m.p2BenchY + m.profileH / 2;

        spawnVisualDamageText('-1 [FATIGUE]', px, py - 10, '#ef4444');
        screenShake.current = 8;

        for (let i = 0; i < 10; i++) {
          particles.current.push(new VisualParticle(px, py, '#ef4444'));
        }
      },
      onGameOver: (winningPlayerTag) => {
        setWinner(winningPlayerTag);
        setGameEnded(true);
      }
    });

    clearCombatLog();
    syncGameStateToVisuals();
  }, []);

  // Sync state values to React state for UI HUD renders
  const syncEngineToReactState = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    setCurrentTurn(engine.currentTurn);
    setActivePlayer(engine.activePlayer);
    setPhase(engine.phase);
    setCombatSlotIndex(engine.combatSlotIndex);
    setWinner(engine.winner);
    setGameEnded(engine.gameEnded);
  };

  // Perform a single turn phase step
  const handleStep = () => {
    if (projectiles.current.length > 0) return; // Wait for active projectile animation completes
    if (!engineRef.current) return;

    engineRef.current.executeNextStep();
    syncGameStateToVisuals();
    syncEngineToReactState();
  };

  // Autoplay loop timer management
  const handleToggleAutoplay = () => {
    setIsAutoplayRunning((prev) => !prev);
  };

  const handleToggleFastForward = () => {
    setIsFastForward((prev) => {
      const next = !prev;
      setStepDelay(next ? 250 : 500);
      return next;
    });
  };

  const handleStepDelayChange = (newDelay: number) => {
    setStepDelay(newDelay);
    setIsFastForward(newDelay <= 300);
  };

  // Handle Autoplay timer execution
  useEffect(() => {
    if (isAutoplayRunning) {
      const runLoop = () => {
        if (projectiles.current.length === 0 && engineRef.current && !engineRef.current.gameEnded) {
          engineRef.current.executeNextStep();
          syncGameStateToVisuals();
          syncEngineToReactState();
        }

        if (engineRef.current && engineRef.current.gameEnded) {
          setIsAutoplayRunning(false);
          return;
        }

        autoplayTimerRef.current = setTimeout(runLoop, stepDelay);
      };

      autoplayTimerRef.current = setTimeout(runLoop, stepDelay);
    } else {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [isAutoplayRunning, stepDelay]);

  // Master Audio Mute Toggle Button
  const handleToggleMute = () => {
    sfx.toggleMasterMute();
  };

  // Reset Match Action
  const handleResetMatch = () => {
    setWinner(null);
    setGameEnded(false);
    setIsAutoplayRunning(false);

    if (engineRef.current) {
      engineRef.current.resetGame(p1Deck, p2Deck);
    }

    visualCardsMap.current.clear();
    projectiles.current = [];
    floatingTexts.current = [];
    particles.current = [];

    clearCombatLog();
    syncGameStateToVisuals();
    syncEngineToReactState();
    appendLog("🆕 Arena reset. Static TCG cards reloaded.", "text-indigo-400");
    sfx.playHeal();
  };

  // Return to Deck Selection Action
  const handleReturnToDeckSelection = () => {
    setWinner(null);
    setGameEnded(false);
    setIsAutoplayRunning(false);
    setScreenState('DECK_SELECTION');
    setDeckSelectionStep(1);
    sfx.playCast();
  };

  // Spawn Dev Card
  const handleSpawnCardInSandbox = (player: 'P1' | 'P2', zone: 'bench' | 'active', templateIdx: number) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const cardTemplate = CARD_TEMPLATES[templateIdx];
    const targetPlayer = player === 'P1' ? engine.p1 : engine.p2;

    const mockCard = {
      id: `${player}_dev_card_${engine.cardIdCounter++}`,
      name: cardTemplate.name,
      costDelay: cardTemplate.cost,
      currentDelay: zone === 'active' ? 0 : cardTemplate.cost,
      faction: cardTemplate.faction,
      attack: cardTemplate.attack,
      hp: cardTemplate.health,
      maxHp: cardTemplate.maxHealth,
      ability: cardTemplate.ability ? { ...cardTemplate.ability } : null,
      abilities: cardTemplate.abilities ? [...cardTemplate.abilities] : undefined,
      dead: false,
      statuses: []
    };

    if (zone === 'bench') {
      const emptySlot = targetPlayer.bench.findIndex(s => s === null);
      if (emptySlot !== -1) {
        targetPlayer.bench[emptySlot] = mockCard;
        appendLog(`🛠️ [DEV] Spawned "${mockCard.name}" onto [${player}] Bench Slot ${emptySlot + 1}.`, 'text-indigo-400');
        sfx.playCast();
      } else {
        appendLog(`⚠️ [DEV] Bench full on ${player}.`, 'text-rose-500');
      }
    } else {
      const emptySlot = targetPlayer.active.findIndex(s => s === null);
      if (emptySlot !== -1) {
        targetPlayer.active[emptySlot] = mockCard;
        appendLog(`🛠️ [DEV] Spawned "${mockCard.name}" into [${player}] Active Lane Slot ${emptySlot + 1}.`, 'text-indigo-400');
        sfx.playCast();
        engine.recalculateUnionStats();
        engine.resolveCombatAbilities(mockCard, player, emptySlot);
      } else {
        appendLog(`⚠️ [DEV] Active slots full on ${player}.`, 'text-rose-500');
      }
    }

    syncGameStateToVisuals();
    syncEngineToReactState();
  };

  // Canvas Resize triggers
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    setViewportHeight(window.innerHeight);
    syncGameStateToVisuals();
  };

  useEffect(() => {
    const onResizeOrOrient = () => {
      handleResize();
      requestAnimationFrame(handleResize);
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 300);
    };

    if (!splashActive) {
      onResizeOrOrient();
      window.addEventListener('resize', onResizeOrOrient);
      window.addEventListener('orientationchange', onResizeOrOrient);
    }
    return () => {
      window.removeEventListener('resize', onResizeOrOrient);
      window.removeEventListener('orientationchange', onResizeOrOrient);
    };
  }, [splashActive]);

  // Main Canvas Render loop
  useEffect(() => {
    let animationId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(drawLoop);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationId = requestAnimationFrame(drawLoop);
        return;
      }

      const ratio = window.devicePixelRatio || 1;
      const logicalWidth = canvas.clientWidth || (canvas.width / ratio);
      const logicalHeight = canvas.clientHeight || (canvas.height / ratio);

      ctx.save();
      // Clear physical canvas fully
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale to logical CSS coordinates
      ctx.scale(ratio, ratio);

      if (screenShake.current > 0) {
        const dx = (Math.random() - 0.5) * screenShake.current;
        const dy = (Math.random() - 0.5) * screenShake.current;
        ctx.translate(dx, dy);
        screenShake.current *= 0.88;
        if (screenShake.current < 0.4) screenShake.current = 0;
      }

      // Base background space
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Draw arena partitions
      drawArenaLanes(ctx, logicalWidth, logicalHeight);

      // Draw player commander badges
      drawPlayerHeaders(ctx, logicalWidth, logicalHeight);

      // Draw slots indicators grid
      drawCardPlacementsGrid(ctx, logicalWidth, logicalHeight);

      // Draw active visual cards mapping
      for (const [_, vc] of visualCardsMap.current.entries()) {
        vc.update();
        vc.draw(ctx);
      }

      // Projectiles rendering
      for (let i = projectiles.current.length - 1; i >= 0; i--) {
        projectiles.current[i].update();
        projectiles.current[i].draw(ctx);
        if (projectiles.current[i].dead) projectiles.current.splice(i, 1);
      }

      // Indicators text rendering
      for (let i = floatingTexts.current.length - 1; i >= 0; i--) {
        floatingTexts.current[i].update();
        floatingTexts.current[i].draw(ctx);
        if (floatingTexts.current[i].life <= 0) floatingTexts.current.splice(i, 1);
      }

      // Particles rendering
      for (let i = particles.current.length - 1; i >= 0; i--) {
        particles.current[i].update();
        particles.current[i].draw(ctx);
        if (particles.current[i].life <= 0) particles.current.splice(i, 1);
      }

      ctx.restore();
      animationId = requestAnimationFrame(drawLoop);
    };

    animationId = requestAnimationFrame(drawLoop);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Renders divider lines and lanes
  const drawArenaLanes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const m = getLayoutMetrics(width, height);
    ctx.save();

    // Neutral Lane divider lines
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(15, m.p2ActiveY - (m.p2ActiveY - m.p2BenchY - m.cardH) / 2);
    ctx.lineTo(m.deckX - 10, m.p2ActiveY - (m.p2ActiveY - m.p2BenchY - m.cardH) / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(15, m.p1BenchY - (m.p1BenchY - m.p1ActiveY - m.cardH) / 2);
    ctx.lineTo(m.deckX - 10, m.p1BenchY - (m.p1BenchY - m.p1ActiveY - m.cardH) / 2);
    ctx.stroke();

    // Center dividing rift line with indigo magical glow
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.2)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(15, m.h / 2);
    ctx.lineTo(m.deckX - 10, m.h / 2);
    ctx.stroke();
    ctx.restore();

    // Lane slot indicators
    ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.font = 'bold ' + Math.max(7, Math.round(m.w * 0.009)) + 'px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) {
      const cx = m.activeStartX + i * m.activeSpacing + m.cardW / 2;
      ctx.fillText(`LANE ${i + 1}`, cx, m.h / 2 + 3);
    }
  };

  // Renders commanders info sheets
  const drawPlayerHeaders = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const m = getLayoutMetrics(width, height);
    ctx.save();

    // 1. P2 ENEMY COMMANDER CARD (Left Margin top)
    const p2Grad = ctx.createLinearGradient(m.profileX, m.p2BenchY, m.profileX + m.profileW, m.p2BenchY + m.profileH);
    p2Grad.addColorStop(0, '#2d1417'); // Crimson rock
    p2Grad.addColorStop(0.5, '#190a0c');
    p2Grad.addColorStop(1, '#0e0506');

    ctx.fillStyle = p2Grad;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX, m.p2BenchY, m.profileW, m.profileH, 12);
    } else {
      ctx.rect(m.profileX, m.p2BenchY, m.profileW, m.profileH);
    }
    ctx.fill();

    // Chiseled border
    ctx.strokeStyle = '#dc2626'; // Red glow outline
    ctx.lineWidth = 2;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX, m.p2BenchY, m.profileW, m.profileH, 12);
    } else {
      ctx.rect(m.profileX, m.p2BenchY, m.profileW, m.profileH);
    }
    ctx.stroke();

    // Edge bevel highlight
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(m.profileX + 1, m.p2BenchY + 1, m.profileW - 2, m.profileH - 2);

    // Stone cracks
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.profileX + 15, m.p2BenchY + 15);
    ctx.lineTo(m.profileX + 30, m.p2BenchY + 30);
    ctx.lineTo(m.profileX + 25, m.p2BenchY + 35);
    ctx.stroke();

    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold ' + Math.max(9, Math.round(m.profileW * 0.095)) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("👿 ENEMY (P2)", m.profileX + m.profileW / 2, m.p2BenchY + m.profileH * 0.16);
    ctx.textAlign = 'left';

    // P2 HP Bar Inside chiseled container
    ctx.fillStyle = '#0a0507';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.25, m.profileW * 0.84, m.profileH * 0.12, 4);
    } else {
      ctx.rect(m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.25, m.profileW * 0.84, m.profileH * 0.12);
    }
    ctx.fill();
    const p2HpRatio = Math.max(0, engine.p2.hp / 30);
    ctx.fillStyle = p2HpRatio > 0.3 ? '#ef4444' : '#991b1b';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.25, m.profileW * 0.84 * p2HpRatio, m.profileH * 0.12, 4);
    } else {
      ctx.rect(m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.25, m.profileW * 0.84 * p2HpRatio, m.profileH * 0.12);
    }
    ctx.fill();

    // HP Bar Gloss specular reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.25, m.profileW * 0.84 * p2HpRatio, m.profileH * 0.04);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.max(7, Math.round(m.profileW * 0.08)) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${engine.p2.hp}/30`, m.profileX + m.profileW / 2, m.p2BenchY + m.profileH * 0.34);
    ctx.textAlign = 'left';

    // Statistics counters
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold ' + Math.max(6.5, Math.round(m.profileW * 0.075)) + 'px monospace';
    ctx.fillText(`🎴 DECK  : ${engine.p2.deck.length}`, m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.52);
    ctx.fillText(`🪦 GRAVE : ${engine.p2.graveyard.length}`, m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.62);
    ctx.fillStyle = '#fda4af';
    ctx.fillText(`📥 BENCH : ${engine.p2.bench.filter(c => c).length}/7`, m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.72);
    ctx.fillText(`⚔️ ACTIVE: ${engine.p2.active.filter(c => c).length}/5`, m.profileX + m.profileW * 0.08, m.p2BenchY + m.profileH * 0.82);


    // 2. P1 WIZARD COMMANDER CARD (Left Margin bottom)
    const p1Grad = ctx.createLinearGradient(m.profileX, m.p1BenchY, m.profileX + m.profileW, m.p1BenchY + m.profileH);
    p1Grad.addColorStop(0, '#0e1b35'); // Deep blue slate
    p1Grad.addColorStop(0.5, '#070f20');
    p1Grad.addColorStop(1, '#03060c');

    ctx.fillStyle = p1Grad;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX, m.p1BenchY, m.profileW, m.profileH, 12);
    } else {
      ctx.rect(m.profileX, m.p1BenchY, m.profileW, m.profileH);
    }
    ctx.fill();

    // Glowing azure outline
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX, m.p1BenchY, m.profileW, m.profileH, 12);
    } else {
      ctx.rect(m.profileX, m.p1BenchY, m.profileW, m.profileH);
    }
    ctx.stroke();

    // Highlight edge bevel
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(m.profileX + 1, m.p1BenchY + 1, m.profileW - 2, m.profileH - 2);

    // Engraved runes inside P1 stone
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.font = '10px serif';
    ctx.fillText("ᚠ ᚢ ᚦ", m.profileX + m.profileW * 0.72, m.p1BenchY + m.profileH * 0.82);

    ctx.fillStyle = '#c7d2fe';
    ctx.font = 'bold ' + Math.max(9, Math.round(m.profileW * 0.095)) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("🧙‍♂️ WIZARD (P1)", m.profileX + m.profileW / 2, m.p1BenchY + m.profileH * 0.16);
    ctx.textAlign = 'left';

    // P1 HP Bar
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.25, m.profileW * 0.84, m.profileH * 0.12, 4);
    } else {
      ctx.rect(m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.25, m.profileW * 0.84, m.profileH * 0.12);
    }
    ctx.fill();
    const p1HpRatio = Math.max(0, engine.p1.hp / 30);
    ctx.fillStyle = p1HpRatio > 0.3 ? '#10b981' : '#eab308';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.25, m.profileW * 0.84 * p1HpRatio, m.profileH * 0.12, 4);
    } else {
      ctx.rect(m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.25, m.profileW * 0.84 * p1HpRatio, m.profileH * 0.12);
    }
    ctx.fill();

    // SPECULAR reflection P1
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.25, m.profileW * 0.84 * p1HpRatio, m.profileH * 0.04);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.max(7, Math.round(m.profileW * 0.08)) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${engine.p1.hp}/30`, m.profileX + m.profileW / 2, m.p1BenchY + m.profileH * 0.34);
    ctx.textAlign = 'left';

    // Statistics counters
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold ' + Math.max(6.5, Math.round(m.profileW * 0.075)) + 'px monospace';
    ctx.fillText(`🎴 DECK  : ${engine.p1.deck.length}`, m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.52);
    ctx.fillText(`🪦 GRAVE : ${engine.p1.graveyard.length}`, m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.62);
    ctx.fillStyle = '#818cf8';
    ctx.fillText(`📥 BENCH : ${engine.p1.bench.filter(c => c).length}/7`, m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.72);
    ctx.fillText(`⚔️ ACTIVE: ${engine.p1.active.filter(c => c).length}/5`, m.profileX + m.profileW * 0.08, m.p1BenchY + m.profileH * 0.82);

    ctx.restore();
  };

  // Renders placements layout indicators
  const drawCardPlacementsGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const m = getLayoutMetrics(width, height);
    ctx.save();

    const benchDashColor = 'rgba(148, 163, 184, 0.22)';
    const activeDashColor = 'rgba(99, 102, 241, 0.24)';

    // 1. Bench placements drawn as runic circular spaces
    for (let i = 0; i < 7; i++) {
      // P2 Top Bench Space
      const p2Bench = getVisualCoordinates(width, height, 'P2', 'bench', i);
      const cx2 = p2Bench.x + p2Bench.w / 2;
      const cy2 = p2Bench.y + p2Bench.h / 2;
      const r2 = Math.min(p2Bench.w, p2Bench.h) * 0.44;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2, 0, Math.PI * 2);
      ctx.fill();

      // Runic outer dashed ring
      ctx.strokeStyle = benchDashColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx2, cy2, r2 * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = 'bold ' + Math.max(7, Math.round(p2Bench.w * 0.12)) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`B${i + 1}`, cx2, cy2 + 3.5);

      // P1 Bottom Bench Space
      const p1Bench = getVisualCoordinates(width, height, 'P1', 'bench', i);
      const cx1 = p1Bench.x + p1Bench.w / 2;
      const cy1 = p1Bench.y + p1Bench.h / 2;
      const r1 = Math.min(p1Bench.w, p1Bench.h) * 0.44;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.arc(cx1, cy1, r1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = benchDashColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx1, cy1, r1 * 1.05, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillText(`B${i + 1}`, cx1, cy1 + 3.5);
    }

    // 2. Active Combat lanes drawn as glowing circular sectors
    for (let i = 0; i < 5; i++) {
      // P2 Active Lane Space
      const p2Act = getVisualCoordinates(width, height, 'P2', 'active', i);
      const cax2 = p2Act.x + p2Act.w / 2;
      const cay2 = p2Act.y + p2Act.h / 2;
      const ra2 = Math.min(p2Act.w, p2Act.h) * 0.44;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.beginPath();
      ctx.arc(cax2, cay2, ra2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = activeDashColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(cax2, cay2, ra2 * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.font = 'bold ' + Math.max(14, Math.round(p2Act.w * 0.28)) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}`, cax2, cay2 + 6);

      // P1 Active Lane Space
      const p1Act = getVisualCoordinates(width, height, 'P1', 'active', i);
      const cax1 = p1Act.x + p1Act.w / 2;
      const cay1 = p1Act.y + p1Act.h / 2;
      const ra1 = Math.min(p1Act.w, p1Act.h) * 0.44;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.beginPath();
      ctx.arc(cax1, cay1, ra1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = activeDashColor;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.arc(cax1, cay1, ra1 * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillText(`${i + 1}`, cax1, cay1 + 6);
    }

    // 3. Draw Decks
    const p2DeckC = getVisualCoordinates(width, height, 'P2', 'deck', 0);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(p2DeckC.x, p2DeckC.y, m.cardW, m.cardH, 8);
    } else {
      ctx.rect(p2DeckC.x, p2DeckC.y, m.cardW, m.cardH);
    }
    ctx.fill();
    ctx.stroke();
    if (engine.p2.deck.length > 0) {
      ctx.save();
      ctx.shadowColor = '#dc2626';
      ctx.shadowBlur = 12 + Math.sin(Date.now() / 200) * 6;

      ctx.fillStyle = '#22080a';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p2DeckC.x + 2, p2DeckC.y + 2, m.cardW - 4, m.cardH - 4, 8);
      } else {
        ctx.rect(p2DeckC.x + 2, p2DeckC.y + 2, m.cardW - 4, m.cardH - 4);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p2DeckC.x + 5, p2DeckC.y + 5, m.cardW - 10, m.cardH - 10, 6);
      } else {
        ctx.rect(p2DeckC.x + 5, p2DeckC.y + 5, m.cardW - 10, m.cardH - 10);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.moveTo(p2DeckC.x + 8, p2DeckC.y + 8);
      ctx.lineTo(p2DeckC.x + m.cardW - 8, p2DeckC.y + m.cardH - 8);
      ctx.moveTo(p2DeckC.x + m.cardW - 8, p2DeckC.y + 8);
      ctx.lineTo(p2DeckC.x + 8, p2DeckC.y + m.cardH - 8);
      ctx.stroke();

      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold ' + Math.max(9, Math.round(m.cardW * 0.15)) + 'px serif';
      ctx.textAlign = 'center';
      ctx.fillText("ᛟ", p2DeckC.x + m.cardW / 2, p2DeckC.y + m.cardH / 2 + 5);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p2DeckC.x + m.cardW - 22, p2DeckC.y + 5, 18, 12, 3);
      } else {
        ctx.rect(p2DeckC.x + m.cardW - 22, p2DeckC.y + 5, 18, 12);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(engine.p2.deck.length.toString(), p2DeckC.x + m.cardW - 13, p2DeckC.y + 14);

      ctx.restore();
    } else {
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.font = '9px monospace';
      ctx.fillText("EMPTY", p2DeckC.x + m.cardW / 2, p2DeckC.y + m.cardH / 2 + 4);
    }

    const p1DeckC = getVisualCoordinates(width, height, 'P1', 'deck', 0);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(p1DeckC.x, p1DeckC.y, m.cardW, m.cardH, 8);
    } else {
      ctx.rect(p1DeckC.x, p1DeckC.y, m.cardW, m.cardH);
    }
    ctx.fill();
    ctx.stroke();
    if (engine.p1.deck.length > 0) {
      ctx.save();
      ctx.shadowColor = '#2563eb';
      ctx.shadowBlur = 12 + Math.sin(Date.now() / 200) * 6;

      ctx.fillStyle = '#08122c';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p1DeckC.x + 2, p1DeckC.y + 2, m.cardW - 4, m.cardH - 4, 8);
      } else {
        ctx.rect(p1DeckC.x + 2, p1DeckC.y + 2, m.cardW - 4, m.cardH - 4);
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p1DeckC.x + 5, p1DeckC.y + 5, m.cardW - 10, m.cardH - 10, 6);
      } else {
        ctx.rect(p1DeckC.x + 5, p1DeckC.y + 5, m.cardW - 10, m.cardH - 10);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.beginPath();
      ctx.moveTo(p1DeckC.x + 8, p1DeckC.y + 8);
      ctx.lineTo(p1DeckC.x + m.cardW - 8, p1DeckC.y + m.cardH - 8);
      ctx.moveTo(p1DeckC.x + m.cardW - 8, p1DeckC.y + 8);
      ctx.lineTo(p1DeckC.x + 8, p1DeckC.y + m.cardH - 8);
      ctx.stroke();

      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold ' + Math.max(9, Math.round(m.cardW * 0.15)) + 'px serif';
      ctx.textAlign = 'center';
      ctx.fillText("ᛗ", p1DeckC.x + m.cardW / 2, p1DeckC.y + m.cardH / 2 + 5);

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      // @ts-ignore
      if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(p1DeckC.x + m.cardW - 22, p1DeckC.y + 5, 18, 12, 3);
      } else {
        ctx.rect(p1DeckC.x + m.cardW - 22, p1DeckC.y + 5, 18, 12);
      }
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(engine.p1.deck.length.toString(), p1DeckC.x + m.cardW - 13, p1DeckC.y + 14);

      ctx.restore();
    } else {
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.font = '9px monospace';
      ctx.fillText("EMPTY", p1DeckC.x + m.cardW / 2, p1DeckC.y + m.cardH / 2 + 4);
    }

    const p2GraveC = getVisualCoordinates(width, height, 'P2', 'graveyard', 0);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.1)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(p2GraveC.x, p2GraveC.y, m.cardW, m.cardH, 8);
    } else {
      ctx.rect(p2GraveC.x, p2GraveC.y, m.cardW, m.cardH);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold ' + Math.max(7, Math.round(m.cardW * 0.11)) + 'px system-ui';
    ctx.fillText("🪦 GRAVE", p2GraveC.x + m.cardW * 0.15, p2GraveC.y + m.cardH * 0.48);
    ctx.font = '10px monospace';
    ctx.fillText(`(${engine.p2.graveyard.length})`, p2GraveC.x + m.cardW * 0.38, p2GraveC.y + m.cardH * 0.62);

    const p1GraveC = getVisualCoordinates(width, height, 'P1', 'graveyard', 0);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.1)';
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
      // @ts-ignore
      ctx.roundRect(p1GraveC.x, p1GraveC.y, m.cardW, m.cardH, 8);
    } else {
      ctx.rect(p1GraveC.x, p1GraveC.y, m.cardW, m.cardH);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold ' + Math.max(7, Math.round(m.cardW * 0.11)) + 'px system-ui';
    ctx.fillText("🪦 GRAVE", p1GraveC.x + m.cardW * 0.15, p1GraveC.y + m.cardH * 0.48);
    ctx.font = '10px monospace';
    ctx.fillText(`(${engine.p1.graveyard.length})`, p1GraveC.x + m.cardW * 0.38, p1GraveC.y + m.cardH * 0.62);

    ctx.restore();
  };

  return (
    <div
      id="main-app-container"
      className="w-screen h-screen flex flex-col justify-between p-0 m-0 box-border overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black select-none text-slate-100 font-sans"
      style={{
        width: '100vw',
        height: '100vh',
        margin: '0',
        padding: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: '0'
      }}
    >
      {/* 1. Guard against Portrait usage */}
      <PortraitGuard />

      {/* 2. Splash Start Overlay */}
      {screenState === 'SPLASH' && (
        <SplashScreen onEnter={() => {
          setScreenState('MAIN_MENU');
          sfx.playHeal();
        }} />
      )}

      {/* 2b. Main Menu Overlay */}
      {screenState === 'MAIN_MENU' && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black select-none z-50">
          {/* Top Right Options Gear Button */}
          <button
            onClick={() => {
              sfx.playTick();
              setIsOptionsOpen(true);
            }}
            className="absolute top-5 right-5 stone-icon-button p-3 rounded-2xl flex items-center justify-center gap-2 text-indigo-300 hover:text-amber-300 transition-all cursor-pointer shadow-xl border border-indigo-500/30 active:scale-95 group"
            title="Options & Audio Settings"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="text-xs font-mono font-bold uppercase hidden sm:inline">Options</span>
          </button>

          <div className="mb-8 relative animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-400 to-pink-400 font-serif">
              WIZARD WARS
            </h1>
            <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-2">
              Master CCG Arena {GAME_VERSION}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                setScreenState('DECK_SELECTION');
                setDeckSelectionStep(1);
                sfx.playCast();
              }}
              className="w-64 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/15 hover:shadow-indigo-500/25 active:scale-95 transition-all text-sm tracking-wider flex items-center justify-center gap-3 cursor-pointer border border-indigo-400/20"
            >
              <span>ENTER THE ARENA</span>
            </button>

            <button
              onClick={() => {
                setScreenState('LIBRARY');
                setLibraryView('CODEX');
                sfx.playCast();
              }}
              className="w-64 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-4 px-6 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-sm tracking-wider flex items-center justify-center gap-3 cursor-pointer shadow-lg block"
            >
              <span>CODEX & LIBRARY</span>
            </button>

            <button
              onClick={() => setScreenState('CHANGELOG')}
              className="w-64 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold py-4 px-6 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-sm tracking-wider flex items-center justify-center gap-3 cursor-pointer shadow-lg block"
            >
              <span>CHANGELOG</span>
            </button>
          </div>

          <div className="absolute bottom-4 right-4 text-xs font-mono text-indigo-400/50">
            {GAME_VERSION}
          </div>
        </div>
      )}

      {/* Pre-Match Deck Selection Overlay */}
      {screenState === 'DECK_SELECTION' && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black select-none z-50 overflow-y-auto animate-fade-in">
          <div 
            className="w-full max-w-3xl bg-slate-900/40 border border-slate-900/80 rounded-3xl backdrop-blur-md shadow-2xl scrollbar-thin"
            style={{
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflowY: 'auto',
              padding: '10px',
              boxSizing: 'border-box'
            }}
          >
            
            {/* Step Indicators */}
            <div className="flex items-center gap-3 mb-6 font-mono text-xs text-indigo-400/80">
              <span className={`px-2.5 py-1 rounded-full ${deckSelectionStep === 1 ? 'bg-indigo-600 text-white font-bold border border-indigo-400/30 shadow-lg shadow-indigo-600/20 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>P1 DECK</span>
              <span className="text-slate-700">➔</span>
              <span className={`px-2.5 py-1 rounded-full ${deckSelectionStep === 2 ? 'bg-indigo-600 text-white font-bold border border-indigo-400/30 shadow-lg shadow-indigo-600/20 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>P2 DECK</span>
            </div>

            <div className="mb-6 relative text-center">
              <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-indigo-300 to-cyan-300 font-serif uppercase">
                {deckSelectionStep === 1 ? 'CHOOSE YOUR DECK' : "CHOOSE YOUR OPPONENT'S DECK"}
              </h2>
              <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-2">
                {deckSelectionStep === 1 ? 'Select starting faction/identity for Player 1' : 'Select battle deck template for Player 2 AI'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
              {[
                { id: 'Red', name: 'RED DECK', emoji: '🔴', desc: 'Pyromancy & burn status mechanics', border: 'border-red-500/20 hover:border-red-500/60', bg: 'bg-red-950/10 hover:bg-red-950/30 text-red-400', glow: 'shadow-red-500/5' },
                { id: 'Blue', name: 'BLUE DECK', emoji: '🔵', desc: 'Cryomancy, frostbolts & freeze effects', border: 'border-blue-500/20 hover:border-blue-500/60', bg: 'bg-blue-950/10 hover:bg-blue-950/30 text-blue-400', glow: 'shadow-blue-500/5' },
                { id: 'Yellow', name: 'YELLOW DECK', emoji: '🟡', desc: 'Haste, evasion, and turn manipulation', border: 'border-yellow-500/20 hover:border-yellow-500/60', bg: 'bg-yellow-950/10 hover:bg-yellow-950/30 text-yellow-400', glow: 'shadow-yellow-500/5' },
                { id: 'Green', name: 'GREEN DECK', emoji: '🟢', desc: 'Thorns, poison, and self-regeneration', border: 'border-emerald-500/20 hover:border-emerald-500/60', bg: 'bg-emerald-950/10 hover:bg-emerald-950/30 text-emerald-400', glow: 'shadow-emerald-500/5' },
                { id: 'White', name: 'WHITE DECK', emoji: '⚪', desc: 'Taunt protectors, paladins & healers', border: 'border-slate-400/20 hover:border-slate-200/60', bg: 'bg-slate-800/10 hover:bg-slate-800/30 text-slate-200', glow: 'shadow-slate-300/5' },
                { id: 'Black', name: 'BLACK DECK', emoji: '⚫', desc: 'Lifesteal, weakness, and slow decay', border: 'border-purple-900/20 hover:border-purple-600/60', bg: 'bg-purple-950/10 hover:bg-purple-950/30 text-purple-400', glow: 'shadow-purple-500/5' },
                { id: 'Grey', name: 'GREY DECK', emoji: '🔘', desc: 'Cleave, raw physical power, and shields', border: 'border-slate-600/20 hover:border-slate-400/60', bg: 'bg-slate-800/10 hover:bg-slate-800/30 text-slate-400', glow: 'shadow-slate-500/5' },
                { id: 'Mixed', name: 'MIXED DECK', emoji: '🌈', desc: 'Standard multi-color randomized deck', border: 'border-indigo-500/20 hover:border-indigo-500/60', bg: 'bg-indigo-950/10 hover:bg-indigo-950/30 text-indigo-400', glow: 'shadow-indigo-500/5' },
                { id: 'Random', name: 'RANDOM DECK', emoji: '🎲', desc: 'Surprise! Selects a random color deck', border: 'border-amber-500/20 hover:border-amber-500/60', bg: 'bg-amber-950/10 hover:bg-amber-950/30 text-amber-400', glow: 'shadow-amber-500/5' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    sfx.playCast();
                    if (deckSelectionStep === 1) {
                      setP1Deck(option.id);
                      setDeckSelectionStep(2);
                    } else {
                      const finalP1 = p1Deck;
                      const finalP2 = option.id;
                      setP2Deck(finalP2);

                      if (engineRef.current) {
                        engineRef.current.resetGame(finalP1, finalP2);
                      }

                      visualCardsMap.current.clear();
                      projectiles.current = [];
                      floatingTexts.current = [];
                      particles.current = [];
                      clearCombatLog();
                      syncGameStateToVisuals();
                      syncEngineToReactState();

                      setScreenState('ARENA');
                      setSplashActive(false);
                      setTimeout(() => {
                        handleResize();
                        sfx.playHeal();
                      }, 100);
                    }
                  }}
                  className={`flex flex-col text-left p-3.5 rounded-2xl border ${option.border} ${option.bg} cursor-pointer hover:scale-[1.02] active:scale-95 transition-all duration-200 shadow-md ${option.glow}`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl filter drop-shadow">{option.emoji}</span>
                    <span className="text-xs font-extrabold tracking-wide font-mono">{option.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal font-mono">{option.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  sfx.playCast();
                  if (deckSelectionStep === 2) {
                    setDeckSelectionStep(1);
                  } else {
                    setScreenState('MAIN_MENU');
                  }
                }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold py-2.5 px-6 rounded-xl border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-xs tracking-wider cursor-pointer font-mono"
              >
                ➔ BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2d. Library & Codex Overlay */}
      {screenState === 'LIBRARY' && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto z-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black select-none">
          <div className="w-full max-w-5xl flex flex-col flex-grow">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-indigo-950 pb-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-indigo-300 to-cyan-300 font-serif">
                  THE GRAND LIBRARY
                </h1>
                <p className="text-xs text-indigo-400 font-mono tracking-widest uppercase mt-1">
                  Glossary, Codex, & Faction Rules
                </p>
              </div>

              {/* View Toggle Tabs */}
              <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => { setLibraryView('CODEX'); sfx.playCast(); }}
                  className={`px-6 py-2 rounded-lg text-xs font-bold tracking-wider font-mono transition-all ${
                    libraryView === 'CODEX'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CARD CODEX
                </button>
                <button
                  onClick={() => { setLibraryView('GLOSSARY'); sfx.playCast(); }}
                  className={`px-6 py-2 rounded-lg text-xs font-bold tracking-wider font-mono transition-all ${
                    libraryView === 'GLOSSARY'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GLOSSARY
                </button>
              </div>

              <button
                onClick={() => { setScreenState('MAIN_MENU'); sfx.playHeal(); }}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold py-2 px-5 rounded-xl border border-slate-800 hover:border-slate-700 active:scale-95 transition-all text-xs tracking-wider cursor-pointer font-mono"
              >
                BACK TO MENU
              </button>
            </div>

            {/* View A: Card Codex Grid */}
            {libraryView === 'CODEX' && (
              <div className="flex-grow mb-12">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {CARD_TEMPLATES.map((tpl, idx) => {
                    const uppercaseFaction = tpl.faction.toUpperCase();
                    // Map to colors for display
                    const colorMap: Record<string, { border: string, bg: string, text: string, dot: string }> = {
                      RED: { border: 'border-red-600/40 hover:border-red-500', bg: 'from-red-950/20 to-slate-900/60', text: 'text-red-400', dot: 'bg-red-500' },
                      BLUE: { border: 'border-blue-600/40 hover:border-blue-500', bg: 'from-blue-950/20 to-slate-900/60', text: 'text-blue-400', dot: 'bg-blue-500' },
                      GREEN: { border: 'border-emerald-600/40 hover:border-emerald-500', bg: 'from-emerald-950/20 to-slate-900/60', text: 'text-emerald-400', dot: 'bg-emerald-500' },
                      YELLOW: { border: 'border-yellow-600/40 hover:border-yellow-500', bg: 'from-yellow-950/20 to-slate-900/60', text: 'text-yellow-400', dot: 'bg-yellow-500' },
                      WHITE: { border: 'border-slate-400/40 hover:border-slate-200', bg: 'from-slate-800/20 to-slate-900/60', text: 'text-slate-200', dot: 'bg-slate-300' },
                      BLACK: { border: 'border-purple-950/40 hover:border-purple-800', bg: 'from-purple-950/20 to-slate-900/60', text: 'text-purple-400', dot: 'bg-purple-950' },
                      GREY: { border: 'border-slate-700/40 hover:border-slate-500', bg: 'from-slate-900 to-slate-950', text: 'text-slate-400', dot: 'bg-slate-500' },
                      NEUTRAL: { border: 'border-slate-700/40 hover:border-slate-500', bg: 'from-slate-900 to-slate-950', text: 'text-slate-400', dot: 'bg-slate-500' }
                    };
                    const cStyle = colorMap[uppercaseFaction] || colorMap.NEUTRAL;

                    return (
                      <button
                        key={idx}
                        onClick={() => { setSelectedCodexCard({ ...tpl, index: idx + 1 }); sfx.playCast(); }}
                        className={`text-left bg-gradient-to-b ${cStyle.bg} border ${cStyle.border} p-4 rounded-xl active:scale-95 transition-all duration-200 group relative flex flex-col justify-between h-40 cursor-pointer shadow-lg hover:shadow-black/40`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                            <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${cStyle.text}`}>
                              {tpl.faction}
                            </span>
                          </div>
                          <div className="card-header w-full">
                            <h3 className="card-title text-sm font-extrabold text-white group-hover:text-amber-200 transition-colors truncate">
                              {tpl.name}
                            </h3>
                          </div>
                        </div>

                        <div className="card-art-container flex items-center justify-between my-2 text-xl filter drop-shadow">
                          {tpl.cardArtUrl ? (
                            <div className="w-8 h-8 h-[32px] rounded-lg overflow-hidden border border-amber-500/30 flex-shrink-0 shadow-md">
                              <img src={tpl.cardArtUrl} alt={tpl.name} className="w-full h-full object-cover block" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 h-[32px] flex items-center justify-center">
                              <span>{FACTIONS[uppercaseFaction]?.emoji || '🔘'}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                            <span>⏳ {tpl.cost}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono border-t border-slate-800/80 pt-2 text-slate-400">
                          <span className="text-rose-400">⚔️ {tpl.attack}</span>
                          <span className="text-emerald-400">❤️ {tpl.health}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View B: Glossary */}
            {libraryView === 'GLOSSARY' && (
              <div className="flex-grow mb-12 bg-slate-900/40 border border-slate-900 p-6 md:p-8 rounded-2xl backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* Category 1: Status Effects */}
                  <div>
                    <h3 className="text-indigo-400 font-extrabold font-serif text-lg border-b border-indigo-950/60 pb-2 mb-4 tracking-wide flex items-center gap-2">
                      <span>🧪</span> STATUS EFFECTS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="bg-emerald-950/30 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-800/30 uppercase mr-2">Poison</span>
                        <p className="text-xs text-slate-300 mt-1 pl-1 leading-relaxed">
                          Deals <span className="text-emerald-400">1 damage</span> to the card post-combat. Triggers immediately after an active phase concludes.
                        </p>
                      </div>
                      <div>
                        <span className="bg-orange-950/30 text-orange-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-orange-800/30 uppercase mr-2">Burning</span>
                        <p className="text-xs text-slate-300 mt-1 pl-1 leading-relaxed">
                          Deals <span className="text-orange-400">1 damage</span> to the burning unit at the exact end of each global turn cycle.
                        </p>
                      </div>
                      <div>
                        <span className="bg-cyan-950/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-cyan-800/30 uppercase mr-2">Frozen</span>
                        <p className="text-xs text-slate-300 mt-1 pl-1 leading-relaxed">
                          Freezes the card solid. Skips its next active attack or strike sequence. Consumes the Frozen status badge upon doing so.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Combat Triggers */}
                  <div>
                    <h3 className="text-indigo-400 font-extrabold font-serif text-lg border-b border-indigo-950/60 pb-2 mb-4 tracking-wide flex items-center gap-2">
                      <span>⚔️</span> COMBAT TRAITS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Cleave</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Deals standard physical strike damage to target and both left and right adjacent enemy cards.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Double Strike</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Executes two independent back-to-back physical attack strikes during combat.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Lifesteal</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Heals card's current HP by the value of damage dealt to enemy cards or player.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Surprise Attack</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Strikes for <span className="text-amber-300 font-semibold">3x physical damage</span> on its very first attack strike after deployment, then expends.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Defensive & Passive */}
                  <div>
                    <h3 className="text-indigo-400 font-extrabold font-serif text-lg border-b border-indigo-950/60 pb-2 mb-4 tracking-wide flex items-center gap-2">
                      <span>🛡️</span> DEFENSIVE & PASSIVES
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Block</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Reduces all incoming physical strike damage by the specified block value.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Dodge</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Adds a percentage chance (Value * 10%) to completely slip past and dodge physical attacks.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Thorn</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Whenever taking physical damage, spikes back to instantly deal reciprocal damage to the attacker.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Taunt</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Active interceptor. Reroutes all enemy lane physical attacks to strike this unit instead.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category 4: Magic & Special Abilities */}
                  <div>
                    <h3 className="text-indigo-400 font-extrabold font-serif text-lg border-b border-indigo-950/60 pb-2 mb-4 tracking-wide flex items-center gap-2">
                      <span>🔮</span> SPELLS & SPECIALS
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Union</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Peasant special. ATK and HP are dynamically set equal to the total number of allied Peasants active on the battlefield.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Weaken</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Permanently reduces the target card's Attack power by the specified value upon hitting.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Rally</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Permanently raises the Attack of a random friendly active companion card by specified amount on turn combat.
                        </p>
                      </div>
                      <div>
                        <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">Explode</span>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                          Deals catastrophic explosion damage to all active enemy units and the enemy player upon death.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Card Detail Modal */}
          {selectedCodexCard && (
            <div 
              onClick={() => { setSelectedCodexCard(null); sfx.playCast(); }}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-55"
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-800 rounded-3xl relative shadow-2xl animate-scale-up"
                style={{ maxHeight: '85vh', width: '90%', maxWidth: '550px', overflowY: 'auto', padding: '1.5rem', boxSizing: 'border-box' }}
              >
                
                {/* Close Button - Sticky at top right */}
                <div className="sticky top-0 z-10 flex justify-end -mt-1 -mr-1 mb-1">
                  <button
                    onClick={() => { setSelectedCodexCard(null); sfx.playCast(); }}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full cursor-pointer transition-colors bg-slate-900 shadow-md border border-slate-800"
                  >
                    ✕
                  </button>
                </div>

                {/* Card Emblem & Color Badge */}
                <div className="flex flex-col items-center text-center mt-2">
                  {selectedCodexCard.cardArtUrl ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl mb-3 relative">
                      <img 
                        src={selectedCodexCard.cardArtUrl} 
                        alt={selectedCodexCard.name} 
                        className="w-full h-full object-cover block"
                      />
                    </div>
                  ) : (
                    <span className="text-5xl filter drop-shadow mb-3">
                      {FACTIONS[selectedCodexCard.faction.toUpperCase()]?.emoji || '🔘'}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-500">CODEX NUMBER #{selectedCodexCard.index}</span>
                  <h2 className="text-2xl font-black text-white mt-1 tracking-wide">{selectedCodexCard.name}</h2>
                  <span className="text-xs font-mono font-semibold tracking-widest text-indigo-400 uppercase mt-1">
                    {selectedCodexCard.faction} IDENTITY
                  </span>
                </div>

                {/* Base Stats Display */}
                <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 my-6 text-center">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Spawn Cost</span>
                    <div className="text-lg font-black text-amber-400 mt-0.5">⏳ {selectedCodexCard.cost}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Base Attack</span>
                    <div className="text-lg font-black text-rose-500 mt-0.5">⚔️ {selectedCodexCard.attack}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Max Health</span>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">❤️ {selectedCodexCard.health}</div>
                  </div>
                </div>

                {/* Mechanics / Descriptions */}
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <h4 className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase mb-1">ABILITIES & BEHAVIORS</h4>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                      {(() => {
                        const abilityType = selectedCodexCard.ability?.type;
                        const val = selectedCodexCard.ability?.value;
                        if (selectedCodexCard.name === "Peasant") {
                          return "Union: This humble Peasant gains ⚔️ ATK and ❤️ HP equal to the total number of allied Peasants active on your side of the battlefield.";
                        }
                        if (selectedCodexCard.name === "Castle Wall") {
                          return "Taunt: Intercepts all standard enemy physical attacks. Shielding your player and weaker allies.";
                        }
                        if (selectedCodexCard.name === "Vine Wall") {
                          return "Taunt & Regenerate 1: Intercepts physical attacks and heals itself by +1 HP at the end of each turn cycle.";
                        }
                        if (abilityType === "Cleave") {
                          return `Cleave ${val}: Attacks deal damage to the target slot as well as adjacent slots.`;
                        }
                        if (abilityType === "Block") {
                          return `Block ${val}: Mitigates and reduces incoming physical attacks by ${val} damage.`;
                        }
                        if (abilityType === "Toxic") {
                          return `Toxic ${val}: Injects poison upon physical strike, applying ${val} stacks of post-combat Poison damage.`;
                        }
                        if (abilityType === "Fireball") {
                          return `Fireball ${val}: At start of turn, casts Fireball at a random active enemy dealing ${val} damage and applying Burning.`;
                        }
                        if (abilityType === "Dodge") {
                          return `Dodge ${val}: Evades standard physical attacks with a ${val * 10}% success rate.`;
                        }
                        if (abilityType === "Frostbolt") {
                          return `Frostbolt ${val}: Shoots a magical ice beam at a random enemy card slot dealing ${val} damage and a chance to Freeze.`;
                        }
                        if (abilityType === "Regenerate") {
                          return `Regenerate ${val}: Naturally regenerates +${val} HP at the conclusion of each turn cycle.`;
                        }
                        if (abilityType === "Lifesteal") {
                          return `Lifesteal ${val}: Attacks siphon and restore HP equivalent to the physical damage dealt.`;
                        }
                        if (abilityType === "Double Strike") {
                          return "Double Strike: Swiftly attacks twice in succession during its combat phase.";
                        }
                        if (abilityType === "Thorn") {
                          return `Thorn ${val}: Thorns return ${val} reciprocal damage to physical strike attackers.`;
                        }
                        if (abilityType === "Berserk") {
                          return `Berserk ${val}: Pain fuels power! Permanently gains +${val} ATK when suffering damage.`;
                        }
                        if (abilityType === "Weaken") {
                          return `Weaken ${val}: Hitting enemies inflicts dynamic fatigue, permanently weakening target ATK by ${val}.`;
                        }
                        if (abilityType === "Rally") {
                          return `Rally ${val}: Infuses a random active friendly unit with +${val} permanent ATK when attacking.`;
                        }
                        if (abilityType === "Haste") {
                          return `Haste ${val}: When active, speeds up the countdown of a benched friendly card by -${val} tick delay on attack.`;
                        }
                        if (abilityType === "Surprise Attack") {
                          return "Surprise Attack: Strikes with 3x ultimate physical impact on its very first attack strike.";
                        }
                        if (abilityType === "Slow") {
                          return `Slow ${val}: Physical hits slow a benched opponent card delay timer by +${val} tick.`;
                        }
                        if (abilityType === "Explode") {
                          return `Explode ${val}: Triggers on death. Detonates a major bomb dealing ${val} damage to all active enemies and the enemy player.`;
                        }
                        return "A noble wizard companion battling in the CCG Sandbox Arena.";
                      })()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedCodexCard(null); sfx.playCast(); }}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-6 rounded-xl transition-all active:scale-95 text-xs tracking-wider cursor-pointer"
                >
                  DISMISS CODEX ENTRY
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2c. Changelog Overlay */}
      {screenState === 'CHANGELOG' && (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black select-none z-50">
          <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative max-h-[80vh] flex flex-col">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 font-serif mb-6 text-center tracking-wide">
              CHRONICLES OF CHANGE
            </h2>
            <div className="flex-grow overflow-y-auto pr-2 space-y-6 text-left font-mono scrollbar-thin">
              {CHANGELOG.map((entry, idx) => (
                <div key={idx}>
                  <h3 className={`font-bold border-b border-indigo-950 pb-1 mb-2 text-sm flex justify-between ${
                    entry.isCurrent ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    <span>{entry.version} - {entry.title}</span>
                    {entry.isCurrent && <span className="text-xs text-emerald-500/70 font-mono font-extrabold uppercase">CURRENT</span>}
                  </h3>
                  <ul className={`list-disc list-inside space-y-1.5 text-xs pl-2 ${
                    entry.isCurrent ? 'text-slate-200' : 'text-slate-400'
                  }`}>
                    {entry.notes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={() => setScreenState('MAIN_MENU')}
              className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3 px-6 rounded-xl border border-slate-700 hover:border-slate-600 active:scale-95 transition-all text-xs tracking-wider cursor-pointer"
            >
              BACK TO MENU
            </button>
          </div>

          <div className="absolute bottom-4 right-4 text-xs font-mono text-indigo-400/50">
            {GAME_VERSION}
          </div>
        </div>
      )}

      {!splashActive && (
        <>
          {/* Battlefield Version Watermark Badge */}
          <div className="absolute bottom-3 right-3 z-30 text-[10px] font-mono text-slate-600/40 pointer-events-none select-none">
            {GAME_VERSION}
          </div>

          {/* 3. Discrete Left Side HUD Controls inside the board area - 2x2 grid aligned with the center dividing line */}
          <div
            id="discrete-left-controls"
            className="absolute left-[1.2vw] top-1/2 -translate-y-1/2 z-30 grid grid-cols-2 gap-1.5 transition-all duration-300 select-none"
          >
            {/* Options Gear Button */}
            <button
              onClick={() => {
                sfx.playTick();
                setIsOptionsOpen(true);
              }}
              className="stone-icon-button w-[35px] h-[35px] rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90"
              title="Audio & Game Options"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
            </button>
 
            {/* Relocated Sound Toggle Button */}
            <button
              onClick={handleToggleMute}
              className="stone-icon-button w-[35px] h-[35px] rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              )}
            </button>
 
            {/* Compact Start Match / Pause Button */}
            <button
              onClick={handleToggleAutoplay}
              disabled={gameEnded}
              className={`w-[35px] h-[35px] rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90 ${
                isAutoplayRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isAutoplayRunning ? "Pause Match" : "Start Match / Autoplay"}
            >
              {isAutoplayRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
 
            {/* Compact 2X Fast-Forward Toggle Button */}
            <button
              onClick={handleToggleFastForward}
              disabled={gameEnded}
              className={`w-[35px] h-[35px] rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-90 border ${
                isFastForward
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                  : 'stone-icon-button border-slate-700/50 text-slate-400'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={isFastForward ? "Standard Speed (1x)" : "Fast Forward (2x)"}
            >
              <FastForward className="w-3.5 h-3.5" />
              <span className="text-[7px] font-extrabold font-mono leading-none mt-0.5">2X</span>
            </button>
          </div>

          {/* 4. Fullscreen Canvas Viewport - full bleed with rounded-none */}
          <div
            className="flex-grow w-screen h-screen flex items-center justify-center overflow-hidden relative transition-all duration-300"
            style={{
              width: '100vw',
              height: '100vh',
              padding: '0',
              margin: '0',
              borderRadius: '0',
              overflow: 'hidden'
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="glowing-board bg-slate-950 w-full h-full shadow-2xl transition-all duration-300 rounded-none border-0 cursor-pointer"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '0',
                borderWidth: '0'
              }}
            />

            {/* Game Over Screen Overlay */}
            <GameOverOverlay
              winner={winner}
              onRematch={handleResetMatch}
              onReturnToDeckSelection={handleReturnToDeckSelection}
            />
          </div>

          {/* In-Battle Card Inspector Modal */}
          <CardInspectorModal
            card={inspectedCard}
            ownerTag={inspectedCardOwner}
            onClose={handleCloseInspector}
          />

          {/* 5. Sandbox Inspector Dev Drawer slider */}
          <DevDrawer
            isOpen={isDevOpen}
            onClose={() => setIsDevOpen(false)}
            stepDelay={stepDelay}
            onStepDelayChange={handleStepDelayChange}
            onSpawnCard={handleSpawnCardInSandbox}
            logs={logs}
            onClearLogs={clearCombatLog}
            onResetMatch={handleResetMatch}
            currentTurn={currentTurn}
            activePlayer={activePlayer}
            phase={phase}
            onStep={handleStep}
            onToggleAutoplay={handleToggleAutoplay}
            isAutoplayRunning={isAutoplayRunning}
            gameEnded={gameEnded}
          />
        </>
      )}

      {/* Top-Level Options & Audio Settings Modal */}
      <OptionsModal
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onOpenDevDrawer={() => setIsDevOpen(true)}
      />
    </div>
  );
}
