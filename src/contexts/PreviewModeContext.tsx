import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

export type PreviewNote = {
  step: number;
  note: string;
  timestamp: number;
};

export type SandboxLead = {
  id: string;
  name: string;
  phone: string;
  status: string;
  tags: string[];
  is_demo: boolean;
  city: string;
  note: string;
};

export type SandboxActivity = {
  id: string;
  lead_name: string;
  action: string;
  detail: string;
  time: string;
};

export type SandboxTag = {
  id: string;
  name: string;
  color: string;
  tag_type: 'tracking' | 'personal' | 'funnel';
};

export type SandboxData = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    plan: string;
    lead_count: number;
    onboarding_step: number;
  };
  sheets: { id: string; name: string; is_demo: boolean }[];
  leads: SandboxLead[];
  tags: SandboxTag[];
  activities: SandboxActivity[];
  trackup: {
    mode: string;
    today: { leads: number; responses: number; video_send: number; enrolment: number };
  };
};

type PreviewModeState = {
  active: boolean;
  adminUserId: string | null;
  currentStep: number;
  startedAt: number | null;
  completedSteps: number[];
  notes: PreviewNote[];
  sandboxData: SandboxData;
};

type PreviewModeContextValue = PreviewModeState & {
  launchPreview: (adminUserId: string, startStep?: number) => void;
  exitPreview: () => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  addNote: (note: string) => void;
  clearNotes: () => void;
  getSessionDuration: () => number;
  showExitSummary: boolean;
  setShowExitSummary: (v: boolean) => void;
  showNoteInput: boolean;
  setShowNoteInput: (v: boolean) => void;
  showStepJump: boolean;
  setShowStepJump: (v: boolean) => void;
};

const STEP_LABELS = [
  'Welcome screen',
  'Demo leads list',
  'Open lead profile',
  'Explore profile',
  'Assign a tag',
  'Retargeting filter',
  'Follow-Up activity',
  'Prospects view',
  'To-Do task',
  'Tracking numbers',
  'Profile tools',
  'Completion screen',
];

export { STEP_LABELS };

const defaultSandboxData: SandboxData = {
  user: {
    id: 'preview_sandbox',
    name: 'Demo User',
    email: 'demo@preview.com',
    phone: '+91 9999999999',
    plan: 'free',
    lead_count: 0,
    onboarding_step: 0,
  },
  sheets: [{ id: 'demo_sheet_preview', name: '🎯 Demo Sheet', is_demo: true }],
  leads: [
    { id: 'l1', name: 'Rahul Sharma', phone: '0000000001', status: 'Video Send', tags: ['Video Send'], is_demo: true, city: 'Mumbai', note: 'Interested in business opportunity. Met at seminar.' },
    { id: 'l2', name: 'Priya Mehta', phone: '0000000002', status: 'Not Picked', tags: ['Not Picked'], is_demo: true, city: 'Delhi', note: 'This is a demo lead.' },
    { id: 'l3', name: 'Amit Gupta', phone: '0000000003', status: 'Busy', tags: ['Busy'], is_demo: true, city: 'Bangalore', note: 'This is a demo lead.' },
    { id: 'l4', name: 'Sunita Yadav', phone: '0000000004', status: 'Enrolment', tags: ['Enrolment'], is_demo: true, city: 'Pune', note: 'This is a demo lead.' },
    { id: 'l5', name: 'Vikram Singh', phone: '0000000005', status: 'Call Back', tags: ['Call Back'], is_demo: true, city: 'Jaipur', note: 'This is a demo lead.' },
    { id: 'l6', name: 'Neha Joshi', phone: '0000000006', status: 'Day 1', tags: ['Day 1'], is_demo: true, city: 'Hyderabad', note: 'This is a demo lead.' },
    { id: 'l7', name: 'Ravi Kumar', phone: '0000000007', status: 'Not Picked', tags: ['Not Picked'], is_demo: true, city: 'Chennai', note: 'This is a demo lead.' },
    { id: 'l8', name: 'Anjali Tiwari', phone: '0000000008', status: 'Video Send', tags: ['Video Send'], is_demo: true, city: 'Kolkata', note: 'This is a demo lead.' },
    { id: 'l9', name: 'Deepak Verma', phone: '0000000009', status: 'Interested', tags: ['Interested'], is_demo: true, city: 'Ahmedabad', note: 'This is a demo lead.' },
    { id: 'l10', name: 'Pooja Agarwal', phone: '0000000010', status: 'Day 2', tags: ['Day 2'], is_demo: true, city: 'Lucknow', note: 'This is a demo lead.' },
    { id: 'l11', name: 'Suresh Patel', phone: '0000000011', status: 'Busy', tags: ['Busy'], is_demo: true, city: 'Surat', note: 'This is a demo lead.' },
    { id: 'l12', name: 'Kavita Sharma', phone: '0000000012', status: 'Call Back', tags: ['Call Back'], is_demo: true, city: 'Nagpur', note: 'This is a demo lead.' },
    { id: 'l13', name: 'Manoj Nair', phone: '0000000013', status: 'Not Picked', tags: ['Not Picked'], is_demo: true, city: 'Kochi', note: 'This is a demo lead.' },
    { id: 'l14', name: 'Rekha Mishra', phone: '0000000014', status: 'Enrolment', tags: ['Enrolment'], is_demo: true, city: 'Patna', note: 'This is a demo lead.' },
    { id: 'l15', name: 'Arjun Reddy', phone: '0000000015', status: 'Day 3', tags: ['Day 3'], is_demo: true, city: 'Visakhapatnam', note: 'This is a demo lead.' },
    { id: 'l16', name: 'Meena Saxena', phone: '0000000016', status: 'Video Send', tags: ['Video Send'], is_demo: true, city: 'Indore', note: 'This is a demo lead.' },
    { id: 'l17', name: 'Kiran Desai', phone: '0000000017', status: 'Interested', tags: ['Interested'], is_demo: true, city: 'Vadodara', note: 'This is a demo lead.' },
    { id: 'l18', name: 'Rohit Chauhan', phone: '0000000018', status: 'Not Interested', tags: ['Not Interested'], is_demo: true, city: 'Bhopal', note: 'This is a demo lead.' },
    { id: 'l19', name: 'Shweta Pandey', phone: '0000000019', status: 'Call Back', tags: ['Call Back'], is_demo: true, city: 'Chandigarh', note: 'This is a demo lead.' },
    { id: 'l20', name: 'Nitin Bhatt', phone: '0000000020', status: 'Day 1', tags: ['Day 1'], is_demo: true, city: 'Dehradun', note: 'This is a demo lead.' },
  ],
  tags: [
    { id: 't1', name: 'Day 1', color: '#3B6FFF', tag_type: 'tracking' },
    { id: 't2', name: 'Day 2', color: '#6B5FFF', tag_type: 'tracking' },
    { id: 't3', name: 'Day 3', color: '#8B5CF6', tag_type: 'tracking' },
    { id: 't4', name: 'Video Send', color: '#0EA5E9', tag_type: 'tracking' },
    { id: 't5', name: 'Enrolment', color: '#22C55E', tag_type: 'tracking' },
    { id: 't6', name: 'Not Picked', color: '#8B5CF6', tag_type: 'personal' },
    { id: 't7', name: 'Busy', color: '#EF4444', tag_type: 'personal' },
    { id: 't8', name: 'Call Back', color: '#F97316', tag_type: 'personal' },
    { id: 't9', name: 'Interested', color: '#22C55E', tag_type: 'personal' },
    { id: 't10', name: 'Not Interested', color: '#6B7280', tag_type: 'personal' },
    { id: 't11', name: 'Important Video', color: '#F59E0B', tag_type: 'funnel' },
    { id: 't12', name: 'Closing Video', color: '#EF4444', tag_type: 'funnel' },
    { id: 't13', name: 'MB', color: '#3B6FFF', tag_type: 'funnel' },
  ],
  activities: [
    { id: 'a1', lead_name: 'Rahul Sharma', action: 'tag_assigned', detail: 'Tagged as Video Send', time: '2 hours ago' },
    { id: 'a2', lead_name: 'Priya Mehta', action: 'call_made', detail: 'Call attempted', time: '3 hours ago' },
    { id: 'a3', lead_name: 'Sunita Yadav', action: 'tag_assigned', detail: 'Tagged as Enrolment', time: '5 hours ago' },
    { id: 'a4', lead_name: 'Vikram Singh', action: 'followup_set', detail: 'Follow-up scheduled', time: '6 hours ago' },
    { id: 'a5', lead_name: 'Neha Joshi', action: 'tag_assigned', detail: 'Tagged as Day 1', time: '1 day ago' },
  ],
  trackup: {
    mode: 'automatic',
    today: { leads: 3, responses: 2, video_send: 1, enrolment: 1 },
  },
};

const defaultState: PreviewModeState = {
  active: false,
  adminUserId: null,
  currentStep: 0,
  startedAt: null,
  completedSteps: [],
  notes: [],
  sandboxData: defaultSandboxData,
};

const PreviewModeContext = createContext<PreviewModeContextValue | null>(null);

export function PreviewModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PreviewModeState>(defaultState);
  const [showExitSummary, setShowExitSummary] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showStepJump, setShowStepJump] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  const launchPreview = useCallback((adminUserId: string, startStep = 0) => {
    const now = Date.now();
    startedAtRef.current = now;
    const completed = Array.from({ length: startStep }, (_, i) => i);
    setState({
      active: true,
      adminUserId,
      currentStep: startStep,
      startedAt: now,
      completedSteps: completed,
      notes: [],
      sandboxData: {
        ...defaultSandboxData,
        user: { ...defaultSandboxData.user, onboarding_step: startStep },
      },
    });
  }, []);

  const exitPreview = useCallback(() => {
    setShowExitSummary(true);
  }, []);

  const finalExit = useCallback(() => {
    setState(defaultState);
    setShowExitSummary(false);
    setShowNoteInput(false);
    setShowStepJump(false);
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < 0 || step > 11) return;
    setState(prev => ({
      ...prev,
      currentStep: step,
      completedSteps: [...new Set([...prev.completedSteps, ...Array.from({ length: step }, (_, i) => i)])],
      sandboxData: { ...prev.sandboxData, user: { ...prev.sandboxData.user, onboarding_step: step } },
    }));
    setShowStepJump(false);
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const next = Math.min(prev.currentStep + 1, 11);
      return {
        ...prev,
        currentStep: next,
        completedSteps: [...new Set([...prev.completedSteps, prev.currentStep])],
        sandboxData: { ...prev.sandboxData, user: { ...prev.sandboxData.user, onboarding_step: next } },
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  const addNote = useCallback((note: string) => {
    setState(prev => ({
      ...prev,
      notes: [...prev.notes, { step: prev.currentStep, note, timestamp: Date.now() }],
    }));
    setShowNoteInput(false);
  }, []);

  const clearNotes = useCallback(() => {
    setState(prev => ({ ...prev, notes: [] }));
  }, []);

  const getSessionDuration = useCallback(() => {
    if (!startedAtRef.current) return 0;
    return Math.round((Date.now() - startedAtRef.current) / 1000);
  }, []);

  return (
    <PreviewModeContext.Provider
      value={{
        ...state,
        launchPreview,
        exitPreview: state.active ? exitPreview : finalExit,
        goToStep,
        nextStep,
        prevStep,
        addNote,
        clearNotes,
        getSessionDuration,
        showExitSummary,
        setShowExitSummary: (v) => { if (!v) finalExit(); else setShowExitSummary(v); },
        showNoteInput,
        setShowNoteInput,
        showStepJump,
        setShowStepJump,
      }}
    >
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  const ctx = useContext(PreviewModeContext);
  if (!ctx) throw new Error('usePreviewMode must be used within PreviewModeProvider');
  return ctx;
}
