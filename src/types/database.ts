export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            households: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    created_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    created_at?: string;
                    deleted_at?: string | null;
                };
            };
            users: {
                Row: {
                    id: string;
                    household_id: string | null;
                    display_name: string | null;
                    avatar_url: string | null;
                    created_at: string;
                };
                Insert: {
                    id: string;
                    household_id?: string | null;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    household_id?: string | null;
                    display_name?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                };
            };
            cats: {
                Row: {
                    id: string;
                    household_id: string;
                    name: string;
                    avatar: string | null;
                    sex: string | null;
                    birthday: string | null;
                    weight: number | null;
                    microchip_id: string | null;
                    notes: string | null;
                    created_at: string;
                    deleted_at: string | null;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    name: string;
                    avatar?: string | null;
                    sex?: string | null;
                    birthday?: string | null;
                    weight?: number | null;
                    microchip_id?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    created_by?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    name?: string;
                    avatar?: string | null;
                    sex?: string | null;
                    birthday?: string | null;
                    weight?: number | null;
                    microchip_id?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    deleted_at?: string | null;
                    created_by?: string | null;
                };
            };
            care_logs: {
                Row: {
                    id: string;
                    household_id: string;
                    cat_id: string | null;
                    type: string;
                    done_by: string | null;
                    done_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    cat_id?: string | null;
                    type: string;
                    done_by?: string | null;
                    done_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    cat_id?: string | null;
                    type?: string;
                    done_by?: string | null;
                    done_at?: string;
                    deleted_at?: string | null;
                };
            };
            observations: {
                Row: {
                    id: string;
                    cat_id: string;
                    type: string;
                    value: string;
                    recorded_by: string | null;
                    recorded_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    cat_id: string;
                    type: string;
                    value: string;
                    recorded_by?: string | null;
                    recorded_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    cat_id?: string;
                    type?: string;
                    value?: string;
                    recorded_by?: string | null;
                    recorded_at?: string;
                    deleted_at?: string | null;
                };
            };
            inventory: {
                Row: {
                    id: string;
                    household_id: string;
                    label: string;
                    last_bought: string | null;
                    range_min: number;
                    range_max: number;
                    deleted_at: string | null;
                    stock_level: string;
                    alert_enabled: boolean;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    label: string;
                    last_bought?: string | null;
                    range_min?: number;
                    range_max?: number;
                    deleted_at?: string | null;
                    stock_level?: string;
                    alert_enabled?: boolean;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    label?: string;
                    last_bought?: string | null;
                    range_min?: number;
                    range_max?: number;
                    deleted_at?: string | null;
                    stock_level?: string;
                    alert_enabled?: boolean;
                };
            };
            cat_weight_history: {
                Row: {
                    id: string;
                    cat_id: string;
                    weight: number;
                    recorded_at: string;
                    note: string | null;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    cat_id: string;
                    weight: number;
                    recorded_at?: string;
                    note?: string | null;
                    created_by?: string | null;
                };
                Update: {
                    id?: string;
                    cat_id?: string;
                    weight?: number;
                    recorded_at?: string;
                    note?: string | null;
                    created_by?: string | null;
                };
            };
            cat_images: {
                Row: {
                    id: string;
                    cat_id: string;
                    storage_path: string;
                    created_at: string;
                    is_favorite: boolean;
                };
                Insert: {
                    id?: string;
                    cat_id: string;
                    storage_path: string;
                    created_at?: string;
                    is_favorite?: boolean;
                };
                Update: {
                    id?: string;
                    cat_id?: string;
                    storage_path?: string;
                    created_at?: string;
                    is_favorite?: boolean;
                };
            };
            care_task_defs: {
                Row: {
                    id: string;
                    household_id: string;
                    title: string;
                    icon: string;
                    frequency: string;
                    time_of_day: string | null;
                    meal_slots: Json | null;
                    per_cat: boolean | null;
                    enabled: boolean | null;
                    created_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    title: string;
                    icon: string;
                    frequency: string;
                    time_of_day?: string | null;
                    meal_slots?: Json | null;
                    per_cat?: boolean | null;
                    enabled?: boolean | null;
                    created_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    title?: string;
                    icon?: string;
                    frequency?: string;
                    time_of_day?: string | null;
                    meal_slots?: Json | null;
                    per_cat?: boolean | null;
                    enabled?: boolean | null;
                    created_at?: string;
                    deleted_at?: string | null;
                };
            };
            notice_defs: {
                Row: {
                    id: string;
                    household_id: string;
                    title: string;
                    kind: string | null;
                    cadence: string | null;
                    due: string | null;
                    choices: string[] | null;
                    input_type: string | null;
                    category: string | null;
                    required: boolean | null;
                    enabled: boolean | null;
                    optional: boolean | null;
                    created_at: string;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    title: string;
                    kind?: string | null;
                    cadence?: string | null;
                    due?: string | null;
                    choices?: string[] | null;
                    input_type?: string | null;
                    category?: string | null;
                    required?: boolean | null;
                    enabled?: boolean | null;
                    optional?: boolean | null;
                    created_at?: string;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    title?: string;
                    kind?: string | null;
                    cadence?: string | null;
                    due?: string | null;
                    choices?: string[] | null;
                    input_type?: string | null;
                    category?: string | null;
                    required?: boolean | null;
                    enabled?: boolean | null;
                    optional?: boolean | null;
                    created_at?: string;
                    deleted_at?: string | null;
                };
            };
            incidents: {
                Row: {
                    id: string;
                    household_id: string;
                    cat_id: string;
                    type: string;
                    status: string;
                    severity: string;
                    photos: string[] | null;
                    note: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                    resolved_at: string | null;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    cat_id: string;
                    type: string;
                    status?: string;
                    severity?: string;
                    photos?: string[] | null;
                    note?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    resolved_at?: string | null;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    cat_id?: string;
                    type?: string;
                    status?: string;
                    severity?: string;
                    photos?: string[] | null;
                    note?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    resolved_at?: string | null;
                    deleted_at?: string | null;
                };
            };
            incident_updates: {
                Row: {
                    id: string;
                    incident_id: string;
                    user_id: string | null;
                    note: string | null;
                    photos: string[] | null;
                    status_change: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    incident_id: string;
                    user_id?: string | null;
                    note?: string | null;
                    photos?: string[] | null;
                    status_change?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    incident_id?: string;
                    user_id?: string | null;
                    note?: string | null;
                    photos?: string[] | null;
                    status_change?: string | null;
                    created_at?: string;
                };
            };
        };
    };
}
