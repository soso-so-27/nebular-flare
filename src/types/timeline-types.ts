import { IncidentType, IncidentStatus, IncidentSeverity, SymptomDetails } from './index';

export type TimelineReaction = {
    incident_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
    user_name?: string;
};

export type TimelineUpdate = {
    id: string;
    incident_id: string;
    user_id: string;
    note: string;
    photos: string[];
    status_change?: IncidentStatus;
    created_at: string;
    user_name?: string;
    user_avatar?: string;
};

export type TimelineCatShort = {
    id: string;
    name: string;
    avatar?: string;
};

export type TimelineItem = {
    id: string;
    type: string | IncidentType;
    catId: string;
    catName: string;
    cats: TimelineCatShort[];
    note: string;
    photos: string[];
    createdAt: string;
    createdBy?: string;
    userName?: string;
    userAvatar?: string;
    updates: TimelineUpdate[];
    reactions: TimelineReaction[];
    is_bookmarked: boolean;
    health_category?: string;
    health_value?: string;
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    batch_id?: string;
    onset_at?: string;
    symptom_details?: SymptomDetails;
};

export type TimelineGroup = {
    dateLabel: string;
    items: TimelineItem[];
};
