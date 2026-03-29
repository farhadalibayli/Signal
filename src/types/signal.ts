export type ThemeMode = 'dark' | 'light';

export type UserPreview = {
  id?: string;
  name: string;
  username: string;
  initials: string;
  avatarColor: string;
  avatar?: string;
};

export type SignalType = {
  label: string;
  value: string;
  color: string;
};

// ─── Location ────────────────────────────────────────────────────────────────
export type LocationPrivacy = 'specific' | 'general' | 'none';

export type LocationData = {
  privacy:    LocationPrivacy;
  label:      string;       // Display name e.g. "Coffee Bay Café" or "Near City Centre"
  latitude?:  number;
  longitude?: number;
};

// ─── Signal ──────────────────────────────────────────────────────────────────
export type SignalData = {
  id:           string;
  user:         UserPreview;
  type:         string;
  typeColor:    string;
  text:         string;
  minutesLeft:  number;
  respondedIn:  number;
  status:       'active' | 'expiring';
  isOwn?:       boolean;
  hasJoined?:   boolean;
  location?:    LocationData;
  createdAt?:   number;  // Unix ms — for location edit window
  views?:       number;
};

export type SignalDetailScreenParams = { signal: SignalData };

export type ResponseData = {
  id:      string;
  user:    UserPreview;
  type:    'in' | 'maybe';
  timeAgo: string;
};

export type ChatMessageData = {
  id:      string;
  user:    { name: string; initials: string; avatarColor: string; avatar?: string };
  text:    string;
  timeAgo: string;
  isOwn:   boolean;
};

export type ConnectionData = {
  id:           string;
  name:         string;
  username:     string;
  initials:     string;
  avatarColor:  string;
  avatar?:      string;
  isActive:     boolean;
  lastSignal:   string;
  mutualCount:  number;
};

export type GroupData = {
  id:          string;
  name:        string;
  label:       string;
  memberCount: number;
  color:       string;
  members:     string[];
};

export type RequestData = {
  id:          string;
  name:        string;
  username:    string;
  initials:    string;
  avatarColor: string;
  avatar?:     string;
  mutualCount: number;
  timeAgo:     string;
};

export type ProfileData = {
  name:       string;
  username:   string;
  initials:   string;
  avatarColor: string;
  avatar?:    string;
  bio:        string;
  joinedDate: string;
  stats: {
    signalsSent:      number;
    responseRate:     number;
    connections:      number;
    signalsThisWeek:  number;
  };
};

export type ActivityData = {
  id:        string;
  type:      'signal_sent' | 'signal_received' | 'connection_accepted';
  typeColor: string;
  signalType: string;
  text:      string;
  timeAgo:   string;
  responses: number;
  status:    'expired' | 'active';
  location?: LocationData;
  createdAt?: number;
};

export type AlertData = {
  id:      string;
  type:
    | 'new_signal'
    | 'responded_in'
    | 'responded_maybe'
    | 'chat_message'
    | 'connection_request'
    | 'new_connection'
    | 'signal_expiring'
    | 'signal_expired';
  isRead:           boolean;
  timeAgo:          string;
  user:             { name: string; initials: string; avatarColor: string; avatar?: string } | null;
  signalType?:      string;
  signalTypeColor?: string;
  preview:          string;
};