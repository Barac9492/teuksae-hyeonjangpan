import type { AppSnapshot, MomentDraft, OperatorLog, VenueId, VenueState } from '../domain/types';

export interface RepositoryCapabilities {
  crossTabSync: boolean;
  operatorWrites: boolean;
  momentUploadConnected: boolean;
  remoteSync: boolean;
}

export interface AppRepository {
  readonly mode: 'local' | 'remote';
  readonly capabilities: RepositoryCapabilities;

  getSnapshot(): AppSnapshot;
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void;

  setAttendanceToday(next: boolean): void;
  setTomorrowAttendance(next: boolean): void;
  selectVenue(venueId: VenueId | null): void;

  setPracticeAction(action: string): void;
  togglePracticeCompleted(dayIndex: number): void;
  setWordNote(note: string): void;
  setPrayerNote(note: string): void;

  addMomentDraft(draft: MomentDraft): void;
  setVenueState(venueId: VenueId, next: VenueState, updatedBy: string): OperatorLog;
}
