// src/types/conversation.ts
export type ConversationState =
  | 'AWAITING_CHOICE'
  | 'AWAITING_DATE'
  | 'AWAITING_LOCATION'
  | 'CONFIRMING'
  | 'DONE'
  | 'EXPIRED';

export type ConversationPendingAction = 'RESCHEDULE' | 'CANCEL';

export interface IConversationTurnItem {
  direction: 'INBOUND' | 'OUTBOUND';
  text: string;
  messageType: string;
  wamid?: string;
  simulated?: boolean;
  timestamp: string;
}

export interface IConversationSessionItem {
  _id: string;
  merchantId: string;
  shipmentId: {
    _id: string;
    trackingNumber: string;
    carrier: string;
    status: string;
    orderValueCOD: number;
    rescheduledDate?: string;
    destinationStationCode?: string;
  } | string;
  customerPhoneHash: string;
  state: ConversationState;
  stateVersion: number;
  draft: {
    date?: string;
    coordinates?: { lat: number; lng: number };
    pendingAction?: ConversationPendingAction;
    correctionRecorded?: boolean;
  };
  ndrAttempt: number;
  templateWamid?: string;
  messages: IConversationTurnItem[];
  lastInboundAt?: string;
  windowExpiresAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  AWAITING_CHOICE: number;
  AWAITING_DATE: number;
  AWAITING_LOCATION: number;
  CONFIRMING: number;
  DONE: number;
  EXPIRED: number;
}

export interface ListConversationsFilter {
  state?: ConversationState;
  shipmentId?: string;
  limit?: number;
  skip?: number;
}

export interface ListConversationsResponse {
  sessions: IConversationSessionItem[];
  total: number;
  summary: ConversationSummary;
  limit: number;
  skip: number;
}

export interface SimulateInboundInput {
  shipmentId: string;
  action:
    | 'ACTION_RESCHEDULE'
    | 'ACTION_CORRECTION'
    | 'ACTION_CANCEL'
    | 'SELECT_DATE'
    | 'SHARE_LOCATION'
    | 'SKIP_LOCATION'
    | 'CONFIRM_RESCHEDULE'
    | 'CONFIRM_CANCEL'
    | 'CUSTOM_TEXT';
  selectedDate?: string;
  coordinates?: { lat: number; lng: number };
  customText?: string;
}
