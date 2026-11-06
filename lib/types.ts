/** 'superadmin' is never assigned in a profile: the backend gives it to Django
 * superusers, who have access to every module. */
export type Role = 'inspector' | 'chief' | 'prosecutor' | 'admin' | 'superadmin';

export interface User {
  id: string;
  /** Demo sign-in name. */
  login: string;
  name: string;
  role: Role;
  org: string;
  active: boolean;
}

export type CaseStatus = 'active' | 'archived';
/** Chief's review mark: a significant edit after «Проверена» flips it to «changed». */
export type ReviewState = 'new' | 'checked' | 'changed';

export interface Ground {
  category: string;
  type: string;
  number: string;
  date: string;
}

export interface CaseDocument {
  id: string;
  type: string;
  name: string;
  date: string;
  number?: string;
  /** Validated on upload by the backend; drives preview vs download. */
  contentType?: string;
  size?: number;
  /** Seeded placeholder without a real file (test fixtures only). */
  demo?: boolean;
  by: string;
  at: string;
}

export interface HistoryEntry {
  text: string;
  by: string;
  at: string;
}

export type ArchiveStatus = 'pending' | 'returned' | 'approved';

export interface ArchiveRequest {
  status: ArchiveStatus;
  date: string;
  reason: string;
  text: string;
  docId?: string;
  author: string;
  created: string;
  feedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Case {
  id: string;
  number: string;
  name: string;
  iin: string;
  dob: string;
  district: string;
  address: string;
  education: string;
  school: string;
  grade: string;
  rep: string;
  phone: string;
  inspector: string;
  org: string;
  status: CaseStatus;
  review: ReviewState;
  registered: string;
  end: string;
  grounds: Ground[];
  docs: CaseDocument[];
  history: HistoryEntry[];
  archiveRequest?: ArchiveRequest;
  archiveDate?: string;
  archiveReason?: string;
}

export type SignalStatus = 'open' | 'review' | 'closed';
export type SignalEventKind = 'reply' | 'return' | 'cancel';

export interface SignalEvent {
  text: string;
  by: string;
  at: string;
  kind?: SignalEventKind;
}

interface RemarkBase {
  id: string;
  caseId: string;
  author: string;
  text: string;
  created: string;
  events: SignalEvent[];
}

/** Informational comment — no executor, no deadline. */
export interface PlainComment extends RemarkBase {
  required: false;
}

/** «Замечание»: requires a fix by `executor` before `due`. */
export interface Signal extends RemarkBase {
  required: true;
  executor: string;
  section: string;
  due: string;
  status: SignalStatus;
  /** Chief who delegated a prosecutor's signal to an inspector. */
  coordinator?: string;
  closedAt?: string;
}

export type Remark = PlainComment | Signal;

export interface OpekaState {
  users: User[];
  cases: Case[];
  remarks: Remark[];
  categories: string[];
  orgs: string[];
  districts: string[];
}

export type SettingKey = 'orgs' | 'categories';
