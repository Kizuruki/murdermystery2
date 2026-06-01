import type * as Party from "partykit/server";

// ─── Types ───────────────────────────────────────────────────────────────────

type Alignment = "Good" | "Evil";
type Phase = "lobby" | "role_reveal" | "day" | "discussion" | "voting" | "judge_save" | "night_action" | "night_feedback" | "game_over" | "scoring";
type CauseOfDeath = "Murdered" | "Assassinated" | "Vigilante kill" | "Failed vigilante attempt" | "Voted out" | "Jailed and murdered";

type Role =
    | "Murderer" | "Assassin" | "Spy" | "Witch"
    | "Doctor" | "Detective" | "Judge" | "Mayor" | "Psychic"
    | "Medium" | "Coroner" | "Jailor" | "Vigilante" | "Civilian";

interface Clue {
    text: string;
    isReal: boolean;
}

interface DeathEntry {
    round: number;
    playerName: string;
    cause: CauseOfDeath;
}

interface FeedbackEntry {
    round: number;
    phase: "night" | "day";
    text: string;
}

interface ChatMessage {
    id: string;
    from: string;
    fromName: string;
    to: "global" | "evil" | string;
    text: string;
    timestamp: number;
}

interface Player {
    id: string;
    name: string;
    nickname: string;
    role: Role;
    originalRole: Role;
    alignment: Alignment;
    alive: boolean;
    connected: boolean;
    likes: string[];
    dislikes: string[];
    startingClues: Clue[];
    discoveredClues: string[];
    sharedClues: string[];
    objectives: string[];
    objectivesCompleted: boolean[];
    feedbackLog: FeedbackEntry[];
    notes: string;
    trackerMarks: Record<string, "circle" | "x" | "none">;
    trackerRoles: Record<string, string>;
    votePower: number;
    mayorPenaltyNextRound: boolean;
    judgeUsesLeft: number;
    judgeUsedOn: string[];
    vigilanteUsed: boolean;
    assassinUsed: boolean;
    witchMimicHistory: Role[];
    witchCurrentMimic: Role | null;
    witchNextMimic: Role | null;
    doctorLastSaved: string | null;
    cumulativePoints: number;
    roundPoints: number;
}

interface NightAction {
    playerId: string;
    targetId: string | null;
    secondaryTargetId?: string | null;
}

interface VoteAction {
    voterId: string;
    targetId: string | null;
}

interface GameSettings {
    clueMode: "virtual" | "physical";
    chatEnabled: boolean;
    jailorEnabled: boolean;
    vigilanteEnabled: boolean;
    customEvilCount: number | null;
    customSpecialCount: number | null;
    day1NightSkip: boolean;
}

interface GameState {
    roomCode: string;
    hostId: string;
    phase: Phase;
    round: number;
    players: Record<string, Player>;
    settings: GameSettings;
    nightActions: Record<string, NightAction>;
    nightActionsExpected: string[];
    votes: Record<string, VoteAction>;
    judgeSave: string | null;
    witchJudgeSave: string | null;
    hiddenClues: { text: string; code: string; found: boolean; foundBy: string | null }[];
    physicalCodes: string[];
    cluesFoundThisGame: number;
    deathLog: DeathEntry[];
    // Timer stored as duration + start time so clients can compute remaining
    timerEndsAt: number | null;
    timerDuration: number;
    timerPaused: boolean;
    timerPausedAt: number | null;
    winner: "Good" | "Evil" | null;
    gameOver: boolean;
    scoringActive: boolean;
    chatMessages: ChatMessage[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHARACTERS = [
    { id: "1", name: "Lord/Lady Lochmara" },
    { id: "2", name: "Viscount/Viscountess Salem" },
    { id: "3", name: "Count/Countess Red-Violet" },
    { id: "4", name: "Baron/Baroness Cerulean" },
    { id: "5", name: "Prince/Princess Endeavour" },
    { id: "6", name: "Sir/Dame Robin" },
    { id: "7", name: "Steward/Stewardess Sangria" },
    { id: "8", name: "Servant Ecstasy" },
    { id: "9", name: "Prince Koamaru" },
    { id: "10", name: "Professor Haze" },
    { id: "11", name: "Colonel Crimson" },
    { id: "12", name: "Dr. Mysin" },
    { id: "13", name: "Duke/Duchess Scampi" },
    { id: "14", name: "Chaplain Atlantis" },
    { id: "15", name: "Mister/Mistress Rose" },
    { id: "16", name: "Groundskeeper Lemon" },
];

const PREFERENCES = [
    "Cooking", "Drama", "Occult", "Art", "Music", "Martial Arts",
    "Painting", "Science", "Sports", "Gardening", "Games", "Opera",
    "Parties", "Jokes", "Animals", "Justice", "Violence", "Reading",
    "Gossip", "Socializing", "Solitude", "Academics", "Family", "Nature", "Money"
];

const CLUE_TEMPLATES: { key: string; text: (name: string) => string; trueFor: (p: Player) => boolean }[] = [
    { key: "civilian", text: (n) => `${n} does not play a strong role in the town.`, trueFor: (p) => p.role === "Civilian" },
    { key: "emergency", text: (n) => `${n} has knowledge that could be useful in emergencies.`, trueFor: (p) => p.role === "Doctor" },
    { key: "vote", text: (n) => `${n} has the power to change the outcome of a vote.`, trueFor: (p) => p.role === "Judge" },
    { key: "secret", text: (n) => `${n} might have a reason to act in secret.`, trueFor: (p) => ["Murderer", "Assassin", "Spy", "Witch", "Detective"].includes(p.role) },
    { key: "active_night", text: (n) => `${n} is more active at night.`, trueFor: (p) => ["Murderer", "Assassin", "Spy", "Witch", "Doctor", "Detective", "Jailor", "Vigilante"].includes(p.role) },
    { key: "decisive", text: (n) => `${n} has a deciding influence in discussions.`, trueFor: (p) => p.role === "Mayor" },
    { key: "shy", text: (n) => `${n} is shy in discussions.`, trueFor: (p) => !["Mayor", "Judge"].includes(p.role) },
    { key: "keeps_to_self", text: (n) => `${n} keeps to themselves at night.`, trueFor: (p) => ["Civilian", "Mayor", "Judge", "Psychic", "Medium", "Coroner"].includes(p.role) },
    { key: "powerful_day", text: (n) => `${n} is powerful during the day.`, trueFor: (p) => ["Mayor", "Judge"].includes(p.role) },
];

const ROLE_DISTRIBUTION: Record<number, { evil: Role[]; good: Role[]; civilians: number }> = {
    6: { evil: ["Murderer"], good: ["Doctor", "Judge"], civilians: 3 },
    7: { evil: ["Murderer", "Spy"], good: ["Doctor", "Judge", "Mayor"], civilians: 2 },
    8: { evil: ["Murderer", "Spy"], good: ["Doctor", "Judge", "Mayor", "Detective"], civilians: 2 },
    9: { evil: ["Murderer", "Spy"], good: ["Doctor", "Judge", "Mayor", "Detective"], civilians: 3 },
    10: { evil: ["Murderer", "Spy"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic"], civilians: 3 },
    11: { evil: ["Murderer", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic"], civilians: 3 },
    12: { evil: ["Murderer", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic", "Jailor"], civilians: 3 },
    13: { evil: ["Murderer", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic", "Jailor", "Medium"], civilians: 3 },
    14: { evil: ["Murderer", "Assassin", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic", "Jailor", "Medium", "Coroner"], civilians: 2 },
    15: { evil: ["Murderer", "Assassin", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic", "Jailor", "Medium", "Coroner"], civilians: 3 },
    16: { evil: ["Murderer", "Assassin", "Spy", "Witch"], good: ["Doctor", "Judge", "Mayor", "Detective", "Psychic", "Jailor", "Medium", "Coroner", "Vigilante"], civilians: 2 },
};

const EVIL_ROLES: Role[] = ["Murderer", "Assassin", "Spy", "Witch"];
const SUCCESSION_ORDER: Role[] = ["Assassin", "Spy", "Witch"];

const TIMER_DURATIONS: Record<Phase, number> = {
    lobby: 0,
    role_reveal: 60,
    day: 0,
    discussion: 300,
    voting: 45,
    judge_save: 20,
    night_action: 90,
    night_feedback: 45,
    game_over: 0,
    scoring: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secureRandom(): number {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
}

function secureRandomInt(min: number, max: number): number {
    return Math.floor(secureRandom() * (max - min + 1)) + min;
}

function secureShuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(secureRandom() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateClueCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[secureRandomInt(0, chars.length - 1)];
    }
    return code;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 10);
}

// ─── Clue Generation ──────────────────────────────────────────────────────────

function generateStartingClues(player: Player, allPlayers: Player[]): Clue[] {
    const usedTexts = new Set<string>();
    const clues: Clue[] = [];
    const shuffledTemplates = secureShuffle(CLUE_TEMPLATES);
    const shuffledPlayers = secureShuffle(allPlayers);

    let found = false;
    for (const tmpl of shuffledTemplates) {
        for (const p of shuffledPlayers) {
            const text = tmpl.text(p.name);
            if (tmpl.trueFor(p) && !usedTexts.has(text)) {
                clues.push({ text, isReal: true });
                usedTexts.add(text);
                found = true;
                break;
            }
        }
        if (found) break;
    }

    found = false;
    for (const tmpl of secureShuffle(CLUE_TEMPLATES)) {
        for (const p of secureShuffle(allPlayers)) {
            const text = tmpl.text(p.name);
            if (!tmpl.trueFor(p) && !usedTexts.has(text)) {
                clues.push({ text, isReal: false });
                usedTexts.add(text);
                found = true;
                break;
            }
        }
        if (found) break;
    }

    return clues;
}

function generateHiddenClues(allPlayers: Player[]): { text: string; code: string; found: boolean; foundBy: string | null }[] {
    const usedTexts = new Set<string>();
    const result: { text: string; code: string; found: boolean; foundBy: string | null }[] = [];
    const shuffledTemplates = secureShuffle(CLUE_TEMPLATES.filter(t => t.key !== "secret"));

    for (const tmpl of shuffledTemplates) {
        if (result.length >= 3) break;
        for (const p of secureShuffle(allPlayers)) {
            const text = tmpl.text(p.name);
            if (tmpl.trueFor(p) && !usedTexts.has(text)) {
                result.push({ text, code: generateClueCode(), found: false, foundBy: null });
                usedTexts.add(text);
                break;
            }
        }
    }

    return result;
}

function generatePsychicClue(targetPlayer: Player, allPlayers: Player[], usedTexts: Set<string>): string | null {
    const shuffled = secureShuffle(CLUE_TEMPLATES);
    for (const tmpl of shuffled) {
        const text = tmpl.text(targetPlayer.name);
        if (tmpl.trueFor(targetPlayer) && !usedTexts.has(text)) return text;
    }
    for (const tmpl of shuffled) {
        const text = tmpl.text(targetPlayer.name);
        if (tmpl.trueFor(targetPlayer)) return text;
    }
    return null;
}

// ─── Role Assignment ──────────────────────────────────────────────────────────

function assignRoles(players: Player[], settings: GameSettings): void {
    const count = players.length;
    const dist = ROLE_DISTRIBUTION[count];
    if (!dist) return;

    let evilRoles = [...dist.evil];
    let goodRoles = [...dist.good];

    if (!settings.jailorEnabled && settings.vigilanteEnabled) {
        goodRoles = goodRoles.map(r => r === "Jailor" ? "Vigilante" : r);
        if (!goodRoles.includes("Vigilante") && count >= 12) goodRoles.push("Vigilante");
    } else if (settings.jailorEnabled && settings.vigilanteEnabled && count >= 16) {
        if (!goodRoles.includes("Vigilante")) goodRoles.push("Vigilante");
    } else if (!settings.jailorEnabled && !settings.vigilanteEnabled) {
        goodRoles = goodRoles.filter(r => r !== "Jailor" && r !== "Vigilante");
    }

    const civilians: Role[] = Array(count - evilRoles.length - goodRoles.length).fill("Civilian");
    const allRoles: Role[] = secureShuffle([...evilRoles, ...goodRoles, ...civilians]);

    players.forEach((p, i) => {
        const role = allRoles[i];
        p.role = role;
        p.originalRole = role;
        p.alignment = EVIL_ROLES.includes(role) ? "Evil" : "Good";
        p.votePower = role === "Mayor" ? 2 : 1;
        p.judgeUsesLeft = role === "Judge" ? 1 : 0;
    });
}

function assignPreferencesAndObjectives(players: Player[]): void {
    players.forEach(p => {
        const shuffled = secureShuffle(PREFERENCES);
        p.likes = [shuffled[0], shuffled[1]];
        p.dislikes = [shuffled[2], shuffled[3]];
    });

    const allLikes = new Set<string>();
    const allDislikes = new Set<string>();
    players.forEach(p => {
        p.likes.forEach(l => allLikes.add(l));
        p.dislikes.forEach(d => allDislikes.add(d));
    });

    players.forEach(player => {
        const possible: string[] = [];
        allLikes.forEach(pref => {
            if (!player.likes.includes(pref)) possible.push(`Find someone who likes ${pref}.`);
        });
        allDislikes.forEach(pref => {
            if (!player.dislikes.includes(pref)) possible.push(`Find someone who dislikes ${pref}.`);
        });

        const shuffledPossible = secureShuffle(possible);
        player.objectives = [
            shuffledPossible[0] || "Find someone with an interesting preference.",
            shuffledPossible[1] || "Find someone with an unusual dislike.",
            "Have someone else identify you for their objective.",
        ];
        player.objectivesCompleted = [false, false, false];
    });
}

// ─── Night Resolution ─────────────────────────────────────────────────────────

interface NightResult {
    killed: string[];
    saved: string[];
    jailed: string[];
    jailorDied: string | null;
    feedbacks: Record<string, string[]>;
    deathEntries: DeathEntry[];
}

function resolveNight(state: GameState): NightResult {
    const result: NightResult = { killed: [], saved: [], jailed: [], jailorDied: null, feedbacks: {}, deathEntries: [] };
    const players = Object.values(state.players);
    const alive = players.filter(p => p.alive);
    const get = (id: string) => state.players[id];
    const getByRole = (role: Role) => alive.find(p => p.role === role);
    const actions = state.nightActions;
    const getTarget = (playerId: string) => { const a = actions[playerId]; return a?.targetId ? get(a.targetId) : null; };

    alive.forEach(p => { result.feedbacks[p.id] = []; });

    const murderer = getByRole("Murderer");
    const assassin = getByRole("Assassin");
    const spy = getByRole("Spy");
    const doctor = getByRole("Doctor");
    const detective = getByRole("Detective");
    const witch = getByRole("Witch");
    const jailor = getByRole("Jailor");
    const vigilante = getByRole("Vigilante");
    const psychic = getByRole("Psychic");
    const medium = getByRole("Medium");
    const coroner = getByRole("Coroner");

    let jailedPlayerId: string | null = null;
    if (jailor && actions[jailor.id]?.targetId) {
        jailedPlayerId = actions[jailor.id].targetId!;
        result.jailed.push(jailedPlayerId);
    }
    const isJailed = (id: string) => jailedPlayerId === id;

    // Vigilante
    if (vigilante && !vigilante.vigilanteUsed && actions[vigilante.id]?.targetId && !isJailed(vigilante.id)) {
        const target = get(actions[vigilante.id].targetId!);
        vigilante.vigilanteUsed = true;
        if (target.alignment === "Evil") {
            result.killed.push(target.id);
            result.deathEntries.push({ round: state.round, playerName: target.name, cause: "Vigilante kill" });
            result.feedbacks[vigilante.id].push(`You shot ${target.name}. They were Evil. You survived.`);
        } else {
            result.killed.push(vigilante.id);
            result.deathEntries.push({ round: state.round, playerName: vigilante.name, cause: "Failed vigilante attempt" });
            result.feedbacks[vigilante.id].push(`You shot ${target.name}. They were Good. You have died.`);
            if (result.feedbacks[target.id]) result.feedbacks[target.id].push("The Vigilante targeted you, but you were innocent. They perished instead.");
        }
    }

    // Assassin
    if (assassin && !assassin.assassinUsed && actions[assassin.id]?.targetId && !isJailed(assassin.id)) {
        const target = get(actions[assassin.id].targetId!);
        assassin.assassinUsed = true;
        if (!result.killed.includes(target.id)) {
            result.killed.push(target.id);
            result.deathEntries.push({ round: state.round, playerName: target.name, cause: "Assassinated" });
        }
        result.feedbacks[assassin.id].push(`Your unblockable strike hit ${target.name}.`);
        if (jailedPlayerId === target.id && jailor) {
            result.jailorDied = jailor.id;
            result.killed.push(jailor.id);
            result.deathEntries.push({ round: state.round, playerName: jailor.name, cause: "Jailed and murdered" });
        }
    }

    // Murderer
    const skip7 = state.settings.day1NightSkip && state.round === 1 && players.length === 7;
    if (murderer && !isJailed(murderer.id) && !skip7 && actions[murderer.id]?.targetId) {
        const target = get(actions[murderer.id].targetId!);
        const doctorSaved = doctor && !isJailed(doctor.id) && actions[doctor.id]?.targetId === target.id;
        const witchDoctorSaved = witch && witch.witchCurrentMimic === "Doctor" && !isJailed(witch.id) && actions[witch.id]?.targetId === target.id;

        if (!doctorSaved && !witchDoctorSaved && !result.killed.includes(target.id)) {
            result.killed.push(target.id);
            result.deathEntries.push({ round: state.round, playerName: target.name, cause: "Murdered" });
        }
        if (jailedPlayerId === target.id && jailor && !result.killed.includes(jailor.id)) {
            result.jailorDied = jailor.id;
            result.killed.push(jailor.id);
            result.deathEntries.push({ round: state.round, playerName: jailor.name, cause: "Jailed and murdered" });
        }
        if (doctor && doctorSaved) {
            doctor.doctorLastSaved = target.id;
            result.feedbacks[doctor.id].push(`You provided critical care to ${target.name} and saved their life last night.`);
            result.saved.push(target.id);
        } else if (doctor && actions[doctor.id]?.targetId) {
            const docTarget = get(actions[doctor.id].targetId!);
            doctor.doctorLastSaved = actions[doctor.id].targetId;
            result.feedbacks[doctor.id].push(`${docTarget.name} did not require assistance last night.`);
        }
    } else if (doctor && actions[doctor.id]?.targetId) {
        const docTarget = get(actions[doctor.id].targetId!);
        doctor.doctorLastSaved = actions[doctor.id].targetId;
        result.feedbacks[doctor.id].push(`${docTarget.name} did not require assistance last night.`);
    }

    // Spy
    if (spy && !isJailed(spy.id) && !skip7 && actions[spy.id]?.targetId) {
        const target = get(actions[spy.id].targetId!);
        const targetAction = actions[target.id];
        if (targetAction?.targetId) {
            result.feedbacks[spy.id].push(`${target.name} visited ${get(targetAction.targetId).name} last night.`);
        } else {
            result.feedbacks[spy.id].push(`${target.name} did not leave their house last night.`);
        }
    }

    // Detective
    if (detective && !isJailed(detective.id) && actions[detective.id]?.targetId) {
        const watchedId = actions[detective.id].targetId!;
        const watched = get(watchedId);
        const watchedAction = actions[watchedId];
        const visitors = alive.filter(p => p.id !== detective.id && p.id !== watchedId && actions[p.id]?.targetId === watchedId);
        const leftHouse = watchedAction?.targetId != null;
        if (visitors.length > 0) {
            result.feedbacks[detective.id].push(`${watched.name} was visited by ${visitors.map(v => v.name).join(", ")} last night.`);
        } else if (leftHouse) {
            result.feedbacks[detective.id].push(`${watched.name} left their house last night.`);
        } else {
            result.feedbacks[detective.id].push(`There was no activity at ${watched.name}'s house last night.`);
        }
    }

    // Witch
    if (witch && !isJailed(witch.id) && witch.witchCurrentMimic) {
        const mimic = witch.witchCurrentMimic;
        const witchTarget = actions[witch.id]?.targetId ? get(actions[witch.id].targetId!) : null;
        if (mimic === "Spy" && witchTarget) {
            const tAction = actions[witchTarget.id];
            result.feedbacks[witch.id].push(tAction?.targetId
                ? `[As Spy] ${witchTarget.name} visited ${get(tAction.targetId).name} last night.`
                : `[As Spy] ${witchTarget.name} did not leave their house last night.`);
        }
        if (mimic === "Detective" && witchTarget) {
            const visitors = alive.filter(p => p.id !== witch.id && actions[p.id]?.targetId === witchTarget.id);
            const leftHouse = actions[witchTarget.id]?.targetId != null;
            if (visitors.length > 0) result.feedbacks[witch.id].push(`[As Detective] ${witchTarget.name} was visited by ${visitors.map(v => v.name).join(", ")}.`);
            else if (leftHouse) result.feedbacks[witch.id].push(`[As Detective] ${witchTarget.name} left their house last night.`);
            else result.feedbacks[witch.id].push(`[As Detective] No activity at ${witchTarget.name}'s house last night.`);
        }
        if (mimic === "Doctor" && witchTarget) {
            result.feedbacks[witch.id].push(result.saved.includes(witchTarget.id)
                ? `[As Doctor] You saved ${witchTarget.name}'s life last night.`
                : `[As Doctor] ${witchTarget.name} did not require assistance.`);
        }
        if (mimic === "Jailor" && witchTarget) result.feedbacks[witch.id].push(`[As Jailor] You jailed ${witchTarget.name} last night.`);
        if (mimic === "Medium" && witchTarget) result.feedbacks[witch.id].push(`[As Medium] ${witchTarget.name} was a ${witchTarget.role}.`);
        if (mimic === "Coroner") {
            const recentDead = state.deathLog.filter(d => d.round === state.round - 1);
            result.feedbacks[witch.id].push(recentDead.length > 0
                ? `[As Coroner] Deaths from last round: ${recentDead.map(d => `${d.playerName} (${d.cause})`).join(", ")}.`
                : `[As Coroner] No deaths last round.`);
        }
        if (mimic === "Psychic" && witchTarget) {
            const usedTexts = new Set(witchTarget.startingClues.map(c => c.text));
            const clue = generatePsychicClue(witchTarget, alive, usedTexts);
            if (clue) result.feedbacks[witch.id].push(`[As Psychic] Vision about ${witchTarget.name}: ${clue}`);
        }
    }

    // Psychic
    if (psychic && !isJailed(psychic.id) && actions[psychic.id]?.targetId) {
        const target = get(actions[psychic.id].targetId!);
        const usedTexts = new Set<string>([...target.startingClues.map(c => c.text), ...target.discoveredClues]);
        const clue = generatePsychicClue(target, alive, usedTexts);
        if (clue) result.feedbacks[psychic.id].push(`Psychic vision about ${target.name}: ${clue}`);
    }

    // Medium
    if (medium && !isJailed(medium.id) && actions[medium.id]?.targetId) {
        const target = get(actions[medium.id].targetId!);
        result.feedbacks[medium.id].push(`You sensed that ${target.name} was a ${target.role}.`);
    }

    // Coroner
    if (coroner && !isJailed(coroner.id)) {
        const prevDeaths = state.deathLog.filter(d => d.round === state.round - 1);
        result.feedbacks[coroner.id].push(prevDeaths.length > 0
            ? `Cause of death report: ${prevDeaths.map(d => `${d.playerName} — ${d.cause}`).join("; ")}.`
            : `No deaths to report from the previous night.`);
    }

    // Jailor feedback
    if (jailor && jailedPlayerId) {
        if (result.jailorDied === jailor.id) {
            result.feedbacks[jailor.id].push(`You jailed ${get(jailedPlayerId).name}, but they were killed — and you perished with them.`);
        } else {
            result.feedbacks[jailor.id].push(`You successfully jailed ${get(jailedPlayerId).name} last night.`);
        }
    }
    if (jailedPlayerId) {
        if (!result.feedbacks[jailedPlayerId]) result.feedbacks[jailedPlayerId] = [];
        result.feedbacks[jailedPlayerId] = ["You were jailed last night. Your actions had no effect."];
    }

    // Virtual clue discovery
    if (state.settings.clueMode === "virtual") {
        const unFoundClues = state.hiddenClues.filter(c => !c.found);
        if (unFoundClues.length > 0 && state.cluesFoundThisGame < 3) {
            for (const player of secureShuffle(alive)) {
                if (state.cluesFoundThisGame >= 3) break;
                if (secureRandom() < 0.1) {
                    const clue = unFoundClues.shift()!;
                    clue.found = true;
                    clue.foundBy = player.id;
                    state.cluesFoundThisGame++;
                    player.discoveredClues.push(clue.text);
                    result.feedbacks[player.id].push(`🔍 You discovered a hidden clue: "${clue.text}"`);
                }
            }
        }
    }

    // Fix murderer feedback
    if (murderer && actions[murderer.id]?.targetId) {
        const target = get(actions[murderer.id].targetId!);
        const wasKilled = result.deathEntries.some(d => d.playerName === target.name && d.cause === "Murdered");
        result.feedbacks[murderer.id] = [wasKilled ? `Your attack on ${target.name} was successful.` : `Your attack on ${target.name} was prevented.`];
    }
    if (assassin && actions[assassin.id]?.targetId && assassin.assassinUsed) {
        const target = get(actions[assassin.id].targetId!);
        const wasKilled = result.deathEntries.some(d => d.playerName === target.name);
        result.feedbacks[assassin.id] = [wasKilled ? `Your unblockable strike on ${target.name} was successful.` : `Your strike — ${target.name} was already dead.`];
    }

    // Update Witch mimic
    if (witch) {
        witch.witchCurrentMimic = witch.witchNextMimic;
        const nextMimicAction = actions[witch.id]?.secondaryTargetId as Role | null;
        if (nextMimicAction && !witch.witchMimicHistory.includes(nextMimicAction)) {
            witch.witchNextMimic = nextMimicAction as Role;
            witch.witchMimicHistory.push(nextMimicAction as Role);
        }
    }

    return result;
}

function checkSuccession(state: GameState): void {
    const aliveMurderers = Object.values(state.players).filter(p => p.alive && (p.originalRole === "Murderer" || p.role === "Murderer"));
    if (aliveMurderers.length > 0) return;
    for (const role of SUCCESSION_ORDER) {
        const successor = Object.values(state.players).find(p => p.alive && p.originalRole === role && p.role !== "Murderer");
        if (successor) { successor.role = "Murderer"; return; }
    }
}

function checkWinCondition(state: GameState): "Good" | "Evil" | null {
    const alive = Object.values(state.players).filter(p => p.alive);
    const aliveEvil = alive.filter(p => p.alignment === "Evil").length;
    const aliveGood = alive.filter(p => p.alignment === "Good").length;
    if (aliveEvil === 0) return "Good";
    if (aliveEvil >= aliveGood) return "Evil";
    return null;
}

// ─── Message Protocol ─────────────────────────────────────────────────────────

type ClientMessage =
    | { type: "join"; characterId: string; nickname: string }
    | { type: "host_configure"; settings: Partial<GameSettings> }
    | { type: "host_start_game" }
    | { type: "host_pause_timer" }
    | { type: "host_resume_timer" }
    | { type: "host_skip_phase" }
    | { type: "host_kill_player"; targetId: string }
    | { type: "night_action"; targetId: string | null; secondaryTargetId?: string | null }
    | { type: "submit_vote"; targetId: string | null }
    | { type: "judge_save"; targetId: string | null }
    | { type: "chat_message"; to: string; text: string }
    | { type: "update_notes"; notes: string }
    | { type: "update_tracker"; targetId: string; mark: "circle" | "x" | "none" }
    | { type: "update_tracker_role"; targetId: string; role: string }
    | { type: "enter_clue_code"; code: string }
    | { type: "share_clue"; clueText: string }
    | { type: "objective_complete"; objectiveIndex: number; targetPlayerId: string }
    | { type: "request_state" }
    | { type: "timer_tick" }; // NEW: client-driven timer advancement

// ─── Server ───────────────────────────────────────────────────────────────────

export default class MurderMysteryServer implements Party.Server {
    state: GameState | null = null;
    connections: Map<string, Party.Connection> = new Map();

    constructor(readonly room: Party.Room) { }

    onConnect(conn: Party.Connection) {
        this.connections.set(conn.id, conn);
        if (this.state) {
            conn.send(JSON.stringify({ type: "room_exists", roomCode: this.state.roomCode }));
            // Send current state so they can rejoin
            this.sendPrivateState(conn.id);
        } else {
            const code = this.room.id.toUpperCase();
            this.state = this.createInitialState(conn.id, code);
            conn.send(JSON.stringify({ type: "room_created", roomCode: code, isHost: true }));
        }
    }

    onClose(conn: Party.Connection) {
        this.connections.delete(conn.id);
        if (this.state) {
            const player = this.state.players[conn.id];
            if (player) {
                player.connected = false;
                this.broadcastState();
            }
        }
    }

    onMessage(message: string, sender: Party.Connection) {
        if (!this.state) return;
        let msg: ClientMessage;
        try { msg = JSON.parse(message); } catch { return; }

        const state = this.state;
        const isHost = sender.id === state.hostId;

        switch (msg.type) {

            // ── NEW: client-driven timer tick ──────────────────────────────────────
            // The host client sends this every second. If timer has expired server-side,
            // advance the phase. This replaces the unreliable setInterval on the server.
            case "timer_tick": {
                if (!isHost) return; // only host drives ticks
                if (!state.timerEndsAt || state.timerPaused || state.gameOver) return;
                if (Date.now() >= state.timerEndsAt) {
                    state.timerEndsAt = null; // prevent double-fire
                    this.advancePhase();
                }
                return;
            }

            case "join": {
                const char = CHARACTERS.find(c => c.id === msg.characterId);
                if (!char) return;

                // Check if this nickname already has a player (reconnect scenario)
                // Match by nickname + character name to handle page refreshes
                const existingByName = Object.values(state.players).find(
                    p => p.nickname === msg.nickname && p.name === char.name && p.id !== sender.id
                );
                if (existingByName) {
                    // Re-map the old player ID to the new connection ID
                    const oldId = existingByName.id;
                    existingByName.id = sender.id;
                    existingByName.connected = true;
                    state.players[sender.id] = existingByName;
                    delete state.players[oldId];
                    // If this player was host, update hostId
                    if (state.hostId === oldId) state.hostId = sender.id;
                    // Fix any references to old ID in actions/votes
                    if (state.nightActions[oldId]) { state.nightActions[sender.id] = state.nightActions[oldId]; delete state.nightActions[oldId]; }
                    if (state.votes[oldId]) { state.votes[sender.id] = state.votes[oldId]; delete state.votes[oldId]; }
                    this.broadcastState();
                    break;
                }

                // Normal character taken check
                const taken = Object.values(state.players).find(p => p.id !== sender.id && p.name === char.name);
                if (taken) {
                    sender.send(JSON.stringify({ type: "error", message: "Character already taken" }));
                    return;
                }
                const existing = state.players[sender.id];
                if (existing) {
                    existing.connected = true;
                    existing.nickname = msg.nickname;
                    existing.name = char.name;
                } else {
                    state.players[sender.id] = this.createPlayer(sender.id, char.name, msg.nickname);
                }
                this.broadcastState();
                break;
            }

            case "host_configure": {
                if (!isHost) return;
                Object.assign(state.settings, msg.settings);
                this.broadcastState();
                break;
            }

            case "host_start_game": {
                if (!isHost || state.phase !== "lobby") return;
                const players = Object.values(state.players);
                if (players.length < 1 || players.length > 16) {
                    sender.send(JSON.stringify({ type: "error", message: "Need 1-16 players" }));
                    return;
                }
                assignRoles(players, state.settings);
                assignPreferencesAndObjectives(players);
                players.forEach(p => { p.startingClues = generateStartingClues(p, players); });
                state.hiddenClues = generateHiddenClues(players);
                state.phase = "role_reveal";
                this.startTimer(state.phase);
                this.broadcastState();
                break;
            }

            case "host_pause_timer": {
                if (!isHost) return;
                if (!state.timerPaused && state.timerEndsAt) {
                    state.timerPaused = true;
                    state.timerPausedAt = Date.now();
                    this.broadcastState();
                }
                break;
            }

            case "host_resume_timer": {
                if (!isHost) return;
                if (state.timerPaused && state.timerEndsAt && state.timerPausedAt) {
                    const elapsed = Date.now() - state.timerPausedAt;
                    state.timerEndsAt += elapsed;
                    state.timerPaused = false;
                    state.timerPausedAt = null;
                    this.broadcastState();
                }
                break;
            }

            case "host_skip_phase": {
                if (!isHost) return;
                state.timerEndsAt = null; // cancel current timer
                this.advancePhase();
                break;
            }

            case "host_kill_player": {
                if (!isHost) return;
                const p = state.players[msg.targetId];
                if (p && p.alive) {
                    p.alive = false;
                    state.deathLog.push({ round: state.round, playerName: p.name, cause: "Voted out" });
                    checkSuccession(state);
                    const winner = checkWinCondition(state);
                    if (winner) { state.winner = winner; state.gameOver = true; state.phase = "game_over"; }
                    this.broadcastState();
                }
                break;
            }

            case "night_action": {
                if (state.phase !== "night_action") return;
                state.nightActions[sender.id] = { playerId: sender.id, targetId: msg.targetId, secondaryTargetId: msg.secondaryTargetId };
                const submitted = Object.keys(state.nightActions).filter(id => state.nightActionsExpected.includes(id));
                if (submitted.length >= state.nightActionsExpected.length && state.nightActionsExpected.length > 0) {
                    this.resolveNightAndAdvance();
                } else {
                    sender.send(JSON.stringify({ type: "action_received" }));
                }
                break;
            }

            case "submit_vote": {
                if (state.phase !== "voting") return;
                state.votes[sender.id] = { voterId: sender.id, targetId: msg.targetId };
                const aliveIds = Object.values(state.players).filter(p => p.alive).map(p => p.id);
                if (Object.keys(state.votes).length >= aliveIds.length) {
                    this.resolveVotesAndAdvance();
                } else {
                    sender.send(JSON.stringify({ type: "action_received" }));
                }
                break;
            }

            case "judge_save": {
                if (state.phase !== "voting" && state.phase !== "judge_save") return;
                const judge = Object.values(state.players).find(p => p.role === "Judge" && p.alive && p.id === sender.id);
                const witch = Object.values(state.players).find(p => p.role === "Witch" && p.alive && p.id === sender.id);
                if (judge) state.judgeSave = msg.targetId;
                if (witch && witch.witchCurrentMimic === "Judge") state.witchJudgeSave = msg.targetId;
                break;
            }

            case "chat_message": {
                if (!state.settings.chatEnabled) return;
                const player = state.players[sender.id];
                if (!player || !player.alive) return;
                const chatMsg: ChatMessage = {
                    id: uid(),
                    from: sender.id,
                    fromName: `${player.nickname} (${player.name})`,
                    to: msg.to,
                    text: msg.text.slice(0, 500),
                    timestamp: Date.now(),
                };
                state.chatMessages.push(chatMsg);
                this.deliverChatMessage(chatMsg);
                break;
            }

            case "update_notes": {
                const p = state.players[sender.id];
                if (p) p.notes = msg.notes.slice(0, 2000);
                break;
            }

            case "update_tracker": {
                const p = state.players[sender.id];
                if (p) {
                    if (!p.trackerMarks) p.trackerMarks = {};
                    p.trackerMarks[msg.targetId] = msg.mark;
                }
                sender.send(JSON.stringify({ type: "tracker_updated" }));
                break;
            }

            case "update_tracker_role": {
                const p = state.players[sender.id];
                if (p) {
                    if (!p.trackerRoles) p.trackerRoles = {};
                    p.trackerRoles[msg.targetId] = msg.role;
                }
                sender.send(JSON.stringify({ type: "tracker_updated" }));
                break;
            }

            case "enter_clue_code": {
                if (state.settings.clueMode !== "physical") return;
                const clue = state.hiddenClues.find(c => c.code === msg.code.toUpperCase() && !c.found);
                if (!clue) { sender.send(JSON.stringify({ type: "error", message: "Invalid or already found code" })); return; }
                clue.found = true;
                clue.foundBy = sender.id;
                state.cluesFoundThisGame++;
                const p = state.players[sender.id];
                if (p) {
                    p.discoveredClues.push(clue.text);
                    p.feedbackLog.push({ round: state.round, phase: "night", text: `🔍 You found a hidden clue: "${clue.text}"` });
                }
                sender.send(JSON.stringify({ type: "clue_found", clueText: clue.text }));
                break;
            }

            case "share_clue": {
                const p = state.players[sender.id];
                if (!p || !p.discoveredClues.includes(msg.clueText)) return;
                if (p.sharedClues.includes(msg.clueText)) return;
                p.sharedClues.push(msg.clueText);
                Object.values(state.players).forEach(other => {
                    if (other.id !== sender.id) {
                        other.feedbackLog.push({ round: state.round, phase: "night", text: `📢 ${p.name} shared a clue: "${msg.clueText}"` });
                    }
                });
                this.broadcast({ type: "clue_shared", sharedBy: p.name, clueText: msg.clueText });
                break;
            }

            case "objective_complete": {
                const p = state.players[sender.id];
                const target = state.players[msg.targetPlayerId];
                if (!p || !target) return;
                p.objectivesCompleted[msg.objectiveIndex] = true;
                target.objectivesCompleted[2] = true;
                // Send updated state to both players
                this.sendPrivateState(sender.id);
                this.sendPrivateState(msg.targetPlayerId);
                break;
            }

            case "request_state": {
                this.sendPrivateState(sender.id);
                break;
            }
        }
    }

    // ─── Phase Management ──────────────────────────────────────────────────────

    startTimer(phase: Phase) {
        const state = this.state!;
        const duration = TIMER_DURATIONS[phase];
        if (duration === 0) {
            state.timerEndsAt = null;
            state.timerDuration = 0;
            return;
        }
        state.timerDuration = duration;
        state.timerEndsAt = Date.now() + duration * 1000;
        state.timerPaused = false;
        state.timerPausedAt = null;
        // NOTE: No setInterval here. Timer is advanced by client timer_tick messages from host.
    }

    advancePhase() {
        const state = this.state!;
        switch (state.phase) {
            case "role_reveal":
                state.phase = "night_action";
                this.prepareNightActions();
                this.startTimer("night_action");
                this.broadcastState();
                break;

            case "night_action":
                this.resolveNightAndAdvance();
                break;

            case "night_feedback":
                if (state.round === 1 && Object.values(state.players).length === 7 && state.settings.day1NightSkip) {
                    state.round++;
                    state.phase = "night_action";
                    this.prepareNightActions();
                    this.startTimer("night_action");
                } else {
                    state.phase = "discussion";
                    this.startTimer("discussion");
                }
                this.broadcastState();
                break;

            case "discussion":
                state.phase = "voting";
                state.votes = {};
                state.judgeSave = null;
                state.witchJudgeSave = null;
                this.startTimer("voting");
                this.broadcastState();
                break;

            case "voting":
                this.resolveVotesAndAdvance();
                break;

            case "judge_save":
                this.resolveVotesAndAdvance();
                break;

            default:
                // For any unhandled phase, just broadcast current state
                this.broadcastState();
                break;
        }
    }

    prepareNightActions() {
        const state = this.state!;
        state.nightActions = {};
        const alive = Object.values(state.players).filter(p => p.alive);
        const is7skip = state.settings.day1NightSkip && state.round === 1 && alive.length === 7;

        state.nightActionsExpected = alive.filter(p => {
            if (is7skip && (p.role === "Murderer" || p.role === "Spy")) return false;
            if (p.role === "Civilian") return false;
            if (p.role === "Judge") return false;
            if (p.role === "Coroner") return false;
            if (p.role === "Assassin" && p.assassinUsed) return false;
            if (p.role === "Vigilante" && p.vigilanteUsed) return false;
            return true;
        }).map(p => p.id);
    }

    resolveNightAndAdvance() {
        const state = this.state!;
        if (state.phase !== "night_action") return;

        const result = resolveNight(state);
        result.killed.forEach(id => { const p = state.players[id]; if (p) p.alive = false; });
        state.deathLog.push(...result.deathEntries);
        Object.entries(result.feedbacks).forEach(([pid, msgs]) => {
            const p = state.players[pid];
            if (!p) return;
            msgs.forEach(text => p.feedbackLog.push({ round: state.round, phase: "night", text }));
        });

        checkSuccession(state);
        const winner = checkWinCondition(state);
        if (winner) {
            state.winner = winner;
            state.gameOver = true;
            state.phase = "game_over";
            this.broadcastState();
            return;
        }

        state.phase = "night_feedback";
        this.startTimer("night_feedback");
        this.broadcastState();
    }

    resolveVotesAndAdvance() {
        const state = this.state!;
        const alive = Object.values(state.players).filter(p => p.alive);

        const counts: Record<string, number> = {};
        alive.forEach(voter => {
            const vote = state.votes[voter.id];
            if (!vote || !vote.targetId) return;
            counts[vote.targetId] = (counts[vote.targetId] || 0) + voter.votePower;
        });

        const maxVotes = Math.max(0, ...Object.values(counts));
        const candidates = Object.keys(counts).filter(id => counts[id] === maxVotes);

        const savedId = state.judgeSave || state.witchJudgeSave;
        if (savedId && candidates.includes(savedId)) {
            const judge = Object.values(state.players).find(p => p.role === "Judge" && p.alive);
            if (judge && state.judgeSave) {
                judge.judgeUsesLeft--;
                judge.judgeUsedOn.push(savedId);
                const savedPlayer = state.players[savedId];
                if (savedPlayer) judge.feedbackLog.push({ round: state.round, phase: "day", text: `You saved ${savedPlayer.name} from elimination. They were ${savedPlayer.alignment}.` });
            }
            this.proceedToNight();
            return;
        }

        if (candidates.length > 1 || maxVotes === 0) {
            this.proceedToNight();
            return;
        }

        const eliminated = state.players[candidates[0]];
        if (eliminated) {
            eliminated.alive = false;
            state.deathLog.push({ round: state.round, playerName: eliminated.name, cause: "Voted out" });
            checkSuccession(state);

            const mayor = Object.values(state.players).find(p => p.role === "Mayor" && p.alive);
            if (mayor && state.votes[mayor.id]?.targetId === eliminated.id && eliminated.alignment === "Good") {
                mayor.votePower = 1;
                mayor.mayorPenaltyNextRound = true;
                mayor.feedbackLog.push({ round: state.round, phase: "day", text: `The player you voted for (${eliminated.name}) was Good. Your voting power is reduced to 1 next round.` });
            }
        }

        const winner = checkWinCondition(state);
        if (winner) {
            state.winner = winner;
            state.gameOver = true;
            state.phase = "game_over";
            this.broadcastState();
            return;
        }

        this.proceedToNight();
    }

    proceedToNight() {
        const state = this.state!;
        state.round++;
        Object.values(state.players).forEach(p => {
            if (p.mayorPenaltyNextRound) { p.votePower = 2; p.mayorPenaltyNextRound = false; }
        });
        state.phase = "night_action";
        this.prepareNightActions();
        this.startTimer("night_action");
        this.broadcastState();
    }

    // ─── State Broadcasting ────────────────────────────────────────────────────

    createPlayerView(viewerId: string): object {
        const state = this.state!;
        const viewer = state.players[viewerId];
        const isHost = viewerId === state.hostId;

        const players: Record<string, object> = {};
        Object.values(state.players).forEach(p => {
            const isOwn = p.id === viewerId;
            const canSeeRole = isOwn || isHost || (viewer && EVIL_ROLES.includes(viewer.role) && EVIL_ROLES.includes(p.role));

            players[p.id] = {
                id: p.id,
                name: p.name,
                nickname: p.nickname,
                alive: p.alive,
                connected: p.connected,
                role: canSeeRole ? p.role : undefined,
                originalRole: canSeeRole ? p.originalRole : undefined,
                alignment: canSeeRole ? p.alignment : undefined,
                votePower: p.votePower,
                ...(isOwn ? {
                    likes: p.likes,
                    dislikes: p.dislikes,
                    startingClues: p.role === "Detective" ? p.startingClues : p.startingClues.map(c => ({ text: c.text })),
                    discoveredClues: p.discoveredClues,
                    sharedClues: p.sharedClues,
                    objectives: p.objectives,
                    objectivesCompleted: p.objectivesCompleted,
                    feedbackLog: p.feedbackLog,
                    notes: p.notes,
                    trackerMarks: p.trackerMarks || {},
                    trackerRoles: p.trackerRoles || {},
                    judgeUsesLeft: p.judgeUsesLeft,
                    vigilanteUsed: p.vigilanteUsed,
                    assassinUsed: p.assassinUsed,
                    witchMimicHistory: p.witchMimicHistory,
                    witchCurrentMimic: p.witchCurrentMimic,
                } : {}),
                ...(isHost && !isOwn ? {
                    likes: p.likes,
                    dislikes: p.dislikes,
                    role: p.role,
                    alignment: p.alignment,
                } : {}),
            };
        });

        return {
            type: "state_update",
            roomCode: state.roomCode,
            phase: state.phase,
            round: state.round,
            isHost,
            myId: viewerId,
            players,
            settings: state.settings,
            timerEndsAt: state.timerEndsAt,
            timerPaused: state.timerPaused,
            winner: state.winner,
            gameOver: state.gameOver,
            deathLog: state.deathLog,
            chatMessages: state.chatMessages.filter(m =>
                m.to === "global" ||
                m.from === viewerId ||
                m.to === viewerId ||
                (m.to === "evil" && viewer && EVIL_ROLES.includes(viewer.role))
            ),
            ...(isHost ? { hiddenClues: state.hiddenClues, allNightActions: state.nightActions } : {}),
        };
    }

    sendPrivateState(playerId: string) {
        const conn = this.connections.get(playerId);
        if (!conn) return;
        conn.send(JSON.stringify(this.createPlayerView(playerId)));
    }

    broadcastState() {
        this.connections.forEach((conn, id) => {
            if (this.state?.players[id] || id === this.state?.hostId) {
                this.sendPrivateState(id);
            }
        });
    }

    broadcast(msg: object) {
        const data = JSON.stringify(msg);
        this.connections.forEach(conn => conn.send(data));
    }

    sendPrivate(playerId: string, msg: object) {
        const conn = this.connections.get(playerId);
        if (conn) conn.send(JSON.stringify(msg));
    }

    // FIX: Was double-stringifying DMs. sendPrivate already JSON.stringifies.
    deliverChatMessage(msg: ChatMessage) {
        if (msg.to === "global") {
            this.broadcast({ type: "chat", message: msg });
        } else if (msg.to === "evil") {
            this.connections.forEach((conn, id) => {
                const p = this.state?.players[id];
                if (p && EVIL_ROLES.includes(p.role)) {
                    conn.send(JSON.stringify({ type: "chat", message: msg }));
                }
            });
        } else {
            // DM: send to recipient and sender
            this.sendPrivate(msg.to, { type: "chat", message: msg });
            this.sendPrivate(msg.from, { type: "chat", message: msg });
        }
    }

    createInitialState(hostId: string, code: string): GameState {
        return {
            roomCode: code,
            hostId,
            phase: "lobby",
            round: 1,
            players: {},
            settings: { clueMode: "virtual", chatEnabled: true, jailorEnabled: true, vigilanteEnabled: false, customEvilCount: null, customSpecialCount: null, day1NightSkip: true },
            nightActions: {},
            nightActionsExpected: [],
            votes: {},
            judgeSave: null,
            witchJudgeSave: null,
            hiddenClues: [],
            physicalCodes: [],
            cluesFoundThisGame: 0,
            deathLog: [],
            timerEndsAt: null,
            timerDuration: 0,
            timerPaused: false,
            timerPausedAt: null,
            winner: null,
            gameOver: false,
            scoringActive: false,
            chatMessages: [],
        };
    }

    createPlayer(id: string, name: string, nickname: string): Player {
        return {
            id, name, nickname,
            role: "Civilian", originalRole: "Civilian",
            alignment: "Good", alive: true, connected: true,
            likes: [], dislikes: [],
            startingClues: [], discoveredClues: [], sharedClues: [],
            objectives: [], objectivesCompleted: [false, false, false],
            feedbackLog: [], notes: "",
            trackerMarks: {}, trackerRoles: {},
            votePower: 1, mayorPenaltyNextRound: false,
            judgeUsesLeft: 0, judgeUsedOn: [],
            vigilanteUsed: false, assassinUsed: false,
            witchMimicHistory: [], witchCurrentMimic: null, witchNextMimic: null,
            doctorLastSaved: null,
            cumulativePoints: 0, roundPoints: 0,
        };
    }
}