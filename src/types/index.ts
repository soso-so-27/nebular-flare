export type CatWeightRecord = {
  id: string;
  cat_id: string;
  weight: number;
  recorded_at: string;
  notes?: string;
};

export type Cat = {
  id: string;
  name: string;
  age: string;
  sex: string;
  avatar?: string;
  birthday?: string;
  weight?: number; // Weight in kg
  microchip_id?: string; // Microchip ID
  notes?: string; // Additional notes
  images?: CatImage[];
  weightHistory?: CatWeightRecord[];
};

export type CatImage = {
  id: string;
  catId: string;
  storagePath: string;
  createdAt: string;
  isFavorite: boolean;
  width?: number;
  height?: number;
};

export type TaskGroup = 'CARE' | 'HEALTH' | 'INVENTORY';
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'once';
export type DueTime = 'morning' | 'evening' | 'any' | 'weekend' | 'month';
export type Frequency = 'once-daily' | 'twice-daily' | 'three-times-daily' | 'four-times-daily' | 'as-needed' | 'weekly' | 'monthly';
export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'anytime';
export type MealSlot = 'morning' | 'noon' | 'evening' | 'night';
export type StockLevel = 'full' | 'half' | 'low' | 'empty';
export type ObservationInputType = 'ok-notice' | 'count' | 'choice';
export type ObservationCategory = 'eating' | 'toilet' | 'behavior' | 'health';

// Care Task Definition (settings)
export type CareTaskDef = {
  id: string;
  title: string;
  icon: string;
  frequency: Frequency;
  timeOfDay: TimeOfDay;
  mealSlots?: MealSlot[]; // Which time slots this task applies to
  perCat: boolean; // true = per cat, false = shared
  targetCatIds?: string[]; // IDs of cats this task applies to (if perCat is true)
  enabled: boolean;
};

export type Task = {
  id: string;
  catId: string;
  title: string;
  group: TaskGroup;
  cadence: Cadence;
  due: DueTime;
  dueAt?: string;
  done: boolean;
  later: boolean;
  doneBy?: string;
  doneAt?: string;
  laterAt?: string;
  optional?: boolean;
};

export type NoticeKind = 'notice' | 'moment';

export type NoticeDef = {
  id: string;
  title: string;
  kind: NoticeKind;
  cadence: Cadence;
  due: DueTime;
  choices: string[];
  enabled: boolean;
  optional: boolean;
  seasonal?: boolean;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  // Enhanced settings
  inputType: ObservationInputType;
  category: ObservationCategory;
  required: boolean;
  alertLabel?: string;
};

export type NoticeLog = {
  id: string;
  catId: string;
  noticeId: string;
  value: string;
  at: string;
  done: boolean;
  doneBy?: string;
  doneAt?: string;
  later: boolean;
  laterAt?: string;
};

export type SignalDef = {
  id: string;
  label: string;
  options: string[];
};

export type SignalLog = {
  catId: string;
  signalId: string;
  value: string;
  at: string;
};

export type InventoryItem = {
  id: string;
  label: string;
  range?: [number, number]; // [minDays, maxDays] (Legacy)
  range_max?: number; // Supabase
  range_min?: number; // Supabase
  last?: string;
  lastRefillDate?: string; // Legacy
  last_bought?: string | null; // Supabase
  deleted_at?: string | null;

  // Enhanced settings
  stockLevel: StockLevel;
  purchaseMemo?: string;
  alertEnabled: boolean;
  enabled?: boolean; // Optional, defaults to true
};


export type EventType = 'vet' | 'med' | 'other';

export type AppEvent = {
  id: string;
  type: EventType;
  title: string;
  catId: string;
  at: string;
  location?: string;
  note?: string;
  archived: boolean;
};

export type AppSettings = {
  plan: 'Free' | 'Pro';
  aiEnabled: boolean;
  engagement: 'passive' | 'daily';
  homeMode: 'checklist' | 'cards';
  weeklySummaryEnabled: boolean;
  quietHours: { start: number; end: number };
  invThresholds: { soon: number; urgent: number; critical: number };
  seasonalDeckEnabled: boolean;
  skinPackOwned: boolean;
  skinMode: 'default' | 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
  photoTagAssist: boolean;
  dayStartHour: number;
};
