export interface TopicPreset {
  topic: string;
  subject: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
}

export interface NotesPreset {
  title: string;
  subject: string;
  notes: string;
}

export const TOPIC_PRESETS: TopicPreset[] = [
  {
    topic: "Dijkstra's Shortest Path Algorithm",
    subject: "Computer Science",
    difficulty: "Intermediate",
    description: "Graph traversal and greedy search for finding minimum weights",
  },
  {
    topic: "CRISPR-Cas9 Gene Editing",
    subject: "Biotechnology & Genetics",
    difficulty: "Advanced",
    description: "Bacterial immune defense adapted for precision genome modification",
  },
  {
    topic: "Photosynthesis & The Calvin Cycle",
    subject: "Cell Biology",
    difficulty: "Beginner",
    description: "How plants convert photon energy and carbon dioxide into glucose",
  },
  {
    topic: "Keynesian vs. Classical Economics",
    subject: "Macroeconomics",
    difficulty: "Intermediate",
    description: "Government intervention vs. free-market self-correction models",
  },
];

export const NOTES_PRESETS: NotesPreset[] = [
  {
    title: "Operating Systems: Process Synchronization & Deadlocks",
    subject: "Computer Science 301",
    notes: `Lecture Notes: Process Synchronization & Deadlocks
Professor Miller - Week 6

1. The Critical Section Problem:
A critical section is a piece of code that accesses shared resources (like memory, files, or ports).
Requirements for any solution:
- Mutual Exclusion: Only one process can execute in its critical section at a time.
- Progress: If no process is executing and some want to enter, selection cannot be postponed indefinitely.
- Bounded Waiting: A bound must exist on the number of times other processes are allowed to enter after a process has made a request.

2. Mutex Locks & Semaphores:
- Mutex: A boolean variable providing mutual exclusion (acquire() and release()). Binary 0 or 1.
- Counting Semaphore: An integer value used to control access to a finite number of resource instances.
- wait() (historically P) decrements count. If negative, process blocks.
- signal() (historically V) increments count.

3. Deadlock Definition:
A situation where two or more processes are permanently blocked because each process holds a resource and waits for another resource held by another process.

4. The Four Coffman Conditions for Deadlock:
All four must hold simultaneously for a deadlock to occur:
1. Mutual Exclusion: At least one resource must be non-shareable.
2. Hold and Wait: A process must hold at least one resource and be waiting to acquire additional resources held by other processes.
3. No Preemption: Resources cannot be forcibly confiscated; they can only be released voluntarily by the holding process.
4. Circular Wait: A set of waiting processes {P0, P1, ..., Pn} where P0 waits for P1, P1 waits for P2, and Pn waits for P0.

Handling methods: Prevention (break one condition), Avoidance (Banker's Algorithm using safe states), or Detection & Recovery (resource allocation graphs and terminating processes).`,
  },
  {
    title: "Microbiology: Cellular Respiration & ATP Yield",
    subject: "Biology 210",
    notes: `Cellular Respiration Overview
Location: Cytoplasm and Mitochondria
Overall Chemical Equation: C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O + ~30-32 ATP

Stage 1: Glycolysis
- Occurs in the cytosol.
- Anaerobic process (does not require O2 directly).
- Glucose (6-carbon) is split into 2 Pyruvate (3-carbon).
- Net yield per glucose: 2 ATP (via substrate-level phosphorylation) and 2 NADH.

Stage 2: Pyruvate Oxidation (Transition Step)
- Pyruvate enters mitochondrial matrix.
- Converted to Acetyl-CoA (2-carbon), releasing 1 CO2 and generating 1 NADH per pyruvate (2 NADH per glucose).

Stage 3: Citric Acid Cycle (Krebs Cycle)
- Occurs in mitochondrial matrix.
- Acetyl-CoA combines with Oxaloacetate to form Citrate.
- Per glucose (2 turns): 2 ATP/GTP, 6 NADH, 2 FADH2, and 4 CO2 released.

Stage 4: Oxidative Phosphorylation (Electron Transport Chain & Chemiosmosis)
- Inner mitochondrial membrane (cristae).
- High-energy electrons from NADH and FADH2 pass through complexes I-IV.
- Oxygen is the final electron acceptor, forming H2O.
- Proton gradient drives ATP Synthase rotor.
- Net ATP yield: approximately 26 to 28 ATP from ETC.
Total theoretical yield: 30-32 ATP per oxidized glucose molecule.`,
  },
];
