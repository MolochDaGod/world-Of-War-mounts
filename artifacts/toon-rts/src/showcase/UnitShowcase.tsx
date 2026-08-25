import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShowcaseControlPanel,
  type EditorValues,
  type ShowcaseDossier,
  type Shot,
  type SubjectGroup,
} from './ShowcaseControlPanel';
import { ShowcaseScene, type DirectorSettings } from './ShowcaseScene';
import {
  groupShowcaseSubjects,
  SHOWCASE_RACE_COLORS,
  SHOWCASE_SUBJECTS,
  type ShowcaseProfile,
  type ShowcaseShotId,
} from './showcaseCatalog';

function settingsForProfile(profile?: ShowcaseProfile): DirectorSettings {
  return {
    cameraDistance: profile?.cameraDistance ?? 11,
    cameraHeight: profile?.cameraHeight ?? 4.8,
    keyLight: 2.8,
  };
}

function downloadBlob(blob: Blob, fileName: string) {
  const anchor = document.createElement('a');
  const href = URL.createObjectURL(blob);
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 500);
}

function safeFileSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function UnitShowcase({ onReturn }: { onReturn: () => void }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState(SHOWCASE_SUBJECTS[0]?.id ?? '');
  const [selectedShotId, setSelectedShotId] = useState<ShowcaseShotId>('idle');
  const [settings, setSettings] = useState<DirectorSettings>(() => settingsForProfile(SHOWCASE_SUBJECTS[0]?.profile));
  const [shotKey, setShotKey] = useState(0);
  const [takeToken, setTakeToken] = useState(0);
  const [status, setStatus] = useState('DIRECTOR_READY');
  const [isBusy, setIsBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const subject = SHOWCASE_SUBJECTS.find(candidate => candidate.id === selectedSubjectId) ?? SHOWCASE_SUBJECTS[0];
  const shot = subject?.shots.find(candidate => candidate.id === selectedShotId) ?? subject?.shots[0];

  const subjectGroups = useMemo<SubjectGroup[]>(() => Object.entries(groupShowcaseSubjects()).map(([name, subjects]) => ({
    id: safeFileSegment(name),
    name,
    alliance: subjects[0]?.alliance ?? 'Alliance archive',
    subjects: subjects.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      race: candidate.race,
      category: candidate.unit?.category ?? 'commander',
      kind: candidate.kind,
    })),
  })), []);

  const shotList = useMemo<Shot[]>(() => (subject?.shots ?? []).map(candidate => ({
    id: candidate.id,
    name: candidate.label,
  })), [subject]);

  const editorValues = useMemo<EditorValues>(() => ({
    cameraDistance: settings.cameraDistance,
    cameraHeight: settings.cameraHeight,
    lightIntensity: settings.keyLight,
  }), [settings]);

  const dossier = useMemo<ShowcaseDossier>(() => ({
    name: subject?.name ?? 'Unknown unit',
    faction: subject?.faction ?? 'Archive',
    alliance: subject?.alliance ?? 'Alliance archive',
    race: subject?.race ?? 'Unknown',
    kind: subject?.kind ?? 'unit',
    icon: subject?.icon,
    category: subject?.unit?.category,
    lore: subject?.unit?.lore,
    cost: subject?.unit?.cost,
    maxSoldiers: subject?.unit?.maxSoldiers,
    isRanged: subject?.unit?.isRanged,
    stats: subject?.unit
      ? {
          attack: subject.unit.statAttack,
          defense: subject.unit.statDefense,
          speed: subject.unit.statSpeed,
          range: subject.unit.statRange,
        }
      : undefined,
  }), [subject]);

  const clearRecording = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => () => {
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  useEffect(() => {
    if (selectedShotId === 'idle') return;
    const takeTimer = window.setTimeout(() => {
      setSelectedShotId('idle');
      setShotKey(value => value + 1);
      if (!isRecording) setStatus('TAKE_COMPLETE_IDLE');
    }, 2_000);
    return () => window.clearTimeout(takeTimer);
  }, [isRecording, selectedShotId, takeToken]);

  const selectSubject = (id: string) => {
    const next = SHOWCASE_SUBJECTS.find(candidate => candidate.id === id);
    if (!next) return;
    setSelectedSubjectId(id);
    setSelectedShotId(next.shots[0]?.id ?? 'idle');
    setSettings(settingsForProfile(next.profile));
    setShotKey(value => value + 1);
    setTakeToken(value => value + 1);
    setStatus(`LOADED_${safeFileSegment(next.name).toUpperCase()}`);
  };

  const selectShot = (id: string) => {
    setSelectedShotId(id as ShowcaseShotId);
    setShotKey(value => value + 1);
    setTakeToken(value => value + 1);
    setStatus(`PREVIEW_${id.toUpperCase()}_02_SEC`);
  };

  const changeEditorValue = (key: keyof EditorValues, value: number) => {
    setSettings(current => ({
      ...current,
      ...(key === 'cameraDistance' ? { cameraDistance: value } : {}),
      ...(key === 'cameraHeight' ? { cameraHeight: value } : {}),
      ...(key === 'lightIntensity' ? { keyLight: value } : {}),
    }));
  };

  const captureScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setStatus('CANVAS_LOADING');
      return;
    }
    setIsBusy(true);
    setStatus('CAPTURING_PNG');
    canvas.toBlob(blob => {
      if (!blob) {
        setStatus('PNG_CAPTURE_UNAVAILABLE');
      } else {
        downloadBlob(blob, `${safeFileSegment(subject.name)}-${selectedShotId}.png`);
        setStatus('PNG_SAVED');
      }
      setIsBusy(false);
    }, 'image/png');
  };

  const toggleRecord = () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setStatus('WEBM_RECORDING_UNSUPPORTED');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
    if (!mimeType) {
      setStatus('WEBM_RECORDING_UNSUPPORTED');
      return;
    }

    try {
      // Restart the chosen two-second take before the first recorded frame.
      setShotKey(value => value + 1);
      setTakeToken(value => value + 1);
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 9_000_000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (chunks.length) {
          downloadBlob(new Blob(chunks, { type: mimeType }), `${safeFileSegment(subject.name)}-${selectedShotId}-2sec.webm`);
          setStatus('WEBM_SAVED');
        } else {
          setStatus('RECORDING_EMPTY');
        }
        clearRecording();
      };
      recorder.onerror = () => {
        setStatus('WEBM_RECORDING_FAILED');
        clearRecording();
      };
      recorder.start(100);
      setIsRecording(true);
      setStatus(`RECORDING_${selectedShotId.toUpperCase()}_02_SEC`);
      stopTimerRef.current = window.setTimeout(() => recorder.stop(), 2_000);
    } catch {
      setStatus('WEBM_RECORDING_UNSUPPORTED');
      clearRecording();
    }
  };

  if (!subject || !shot) return null;

  const accent = SHOWCASE_RACE_COLORS[subject.race];

  return (
    <main style={{ position: 'absolute', inset: 0, background: '#080d16', overflow: 'hidden' }}>
      <ShowcaseScene
        subject={subject}
        shot={shot}
        shotKey={shotKey}
        settings={settings}
        onCanvasReady={canvas => { canvasRef.current = canvas; }}
      />
      <ShowcaseControlPanel
        subjectGroups={subjectGroups}
        dossier={dossier}
        accent={accent}
        selectedSubjectId={selectedSubjectId}
        selectedShotId={selectedShotId}
        shotList={shotList}
        editorValues={editorValues}
        isBusy={isBusy}
        isRecording={isRecording}
        status={status}
        onSelectSubject={selectSubject}
        onSelectShot={selectShot}
        onChangeEditorValue={changeEditorValue}
        onCaptureScreenshot={captureScreenshot}
        onToggleRecord={toggleRecord}
        onReturn={onReturn}
      />
    </main>
  );
}