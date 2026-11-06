import { apiBlob, apiSend } from './api';

/* Typed calls to /api/v1/prosecutor-opeka/. Form field names already match the
   backend serializers, so upload forms send their FormData as is. */

const BASE = '/api/v1/prosecutor-opeka';

export interface MutationResult {
  ok: true;
  caseId?: string;
}

const post = (path: string, body?: Record<string, unknown> | FormData) => apiSend<MutationResult>('POST', `${BASE}${path}`, body);

export const opekaApi = {
  createCase: (form: FormData) => post('/cases/', form),
  updateCase: (caseId: string, fields: Record<string, unknown>) => apiSend<MutationResult>('PATCH', `${BASE}/cases/${caseId}/`, fields),
  addDocument: (caseId: string, form: FormData) => post(`/cases/${caseId}/documents/`, form),
  addGround: (caseId: string, form: FormData) => post(`/cases/${caseId}/grounds/`, form),
  addRemark: (caseId: string, remark: { text: string; required: boolean; section: string; executor: string; due: string }) =>
    post(`/cases/${caseId}/remarks/`, { ...remark, executor: remark.required ? remark.executor : null }),
  reassign: (caseId: string, inspector: string) => post(`/cases/${caseId}/reassign/`, { inspector }),
  markChecked: (caseId: string) => post(`/cases/${caseId}/check/`),
  requestArchive: (caseId: string, form: FormData) => post(`/cases/${caseId}/archive-request/`, form),
  decideArchive: (caseId: string, decision: { approve: boolean; feedback?: string }) => post(`/cases/${caseId}/archive-decision/`, decision),
  respond: (signalId: string, kind: 'reply' | 'return' | 'cancel', text: string) => post(`/signals/${signalId}/respond/`, { kind, text }),
  accept: (signalId: string) => post(`/signals/${signalId}/accept/`),
  delegate: (signalId: string, executor: string) => post(`/signals/${signalId}/delegate/`, { executor }),
  createUser: (user: { login: string; password: string; name: string; role: string; org: string }) => post('/users/', user),
  toggleUser: (userId: string) => apiSend<{ ok: true; active: boolean }>('POST', `${BASE}/users/${userId}/toggle/`),
  addReference: (key: 'orgs' | 'categories', value: string) => post(`/references/${key}/`, { value }),
  documentFile: (docId: string) => apiBlob(`${BASE}/documents/${docId}/file/`),
};

export const WORKSPACE_PATH = `${BASE}/workspace/`;
