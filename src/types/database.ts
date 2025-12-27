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
                };
                Insert: {
                    id?: string;
                    household_id: string;
                    label: string;
                    last_bought?: string | null;
                    range_min?: number;
                    range_max?: number;
                    deleted_at?: string | null;
                };
                Update: {
                    id?: string;
                    household_id?: string;
                    label?: string;
                    last_bought?: string | null;
                    range_min?: number;
                    range_max?: number;
                    deleted_at?: string | null;
                };
            };
        };
    };
}
