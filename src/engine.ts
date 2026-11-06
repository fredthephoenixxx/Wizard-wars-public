import { Card, PlayerState, GamePhase } from "./types";
import { CARD_TEMPLATES, FACTIONS } from "./constants";

export interface EngineCallbacks {
  appendLog: (message: string, textColorClass?: string) => void;
  playSfx: (type: 'draw' | 'tick' | 'deploy' | 'attack' | 'directHit' | 'heal' | 'cast') => void;
  triggerAttackVisual: (
    attackerTag: 'P1' | 'P2',
    attackSlot: number,
    defendSlot: number,
    isDirectHit: boolean,
    color: string,
    dealAtk?: number
  ) => void;
  triggerHealVisual: (playerTag: 'P1' | 'P2', activeSlotIndex: number, healedAmount: number) => void;
  triggerAbilityVisual?: (
    casterTag: 'P1' | 'P2',
    casterSlot: number,
    targetTag: 'P1' | 'P2',
    targetSlot: number,
    dmgAmount: number,
    color: string
  ) => void;
  triggerDelayVisual?: (playerTag: 'P1' | 'P2', benchSlotIndex: number, amount: number) => void;
  triggerFatigueVisual?: (playerTag: 'P1' | 'P2') => void;
  onGameOver: (winner: 'P1' | 'P2') => void;
}

export class WizardWarsEngine {
  public p1!: PlayerState;
  public p2!: PlayerState;
  public currentTurn: number = 1;
  public activePlayer: 'P1' | 'P2' = 'P1';
  public phase: GamePhase = 'TICK';
  public combatSlotIndex: number = -1;
  public gameEnded: boolean = false;
  public winner: 'P1' | 'P2' | null = null;
  public cardIdCounter: number = 0;

  private callbacks: EngineCallbacks;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.resetGame();
  }

  public resetGame(p1Type: string = 'Mixed', p2Type: string = 'Mixed') {
    this.p1 = {
      hp: 30,
      maxHp: 30,
      deck: [],
      bench: Array(7).fill(null),
      active: Array(5).fill(null),
      graveyard: []
    };
    this.p2 = {
      hp: 30,
      maxHp: 30,
      deck: [],
      bench: Array(7).fill(null),
      active: Array(5).fill(null),
      graveyard: []
    };

    this.currentTurn = 1;
    this.activePlayer = 'P1';
    this.phase = 'TICK';
    this.combatSlotIndex = -1;
    this.gameEnded = false;
    this.winner = null;
    this.cardIdCounter = 0;

    const colors = ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black', 'Grey'];
    
    let resolvedP1 = p1Type;
    if (resolvedP1 === 'Random') {
      resolvedP1 = colors[Math.floor(Math.random() * colors.length)];
    }
    
    let resolvedP2 = p2Type;
    if (resolvedP2 === 'Random') {
      resolvedP2 = colors[Math.floor(Math.random() * colors.length)];
    }

    this.buildDeck(this.p1, 'P1', resolvedP1);
    this.buildDeck(this.p2, 'P2', resolvedP2);

    // Draw initial setup (Each draws 1 card to bench at start)
    this.drawCardToBench(this.p1, 'P1', true);
    this.drawCardToBench(this.p2, 'P2', true);
  }

  private buildDeck(player: PlayerState, ownerPrefix: 'P1' | 'P2', deckType: string) {
    player.deck = [];
    let pool = CARD_TEMPLATES;
    if (deckType !== 'Mixed') {
      pool = CARD_TEMPLATES.filter(t => t.faction.toLowerCase() === deckType.toLowerCase());
    }
    if (pool.length === 0) {
      pool = CARD_TEMPLATES;
    }

    for (let i = 0; i < 24; i++) {
      const t = pool[i % pool.length];
      player.deck.push({
        id: `${ownerPrefix}_card_${this.cardIdCounter++}`,
        name: t.name,
        costDelay: t.cost,
        currentDelay: t.cost,
        faction: t.faction,
        attack: t.attack,
        baseAttack: t.attack,
        hp: t.health,
        maxHp: t.maxHealth,
        baseMaxHp: t.maxHealth,
        ability: t.ability ? { ...t.ability } : null,
        abilities: t.abilities ? [...t.abilities] : undefined,
        dead: false,
        statuses: [],
        cardArtUrl: t.cardArtUrl || null
      });
    }
    player.deck.sort(() => Math.random() - 0.5);
  }

  public drawCardToBench(player: PlayerState, playerTag: 'P1' | 'P2', isQuiet: boolean = false): Card | null {
    if (player.deck.length === 0) {
      player.hp = Math.max(0, player.hp - 1);
      if (!isQuiet) {
        this.callbacks.appendLog(`⚠️ [${playerTag}] Deck empty! Takes 1 Fatigue damage! (${player.hp}/30 HP)`, 'text-rose-500 font-bold');
        this.callbacks.playSfx('directHit');
        if (this.callbacks.triggerFatigueVisual) {
          this.callbacks.triggerFatigueVisual(playerTag);
        }
      }
      if (player.hp <= 0) {
        const winningTag = playerTag === 'P1' ? 'P2' : 'P1';
        this.resolveGameOver(winningTag);
      }
      return null;
    }

    const freeSlotIndex = player.bench.findIndex(s => s === null);
    if (freeSlotIndex === -1) {
      if (!isQuiet) this.callbacks.appendLog(`🚫 [${playerTag}] Bench FULL! Skipped draw (overflow).`, 'text-amber-500');
      return null;
    }

    const card = player.deck.pop()!;
    player.bench[freeSlotIndex] = card;

    if (!isQuiet) {
      this.callbacks.appendLog(`📥 [${playerTag}] Draw Phase: Drew "${card.name}" [Cost/Delay: ${card.costDelay}] to Bench slot ${freeSlotIndex + 1}.`, 'text-sky-400');
      this.callbacks.playSfx('draw');
    }
    return card;
  }

  public executeNextStep() {
    if (this.gameEnded) return;

    const p = (this.activePlayer === 'P1') ? this.p1 : this.p2;
    const opp = (this.activePlayer === 'P1') ? this.p2 : this.p1;
    const tag = this.activePlayer;
    const oppTag = (this.activePlayer === 'P1') ? 'P2' : 'P1';

    switch (this.phase) {
      case 'TICK': {
        this.callbacks.appendLog(`⏳ [${tag}] Tick Phase: Decrementing Bench timers.`, 'text-slate-400');
        let ticketCount = 0;
        p.bench.forEach((card) => {
          if (card && card.currentDelay > 0) {
            card.currentDelay--;
            ticketCount++;
          }
        });
        if (ticketCount > 0) {
          this.callbacks.playSfx('tick');
          this.callbacks.appendLog(`⏱️ Ticked down delays on ${ticketCount} Bench cards.`, 'text-slate-500');
        } else {
          this.callbacks.appendLog(`⏱️ No cards waiting on bench.`, 'text-slate-600');
        }
        this.phase = 'DRAW';
        break;
      }

      case 'DRAW': {
        this.callbacks.appendLog(`--- [TURN ${this.currentTurn} - ${tag} Turn Starts] ---`, 'text-indigo-300 font-bold border-t border-indigo-950/40 pt-2');
        if (this.currentTurn === 1 && tag === 'P1') {
          this.callbacks.appendLog(`⚡ [P1] skips Turn 1 Draw Phase (initial balance).`, 'text-indigo-400');
        } else {
          this.drawCardToBench(p, tag);
        }
        this.phase = 'DEPLOY';
        break;
      }

      case 'DEPLOY': {
        this.callbacks.appendLog(`🚀 [${tag}] Deploy Phase: Moving completed delay (0) units.`, 'text-slate-400');
        let deployedUnits = 0;

        for (let i = 0; i < 7; i++) {
          const card = p.bench[i];
          if (card && card.currentDelay === 0) {
            const freeActiveIdx = p.active.findIndex(s => s === null);
            if (freeActiveIdx !== -1) {
              p.active[freeActiveIdx] = card;
              p.bench[i] = null;
              deployedUnits++;
              this.callbacks.appendLog(`⚡ "${card.name}" deployed to Active Slot ${freeActiveIdx + 1}!`, 'text-emerald-400');
            } else {
              this.callbacks.appendLog(`⚠️ Active Lane full! "${card.name}" stays on Bench.`, 'text-amber-500');
            }
          }
        }

        if (deployedUnits > 0) {
          this.callbacks.playSfx('deploy');
          this.recalculateUnionStats();
        } else {
          this.callbacks.appendLog(`ℹ️ No Bench units ready to deploy.`, 'text-slate-600');
        }

        this.phase = 'COMBAT';
        this.combatSlotIndex = 0;
        break;
      }

      case 'COMBAT': {
        const slot = this.combatSlotIndex;
        if (slot === 0) {
          this.callbacks.appendLog(`⚔️ [${tag}] Combat Phase: Slots attacking left-to-right.`, 'text-slate-400');
        }

        const attacker = p.active[slot];
        if (attacker && !attacker.dead) {
          // --- FROZEN MECHANIC CHECK ---
          if (attacker.statuses && attacker.statuses.includes('frozen')) {
            attacker.statuses = attacker.statuses.filter(s => s !== 'frozen');
            this.callbacks.appendLog(`❄️ Slot ${slot + 1}: "${attacker.name}" is Frozen! Skips attack sequence (Frozen consumed).`, 'text-cyan-300 font-bold');
            this.callbacks.playSfx('tick');
            this.combatSlotIndex++;
            if (this.combatSlotIndex >= 5) {
              this.phase = 'CLEANUP';
            }
            break;
          }

          const defender = opp.active[slot];

          // --- STEP A: FIRE COMBAT HEAL ABILITY EVERY TURN (e.g. Heal [X] or Paladin Heal) ---
          this.resolveCombatAbilities(attacker, tag, slot);

          // Skip further action if healer killed themselves (guard clause)
          if (attacker.dead || attacker.hp <= 0) {
            this.combatSlotIndex++;
            if (this.combatSlotIndex >= 5) {
              this.phase = 'CLEANUP';
            }
            break;
          }

          // --- STEP B: FIRE ON-ATTACK ABILITY TRIGGERS (Toxic, Fireball, Frostbolt, Lifesteal) ---
          this.resolveOnAttackAbilities(attacker, opp, tag, defender, slot);

          if (attacker.dead || attacker.hp <= 0) {
            this.combatSlotIndex++;
            if (this.combatSlotIndex >= 5) {
              this.phase = 'CLEANUP';
            }
            break;
          }

          const uppercaseFaction = attacker.faction.toUpperCase();
          const factionInfo = FACTIONS[uppercaseFaction] || FACTIONS.NEUTRAL;

          // --- STEP C: EXECUTE PHYSICAL STRIKES (Handles Double Strike consecutively) ---
          const isDoubleStrike = attacker.ability && attacker.ability.type === "Double Strike";

          // Strike 1
          const gameOver = this.executePhysicalStrike(attacker, defender, tag, slot, false);
          if (gameOver) return;

          // Strike 2
          if (isDoubleStrike && !attacker.dead) {
            const gameOver2 = this.executePhysicalStrike(attacker, defender, tag, slot, true);
            if (gameOver2) return;
          }

          // --- STEP D: CLEAVE DAMAGE SWEEP ---
          if (attacker.ability && attacker.ability.type === "Cleave" && !attacker.dead) {
            const adjSlots = [slot - 1, slot + 1];
            let cleaveHeaderPrinted = false;

            for (const adjSlot of adjSlots) {
              if (adjSlot >= 0 && adjSlot < 5) {
                const adjDefender = opp.active[adjSlot];
                if (adjDefender && !adjDefender.dead) {
                  if (!cleaveHeaderPrinted) {
                    this.callbacks.appendLog(`  * [Cleave] "${attacker.name}" sweeps adjacent enemy slots!`, 'text-purple-400 font-semibold');
                    cleaveHeaderPrinted = true;
                  }
                  const adjBlock = (adjDefender.ability) ? (
                    adjDefender.ability.type === "Block" ? (adjDefender.ability.value ?? 0) : 
                    adjDefender.ability.type === "Paladin" ? (adjDefender.ability.value ?? 0) : 0
                  ) : 0;
                  const finalAdjDmg = Math.max(0, attacker.attack - adjBlock);

                  adjDefender.hp -= finalAdjDmg;
                  this.callbacks.triggerAttackVisual(tag, slot, adjSlot, false, factionInfo.glow);

                  this.callbacks.appendLog(`  * Cleave hits Enemy Adjacent Slot ${adjSlot + 1} "${adjDefender.name}" for ${finalAdjDmg} dmg! ${adjBlock > 0 ? `(Blocked ${adjBlock})` : ''} (${adjDefender.hp}/${adjDefender.maxHp} HP)`, 'text-rose-300');

                  if (finalAdjDmg > 0 && adjDefender.ability && adjDefender.ability.type === "Berserk") {
                    const bVal = adjDefender.ability.value ?? 1;
                    adjDefender.attack += bVal;
                    this.callbacks.appendLog(`💢 Berserk: "${adjDefender.name}" takes damage! Attack power permanently rises by +${bVal} (Now: ${adjDefender.attack} ATK).`, 'text-red-400 font-semibold');
                  }

                  if (adjDefender.hp <= 0) {
                    adjDefender.dead = true;
                    this.callbacks.appendLog(`  * Enemy adjacent "${adjDefender.name}" defeated by Cleave sweep!`, 'text-red-500');
                  }
                }
              }
            }
          }

          // --- TRIGGER: Post-Attack Phase (Poison Processing) ---
          if (!attacker.dead && attacker.statuses && attacker.statuses.includes('poison')) {
            const poisonDmg = 1;
            attacker.hp -= poisonDmg;
            this.callbacks.appendLog(`☣️ Poison Tick: "${attacker.name}" takes ${poisonDmg} Poison damage post-attack segment! (${attacker.hp}/${attacker.maxHp} HP)`, 'text-emerald-500 font-semibold');

            if (attacker.ability && attacker.ability.type === 'Berserk') {
              const bVal = attacker.ability.value ?? 1;
              attacker.attack += bVal;
              this.callbacks.appendLog(`💢 Berserk: "${attacker.name}" took damage and gained +${bVal} ATK!`, 'text-red-400 font-semibold');
            }

            if (attacker.hp <= 0) {
              attacker.dead = true;
              this.callbacks.appendLog(`💀 "${attacker.name}" perished from Poison!`, 'text-red-500');
            }
          }
        }

        this.combatSlotIndex++;
        if (this.combatSlotIndex >= 5) {
          this.phase = 'CLEANUP';
        }
        break;
      }

      case 'CLEANUP': {
        this.callbacks.appendLog(`♻️ Cleanup & Shift: Processing end-of-turn and defeated slots.`, 'text-slate-400');

        // --- TRIGGER: End of Turn Phase (Regenerate & Burning processing) ---
        p.active.forEach((card, idx) => {
          if (card && !card.dead) {
            // Regenerate 1
            let regVal = 0;
            if (card.ability && card.ability.type === "Regenerate") {
              regVal = card.ability.value ?? 1;
            } else if (card.abilities) {
              const regenAbility = card.abilities.find(a => a.startsWith("Regenerate"));
              if (regenAbility) {
                const parts = regenAbility.split(" ");
                regVal = parts.length > 1 ? parseInt(parts[1], 10) : 1;
              }
            }

            if (regVal > 0) {
              if (card.hp < card.maxHp) {
                const oldHp = card.hp;
                card.hp = Math.min(card.maxHp, card.hp + regVal);
                const healed = card.hp - oldHp;
                this.callbacks.appendLog(`✨ Regenerate: "${card.name}" heals +${healed} HP at turn end! (${card.hp}/${card.maxHp} HP)`, 'text-emerald-400 font-medium');
                this.callbacks.playSfx('heal');
                this.callbacks.triggerHealVisual(tag, idx, healed);
              }
            }

            // Burning processing
            if (card.statuses && card.statuses.includes('burning')) {
              const burnDmg = 1;
              card.hp -= burnDmg;
              this.callbacks.appendLog(`🔥 Burning Tick: "${card.name}" suffers ${burnDmg} fire damage at turn end! (${card.hp}/${card.maxHp} HP)`, 'text-orange-500 font-semibold');

              if (card.ability && card.ability.type === 'Berserk') {
                const bVal = card.ability.value ?? 1;
                card.attack += bVal;
                this.callbacks.appendLog(`💢 Berserk: "${card.name}" took damage and gained +${bVal} ATK!`, 'text-red-400 font-semibold');
              }

              if (card.hp <= 0) {
                card.dead = true;
                this.callbacks.appendLog(`💀 "${card.name}" burned to ashes!`, 'text-red-500');
              }
            }
          }
        });

        this.clearDefeatedUnits(this.p1, 'P1');
        this.clearDefeatedUnits(this.p2, 'P2');

        this.shiftLaneLeft(this.p1, 'P1');
        this.shiftLaneLeft(this.p2, 'P2');

        this.activePlayer = (tag === 'P1') ? 'P2' : 'P1';
        if (this.activePlayer === 'P1') {
          this.currentTurn++;
        }

        this.callbacks.appendLog(`Passes initiative to [${this.activePlayer}].`, 'text-indigo-500 font-semibold');
        this.phase = 'TICK';
        break;
      }
    }
  }

  public resolveCombatAbilities(card: Card, tag: 'P1' | 'P2', slotIdx: number) {
    const p = (tag === 'P1') ? this.p1 : this.p2;

    if (card.ability && (card.ability.type === "Heal" || card.ability.type === "Paladin")) {
      const val = card.ability.type === "Paladin" ? (card.ability.value2 ?? 1) : (card.ability.value ?? 1);
      const friendlyActive = p.active.filter((c): c is Card => c !== null && !c.dead);
      let target: Card | null = null;

      if (friendlyActive.length > 0) {
        const damagedFriendlies = friendlyActive.filter(c => c.hp < c.maxHp);
        if (damagedFriendlies.length > 0) {
          damagedFriendlies.sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp));
          target = damagedFriendlies[0];
        } else {
          if (card.hp < card.maxHp) {
            target = card;
          }
        }
      }

      if (target) {
        const oldHp = target.hp;
        target.hp = Math.min(target.maxHp, target.hp + val);
        const restored = target.hp - oldHp;

        this.callbacks.appendLog(`✨ [Heal] "${card.name}" channels magic! Heals "${target.name}" for +${restored} HP (Now: ${target.hp}/${target.maxHp}).`, 'text-emerald-400 font-semibold');
        this.callbacks.playSfx('heal');

        const activeIdx = p.active.indexOf(target);
        if (activeIdx !== -1) {
          this.callbacks.triggerHealVisual(tag, activeIdx, restored);
        }
      } else {
        this.callbacks.appendLog(`✨ [Heal] "${card.name}" skips healing trigger (all lane targets fully healthy).`, 'text-slate-500');
      }
    }
  }

  public resolveOnAttackAbilities(attacker: Card, opp: PlayerState, tag: 'P1' | 'P2', defender: Card | null, attackerSlot: number) {
    if (!attacker.ability) return;

    const oppTag = (tag === 'P1') ? 'P2' : 'P1';

    switch (attacker.ability.type) {
      case "Toxic": {
        if (defender && !defender.dead) {
          if (!defender.statuses.includes('poison')) {
            defender.statuses.push('poison');
            this.callbacks.appendLog(`☣️ Toxic 1: "${attacker.name}" applied Poison 1 to "${defender.name}"!`, 'text-emerald-400');
          } else {
            this.callbacks.appendLog(`☣️ Toxic 1: Poison status already active on "${defender.name}".`, 'text-slate-500');
          }
        }
        break;
      }
      case "Fireball": {
        const activeOpponents = opp.active.filter((c): c is Card => c !== null && !c.dead);
        if (activeOpponents.length > 0) {
          const target = activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
          const targetSlotIdx = opp.active.indexOf(target);
          const dmg = attacker.ability.value ?? 1;
          target.hp -= dmg;
          
          this.callbacks.appendLog(`🔥 "${attacker.name}" casts Fireball on Enemy Slot ${targetSlotIdx + 1}! ("${target.name}" takes ${dmg} damage)`, 'text-amber-500');
          this.callbacks.playSfx('cast');

          if (this.callbacks.triggerAbilityVisual) {
            this.callbacks.triggerAbilityVisual(tag, attackerSlot, oppTag, targetSlotIdx, dmg, '#f97316');
          }
          
          if (!target.statuses.includes('burning')) {
            target.statuses.push('burning');
            this.callbacks.appendLog(`🔥 "${target.name}" is now Burning!`, 'text-orange-400');
          }

          if (target.ability && target.ability.type === 'Berserk') {
            const bVal = target.ability.value ?? 1;
            target.attack += bVal;
            this.callbacks.appendLog(`💢 Berserk: "${target.name}" took damage and gained +${bVal} ATK!`, 'text-red-400 font-semibold');
          }

          if (target.hp <= 0) {
            target.dead = true;
            this.callbacks.appendLog(`💀 "${target.name}" fell to Fireball!`, 'text-red-500');
          }
        } else {
          this.callbacks.appendLog(`🔥 Fireball 1: No active enemy targets on the board to burn.`, 'text-slate-500');
        }
        break;
      }
      case "Frostbolt": {
        const activeOpponents = opp.active.filter((c): c is Card => c !== null && !c.dead);
        if (activeOpponents.length > 0) {
          const target = activeOpponents[Math.floor(Math.random() * activeOpponents.length)];
          const targetSlotIdx = opp.active.indexOf(target);
          const dmg = attacker.ability.value ?? 1;
          target.hp -= dmg;
          
          this.callbacks.appendLog(`❄️ "${attacker.name}" casts Frostbolt on Enemy Slot ${targetSlotIdx + 1}! ("${target.name}" takes ${dmg} damage)`, 'text-cyan-400');
          this.callbacks.playSfx('cast');

          if (this.callbacks.triggerAbilityVisual) {
            this.callbacks.triggerAbilityVisual(tag, attackerSlot, oppTag, targetSlotIdx, dmg, '#06b6d4');
          }
          
          if (Math.random() < 0.20) {
            if (!target.statuses.includes('frozen')) {
              target.statuses.push('frozen');
              this.callbacks.appendLog(`❄️ "${target.name}" is Frozen!`, 'text-cyan-300 font-bold');
            }
          }

          if (target.ability && target.ability.type === 'Berserk') {
            const bVal = target.ability.value ?? 1;
            target.attack += bVal;
            this.callbacks.appendLog(`💢 Berserk: "${target.name}" took damage and gained +${bVal} ATK!`, 'text-red-400 font-semibold');
          }

          if (target.hp <= 0) {
            target.dead = true;
            this.callbacks.appendLog(`💀 "${target.name}" fell to Frostbolt!`, 'text-red-500');
          }
        } else {
          this.callbacks.appendLog(`❄️ Frostbolt 2: No active enemy targets on the board to freeze.`, 'text-slate-500');
        }
        break;
      }
      case "Lifesteal": {
        const val = attacker.ability.value ?? 1;
        if (attacker.hp < attacker.maxHp) {
          const oldHp = attacker.hp;
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + val);
          const healed = attacker.hp - oldHp;
          this.callbacks.appendLog(`🩸 Lifesteal ${val}: "${attacker.name}" drains life, healing for +${healed} HP (Now: ${attacker.hp}/${attacker.maxHp} HP).`, 'text-rose-500 font-semibold');
          this.callbacks.playSfx('heal');
          const p = (tag === 'P1') ? this.p1 : this.p2;
          const activeIdx = p.active.indexOf(attacker);
          if (activeIdx !== -1) {
            this.callbacks.triggerHealVisual(tag, activeIdx, healed);
          }
        }
        break;
      }
      case "Rally": {
        const val = attacker.ability.value ?? 1;
        const p = (tag === 'P1') ? this.p1 : this.p2;
        const friendlyActive = p.active.filter((c): c is Card => c !== null && !c.dead && c !== attacker);
        if (friendlyActive.length > 0) {
          const randTarget = friendlyActive[Math.floor(Math.random() * friendlyActive.length)];
          randTarget.attack += val;
          this.callbacks.appendLog(`🥁 Rally ${val}: "${attacker.name}" beats war drums! "${randTarget.name}" gains +${val} permanent ATK (Now: ${randTarget.attack} ATK).`, 'text-rose-400 font-semibold');
          this.callbacks.playSfx('heal');
          const activeIdx = p.active.indexOf(randTarget);
          if (activeIdx !== -1) {
            this.callbacks.triggerHealVisual(tag, activeIdx, 0);
          }
        } else {
          this.callbacks.appendLog(`🥁 Rally: "${attacker.name}" has no other active allies to inspire.`, 'text-slate-500');
        }
        break;
      }
      case "Haste": {
        const val = attacker.ability.value ?? 1;
        const p = (tag === 'P1') ? this.p1 : this.p2;
        const benchedList = p.bench.filter((c): c is Card => c !== null && c.currentDelay > 0);
        if (benchedList.length > 0) {
          const randCard = benchedList[Math.floor(Math.random() * benchedList.length)];
          const oldDelay = randCard.currentDelay;
          randCard.currentDelay = Math.max(0, randCard.currentDelay - val);
          const changed = oldDelay - randCard.currentDelay;
          this.callbacks.appendLog(`⚡ Haste ${val}: "${attacker.name}" accelerates friendly bench! "${randCard.name}" delay reduced by ${changed} (Now: ${randCard.currentDelay}).`, 'text-yellow-400 font-semibold');
          this.callbacks.playSfx('tick');
          
          if (changed > 0 && this.callbacks.triggerDelayVisual) {
            const bIdx = p.bench.indexOf(randCard);
            if (bIdx !== -1) {
              this.callbacks.triggerDelayVisual(tag, bIdx, -changed);
            }
          }
        } else {
          this.callbacks.appendLog(`⚡ Haste: "${attacker.name}" skips action (no cards waiting on bench).`, 'text-slate-500');
        }
        break;
      }
      case "Slow": {
        const val = attacker.ability.value ?? 1;
        const oppCurrent = (tag === 'P1') ? this.p2 : this.p1;
        const oppTag = (tag === 'P1') ? 'P2' : 'P1';
        const benchedOpp = oppCurrent.bench.filter((c): c is Card => c !== null);
        if (benchedOpp.length > 0) {
          const randCard = benchedOpp[Math.floor(Math.random() * benchedOpp.length)];
          randCard.currentDelay += val;
          this.callbacks.appendLog(`⏳ Slow ${val}: "${attacker.name}" curses opponent bench! "${randCard.name}" delay increased by +${val} tick (Now: ${randCard.currentDelay}).`, 'text-purple-400 font-semibold');
          this.callbacks.playSfx('tick');

          if (this.callbacks.triggerDelayVisual) {
            const bIdx = oppCurrent.bench.indexOf(randCard);
            if (bIdx !== -1) {
              this.callbacks.triggerDelayVisual(oppTag, bIdx, val);
            }
          }
        } else {
          this.callbacks.appendLog(`⏳ Slow: "${attacker.name}" has no opponent bench cards to decelerate.`, 'text-slate-500');
        }
        break;
      }
    }
  }

  private executePhysicalStrike(
    attacker: Card,
    defender: Card | null,
    tag: 'P1' | 'P2',
    slot: number,
    isSecondStrike: boolean = false
  ): boolean {
    const opp = (tag === 'P1') ? this.p2 : this.p1;
    const oppTag = (tag === 'P1') ? 'P2' : 'P1';
    const uppercaseFaction = attacker.faction.toUpperCase();
    const factionInfo = FACTIONS[uppercaseFaction] || FACTIONS.NEUTRAL;

    let targetSlot = slot;
    let currentDefender = opp.active[slot];

    // --- Taunt Passive Check ---
    // If enemy cards attack, their physical hits MUST target the active card with Taunt.
    // If multiple active cards have Taunt, physical attacks are rerouted to the left-most Taunt unit.
    let tauntTargetSlot = -1;
    let tauntTargetCard: Card | null = null;
    for (let i = 0; i < 5; i++) {
      const c = opp.active[i];
      if (c && !c.dead && c.hp > 0) {
        if ((c.ability && c.ability.type === "Taunt") || (c.abilities && c.abilities.includes("Taunt"))) {
          tauntTargetSlot = i;
          tauntTargetCard = c;
          break;
        }
      }
    }

    if (tauntTargetCard) {
      targetSlot = tauntTargetSlot;
      currentDefender = tauntTargetCard;
      if (tauntTargetSlot !== slot) {
        this.callbacks.appendLog(`🛡️ [Taunt Intercept] Attack from Slot ${slot + 1} redirected to "${tauntTargetCard.name}" in Slot ${tauntTargetSlot + 1}!`, 'text-indigo-300 font-medium');
      }
    }

    const isDefenderActive = currentDefender && !currentDefender.dead;

    // --- Surprise Attack Trigger Check ---
    let dealAtk = attacker.attack;
    let wasSurprise = false;
    let preSurpriseAtk = attacker.attack;
    if (attacker.ability && attacker.ability.type === "Surprise Attack" && !attacker.hasSurpriseAttackTriggered) {
      wasSurprise = true;
      attacker.hasSurpriseAttackTriggered = true;
      attacker.attack = attacker.attack * 3;
      dealAtk = attacker.attack;
      this.callbacks.appendLog(`🗡️ Surprise Attack!: "${attacker.name}" strikes from the shadows for 3x damage! (Deals ${dealAtk} base physical power!)`, 'text-red-400 font-bold');
    }

    let isGameOver = false;

    if (isDefenderActive) {
      // --- Dodge Passive Check ---
      if (currentDefender!.ability && currentDefender!.ability.type === "Dodge") {
        const dodgeChance = (currentDefender!.ability.value ?? 1) * 0.10;
        if (Math.random() < dodgeChance) {
          this.callbacks.appendLog(`💨 Slot ${targetSlot + 1}: Attack missed! "${currentDefender!.name}" Dodged the strike from "${attacker.name}"!`, 'text-slate-400');
          this.callbacks.triggerAttackVisual(tag, slot, targetSlot, false, factionInfo.glow, dealAtk);
          this.callbacks.playSfx('attack');
          
          if (wasSurprise) attacker.attack = preSurpriseAtk;
          return false;
        }
      }

      // --- Block Calculation ---
      const block = (currentDefender!.ability) ? (
        currentDefender!.ability.type === "Block" ? (currentDefender!.ability.value ?? 0) : 
        currentDefender!.ability.type === "Paladin" ? (currentDefender!.ability.value ?? 0) : 0
      ) : 0;

      const finalDmg = Math.max(0, dealAtk - block);

      currentDefender!.hp -= finalDmg;
      this.callbacks.triggerAttackVisual(tag, slot, targetSlot, false, factionInfo.glow, dealAtk);
      this.callbacks.playSfx('attack');

      const strikeName = isSecondStrike ? " (Second Strike)" : "";
      this.callbacks.appendLog(`💥 "${attacker.name}" attacks Enemy Slot ${targetSlot + 1}${strikeName}! (Deals ${finalDmg} dmg to "${currentDefender!.name}" ${block > 0 ? `[Blocked ${block}]` : ''} - HP: ${currentDefender!.hp}/${currentDefender!.maxHp})`, 'text-rose-400');

      if (finalDmg > 0) {
        // 1. Weaken Trigger
        if (attacker.ability && attacker.ability.type === "Weaken") {
          const wVal = attacker.ability.value ?? 1;
          currentDefender!.attack = Math.max(0, currentDefender!.attack - wVal);
          this.callbacks.appendLog(`🧬 Weaken ${wVal}: "${attacker.name}" weakens "${currentDefender!.name}"! ATK permanently reduced by ${wVal} (Now: ${currentDefender!.attack} ATK).`, 'text-indigo-400 font-semibold');
        }

        // 2. Thorn Passive
        if (currentDefender!.ability && currentDefender!.ability.type === "Thorn") {
          const thornDmg = currentDefender!.ability.value ?? 1;
          attacker.hp -= thornDmg;
          this.callbacks.appendLog(`🌵 Thorn 1: "${currentDefender!.name}" spikes back, dealing ${thornDmg} damage to "${attacker.name}"! (${attacker.hp}/${attacker.maxHp} HP)`, 'text-green-400');
          
          if (attacker.ability && attacker.ability.type === 'Berserk') {
            const bVal = attacker.ability.value ?? 1;
            attacker.attack += bVal;
            this.callbacks.appendLog(`💢 Berserk: "${attacker.name}" took damage and gained +${bVal} ATK!`, 'text-red-400 font-semibold');
          }

          if (attacker.hp <= 0) {
            attacker.dead = true;
            this.callbacks.appendLog(`💀 Attacker "${attacker.name}" was defeated by Thorns!`, 'text-red-500');
          }
        }

        // 3. Berserk Passive on Defender
        if (currentDefender!.ability && currentDefender!.ability.type === "Berserk") {
          const bVal = currentDefender!.ability.value ?? 1;
          currentDefender!.attack += bVal;
          this.callbacks.appendLog(`💢 Berserk: "${currentDefender!.name}" is enraged by taking damage! Attack power permanently rises by +${bVal} (Now: ${currentDefender!.attack} ATK).`, 'text-red-400 font-semibold');
        }
      }

      if (currentDefender!.hp <= 0) {
        currentDefender!.dead = true;
        this.callbacks.appendLog(`💀 "${currentDefender!.name}" defeated in opponent's Slot ${targetSlot + 1}!`, 'text-red-500');
      }
    } else {
      // Direct Strike (either no defender or dead defender slot)
      const directDmg = dealAtk;
      opp.hp = Math.max(0, opp.hp - directDmg);

      this.callbacks.triggerAttackVisual(tag, slot, targetSlot, true, factionInfo.glow, dealAtk);
      this.callbacks.playSfx('directHit');

      const strikeName = isSecondStrike ? " (Second Strike)" : "";
      this.callbacks.appendLog(`💥 "${attacker.name}" attacks Enemy Slot ${targetSlot + 1}${strikeName}! Direct strike on [${oppTag}] for ${directDmg} dmg! ([${oppTag}] HP: ${opp.hp}/30)`, 'text-amber-400 font-bold');

      if (opp.hp <= 0) {
        this.resolveGameOver(tag);
        isGameOver = true;
      }
    }

    if (wasSurprise) {
      attacker.attack = preSurpriseAtk;
    }

    return isGameOver;
  }

  private triggerDeathAbilities(card: Card, ownerTag: 'P1' | 'P2') {
    if (card.ability && card.ability.type === "Explode") {
      const dmg = card.ability.value ?? 1;
      const oppTag = (ownerTag === 'P1') ? 'P2' : 'P1';
      const opp = (ownerTag === 'P1') ? this.p2 : this.p1;

      this.callbacks.appendLog(`💣💥 Death Trigger: "${card.name}" Explodes! Dealing ${dmg} damage to all [${oppTag}] active units and directly to the Player!`, 'text-red-500 font-black tracking-wider animate-pulse');
      this.callbacks.playSfx('cast');

      // 1. Damage enemy active units
      opp.active.forEach((enemyCard, idx) => {
        if (enemyCard && !enemyCard.dead) {
          enemyCard.hp -= dmg;
          
          if (this.callbacks.triggerAbilityVisual) {
            this.callbacks.triggerAbilityVisual(ownerTag, 2, oppTag, idx, dmg, '#ef4444');
          }

          this.callbacks.appendLog(`  * Explosion hits "${enemyCard.name}" in Slot ${idx + 1} for ${dmg} damage! (${enemyCard.hp}/${enemyCard.maxHp} HP)`, 'text-rose-400');
          
          if (enemyCard.hp <= 0) {
            enemyCard.dead = true;
          }
        }
      });

      // 2. Damage enemy Player
      opp.hp = Math.max(0, opp.hp - dmg);
      this.callbacks.appendLog(`  * Explosion deals ${dmg} damage directly to [${oppTag}] Player! (Player HP: ${opp.hp}/30)`, 'text-red-400 font-bold');
      
      if (opp.hp <= 0) {
        this.resolveGameOver(ownerTag);
      }
    }
  }

  public recalculateUnionStats() {
    // Player P1
    const activeP1 = this.p1.active.filter((c): c is Card => c !== null && !c.dead && c.name === "Peasant");
    const countP1 = activeP1.length;
    this.p1.active.forEach(c => {
      if (c && !c.dead && c.name === "Peasant") {
        const oldMax = c.maxHp;
        c.attack = countP1;
        c.maxHp = countP1;
        if (countP1 > oldMax) {
          c.hp += (countP1 - oldMax);
        } else {
          c.hp = Math.min(c.hp, countP1);
        }
      }
    });

    // Player P2
    const activeP2 = this.p2.active.filter((c): c is Card => c !== null && !c.dead && c.name === "Peasant");
    const countP2 = activeP2.length;
    this.p2.active.forEach(c => {
      if (c && !c.dead && c.name === "Peasant") {
        const oldMax = c.maxHp;
        c.attack = countP2;
        c.maxHp = countP2;
        if (countP2 > oldMax) {
          c.hp += (countP2 - oldMax);
        } else {
          c.hp = Math.min(c.hp, countP2);
        }
      }
    });
  }

  public clearAllDefeated() {
    let clearedAny = true;
    while (clearedAny) {
      clearedAny = false;
      
      // Check P1
      for (let i = 0; i < 5; i++) {
        const card = this.p1.active[i];
        if (card && (card.dead || card.hp <= 0)) {
          this.triggerDeathAbilities(card, 'P1');
          this.p1.graveyard.push(card);
          this.p1.active[i] = null;
          this.callbacks.appendLog(`🪦 Defeated "${card.name}" placed in [P1] Graveyard.`, 'text-slate-500');
          clearedAny = true;
          this.recalculateUnionStats();
        }
      }

      // Check P2
      for (let i = 0; i < 5; i++) {
        const card = this.p2.active[i];
        if (card && (card.dead || card.hp <= 0)) {
          this.triggerDeathAbilities(card, 'P2');
          this.p2.graveyard.push(card);
          this.p2.active[i] = null;
          this.callbacks.appendLog(`🪦 Defeated "${card.name}" placed in [P2] Graveyard.`, 'text-slate-500');
          clearedAny = true;
          this.recalculateUnionStats();
        }
      }
    }
  }

  private clearDefeatedUnits(player: PlayerState, tag: 'P1' | 'P2') {
    this.clearAllDefeated();
  }

  private shiftLaneLeft(player: PlayerState, tag: 'P1' | 'P2') {
    const activeArray = player.active;
    const nonNullCards = activeArray.filter(c => c !== null);
    let shiftedCount = 0;

    for (let i = 0; i < nonNullCards.length; i++) {
      if (activeArray[i] !== nonNullCards[i]) {
        shiftedCount++;
      }
    }

    while (nonNullCards.length < 5) {
      nonNullCards.push(null);
    }

    player.active = nonNullCards;
    if (shiftedCount > 0) {
      this.callbacks.appendLog(`⏩ Shifted active lanes leftward into open spaces.`, 'text-indigo-400');
    }
  }

  private resolveGameOver(winningPlayerTag: 'P1' | 'P2') {
    this.gameEnded = true;
    this.winner = winningPlayerTag;
    this.callbacks.appendLog(`🏆🏆🏆 BATTLE RESOLVED: [${winningPlayerTag}] is VICTORIOUS! 🏆🏆🏆`, 'text-yellow-400 font-bold border-y border-yellow-500/20 py-2 mt-1 text-center');
    this.callbacks.onGameOver(winningPlayerTag);
    this.callbacks.playSfx('heal');
  }
}
