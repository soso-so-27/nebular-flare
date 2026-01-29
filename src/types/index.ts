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
  background_mode?: 'random' | 'media' | 'avatar';
  background_media?: string | null;
  // Vaccine & Prevention
  last_vaccine_date?: string;
  vaccine_type?: string;
  flea_tick_date?: string; // Last flea/tick prevention
  flea_tick_product?: string;
  deworming_date?: string; // Last deworming
  deworming_product?: string;
  heartworm_date?: string; // Last heartworm prevention
  heartworm_product?: string;
  // Medical Profile
  neutered_status?: 'neutered' | 'intact' | 'unknown';
  living_environment?: 'indoor' | 'outdoor' | 'both';
  family_composition?: string; // e.g., "Adults: 2, Children: 0, Other pets: 1 dog"
};

export type PhotoTag = {
  name: string;
  isAi: boolean;
  confirmed: boolean;
};

export type CatImage = {
  id: string;
  catId: string;
  catIds?: string[]; // Multiple cats tagged in this photo
  storagePath: string;
  createdAt: string;
  isFavorite: boolean;
  width?: number;
  height?: number;
  memo?: string;
  tags?: PhotoTag[];
};

export type TaskGroup = 'CARE' | 'HEALTH' | 'INVENTORY';
export type Cadence = 'daily' | 'weekly' | 'monthly' | 'once';
export type DueTime = 'morning' | 'evening' | 'any' | 'weekend' | 'month';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'as-needed';
export type TimeOfDay = 'morning' | 'noon' | 'evening' | 'anytime';
export type MealSlot = 'morning' | 'noon' | 'evening' | 'night';
export type StockLevel = 'full' | 'half' | 'low' | 'empty';
export type ObservationInputType = 'ok-notice' | 'count' | 'choice' | 'photo';
export type ObservationCategory = 'eating' | 'toilet' | 'behavior' | 'health';

// Care Task Definition (settings)
export type CareTaskDef = {
  id: string;
  title: string;
  icon: string;
  frequency: Frequency;
  frequencyType?: 'fixed' | 'interval'; // Default to fixed
  intervalHours?: number; // Only for interval type
  frequencyCount?: number; // X times per week/month
  timeOfDay: TimeOfDay;
  mealSlots?: MealSlot[]; // Which time slots this task applies to
  perCat: boolean; // true = per cat, false = shared
  targetCatIds?: string[]; // IDs of cats this task applies to (if perCat is true)
  enabled: boolean;
  deletedAt?: string;

  // Visual & Timing Refinements
  priority?: 'low' | 'normal' | 'high';
  startOffsetMinutes?: number; // Minutes before dueTime to show
  validDurationMinutes?: number; // Minutes after dueTime to keep visible (undefined = forever/until done)
  userNotes?: string; // Instructions for the task
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number;
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
  acknowledged_at?: string | null;
};

export type IncidentStatus = 'watching' | 'hospital' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high';
export type IncidentType = 'vomit' | 'diarrhea' | 'injury' | 'no_energy' | 'sneeze' | 'other';

// Symptom details for medical report
export type SymptomDetails = {
  vomit_count?: number; // Number of times vomited in 24h
  vomit_content?: string; // Description of vomit content
  stool_score?: 1 | 2 | 3 | 4 | 5 | 6 | 7; // Bristol stool scale
  stool_blood?: boolean;
  stool_mucus?: boolean;
  urine_frequency?: 'normal' | 'frequent' | 'rare' | 'none';
  urine_pain?: boolean;
  urine_blood?: boolean;
};

export type Incident = {
  id: string;
  household_id: string;
  cat_id: string;
  type: IncidentType;
  status: IncidentStatus;
  severity: IncidentSeverity;
  photos: string[];
  note: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  updates?: IncidentUpdate[]; // Joined for UI
  // Medical Report Enhancement
  onset_at?: string; // When symptoms started
  last_normal_at?: string; // Last time cat was normal
  symptom_details?: SymptomDetails;
  batch_id?: string; // For multi-cat grouping
};

export type IncidentUpdate = {
  id: string;
  incident_id: string;
  user_id: string;
  note: string;
  photos: string[];
  status_change?: IncidentStatus; // If status changed with this update
  created_at: string;
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

export type LayoutType = 'v2-classic' | 'v2-island';

export type AppSettings = {
  plan: 'Free' | 'Pro';
  aiEnabled: boolean;
  engagement: 'passive' | 'daily';
  homeMode: 'checklist' | 'cards' | 'immersive';
  // Unified view mode: Display style + Bubble placement combined
  homeViewMode: 'story' | 'parallax' | 'icon';
  // Layout style for UI elements
  layoutType: LayoutType;
  weeklySummaryEnabled: boolean;
  quietHours: { start: number; end: number };
  invThresholds: { soon: number; urgent: number; critical: number };
  seasonalDeckEnabled: boolean;
  skinPackOwned: boolean;
  skinMode: 'default' | 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';
  photoTagAssist: boolean;
  dayStartHour: number;
  lastSeenPhotoAt: string;
  homeButtonMode: 'unified' | 'separated'; // A/B Test for Button Layout
};

// Medication Log for tracking treatments
export type MedicationLog = {
  id: string;
  cat_id: string;
  household_id: string;
  product_name: string;
  dosage?: string;
  starts_at: string;
  end_date?: string;
  frequency?: 'once' | 'daily' | 'twice_daily' | 'weekly' | 'as_needed';
  notes?: string;
  created_by: string;
  created_at: string;
};

// Report Configuration for Medical Report generation
export type TodayStatusLevel = 'normal' | 'slightly_bad' | 'bad' | 'unknown';

export type TodayStatus = {
  appetite: TodayStatusLevel;
  energy: TodayStatusLevel;
  excretion: TodayStatusLevel;
  hydration: TodayStatusLevel;
};

export type IngestionDetails = {
  object?: string; // What was ingested
  amount?: string; // Quantity or length
  time?: string; // When it happened
};

export type AbdominalSigns = {
  refusing_touch?: boolean;
  prayer_pose?: boolean;
  crouching?: boolean;
};

export type EmergencyFlags = {
  persistent_vomiting?: boolean;
  lethargy?: boolean;
  abdominal_pain?: boolean;
  no_excretion?: boolean;
};

export type VitalSummary = {
  stool: boolean;
  urine: boolean;
  vomit_count: number;
  last_meal?: string;
};

export type ReportConfigData = {
  // Step 1: Basic Summary
  chief_complaint: string; // 主訴 (required)
  onset: string; // 発症日時
  last_normal: string; // 最後に正常だった日時
  today_status: TodayStatus;
  // Step 2: Emergency/Ingestion
  has_ingestion_suspicion: boolean;
  ingestion_details?: IngestionDetails;
  emergency_flags: EmergencyFlags;
  abdominal_signs: AbdominalSigns;
  // Step 3: Vitals
  vital_summary: VitalSummary;
};

// Weekly Album Settings
export type AlbumLayoutType = 'hero3' | 'grid4' | 'filmstrip';

export type WeeklyAlbumSettings = {
  id: string;
  user_id: string;
  cat_id: string;
  week_key: string; // e.g., "2026-W04"
  layout_type: AlbumLayoutType;
  created_at: string;
  updated_at: string;
};
