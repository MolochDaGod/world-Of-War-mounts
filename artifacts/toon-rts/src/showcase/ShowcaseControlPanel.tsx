import React from 'react';
import {
  Aperture,
  ArrowLeft,
  Camera,
  Coins,
  Crosshair,
  Gauge,
  Layers,
  Maximize,
  Shield,
  Square,
  Sun,
  Swords,
  Target,
  Video,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Subject {
  id: string;
  name: string;
  race: string;
  category: string;
  kind: 'unit' | 'hero';
}

export interface SubjectGroup {
  id: string;
  name: string;
  alliance: string;
  subjects: Subject[];
}

export interface Shot {
  id: string;
  name: string;
}

export interface EditorValues {
  cameraDistance: number;
  cameraHeight: number;
  lightIntensity: number;
}

export interface ShowcaseDossier {
  name: string;
  faction: string;
  alliance: string;
  race: string;
  kind: 'unit' | 'hero';
  icon?: string;
  category?: string;
  lore?: string;
  cost?: number;
  maxSoldiers?: number;
  isRanged?: boolean;
  stats?: {
    attack: number;
    defense: number;
    speed: number;
    range: number;
  };
}

export interface ShowcaseControlPanelProps {
  subjectGroups: SubjectGroup[];
  dossier: ShowcaseDossier;
  accent: string;
  selectedSubjectId: string;
  selectedShotId: string;
  shotList: Shot[];
  editorValues: EditorValues;
  isBusy?: boolean;
  isRecording?: boolean;
  status?: string;
  onSelectSubject: (id: string) => void;
  onSelectShot: (id: string) => void;
  onChangeEditorValue: (key: keyof EditorValues, value: number) => void;
  onCaptureScreenshot: () => void;
  onToggleRecord: () => void;
  onReturn: () => void;
}

const styles = `
  .showcase-hud {
    position: absolute;
    inset: 0;
    z-index: 100;
    color: #edf3ff;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    pointer-events: none;
    overflow: hidden;
  }
  .showcase-hud button, .showcase-hud input { font: inherit; }
  .showcase-topbar {
    position: absolute;
    inset: 24px 30px auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: auto;
  }
  .return-button, .status-pip, .capture-button, .director-button {
    border: 1px solid rgba(232, 220, 190, 0.22);
    background: rgba(5, 8, 14, 0.72);
    box-shadow: 0 14px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(16px);
  }
  .return-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #f5edda;
    padding: 9px 13px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
    transition: border-color .2s, background .2s, transform .2s;
  }
  .return-button:hover { border-color: rgba(232, 220, 190, .7); background: rgba(20, 25, 35, .88); transform: translateY(-1px); }
  .status-pip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    color: rgba(239,245,255,.72);
    font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .12em;
  }
  .status-dot { width: 7px; height: 7px; border-radius: 999px; box-shadow: 0 0 12px currentColor; }
  .unit-header {
    position: absolute;
    left: 30px;
    top: 88px;
    max-width: min(400px, calc(100vw - 60px));
    text-shadow: 0 2px 20px rgba(0,0,0,.75);
  }
  .unit-kicker {
    display: flex;
    gap: 8px;
    align-items: center;
    color: rgba(238,245,255,.62);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .18em;
    margin-bottom: 8px;
  }
  .unit-header h1 {
    margin: 0;
    color: #fff8e9;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 600;
    letter-spacing: -.035em;
    font-size: clamp(30px, 4vw, 54px);
    line-height: .95;
  }
  .unit-subtitle {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 11px;
    color: rgba(230,238,255,.76);
    font-size: 11px;
    letter-spacing: .07em;
    text-transform: uppercase;
  }
  .unit-subtitle span { display: inline-flex; align-items: center; gap: 5px; }
  .showcase-bottom {
    position: absolute;
    inset: auto 0 0;
    display: grid;
    grid-template-rows: auto auto;
    gap: 9px;
    padding: 0 30px 24px;
    pointer-events: none;
  }
  .roster-ribbon {
    display: flex;
    gap: 18px;
    max-width: 100%;
    overflow-x: auto;
    padding: 8px 4px 4px;
    scrollbar-width: thin;
    pointer-events: auto;
  }
  .roster-group {
    min-width: max-content;
    display: grid;
    gap: 6px;
  }
  .roster-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    color: rgba(226,235,252,.5);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: .13em;
    white-space: nowrap;
  }
  .roster-heading b { color: rgba(250,242,219,.8); font-weight: 700; }
  .roster-items { display: flex; gap: 5px; }
  .roster-unit {
    width: 78px;
    min-height: 37px;
    padding: 6px 7px;
    border: 1px solid rgba(230,240,255,.1);
    background: rgba(6,10,17,.62);
    color: rgba(230,240,255,.66);
    cursor: pointer;
    text-align: left;
    font-size: 9px;
    line-height: 1.1;
    letter-spacing: .02em;
    overflow: hidden;
    transition: all .18s ease;
  }
  .roster-unit:hover { border-color: rgba(255,255,255,.36); color: #fff; transform: translateY(-1px); }
  .roster-unit.is-selected { color: #111927; font-weight: 800; box-shadow: 0 8px 18px rgba(0,0,0,.32); }
  .command-deck {
    display: grid;
    grid-template-columns: minmax(230px, 1.2fr) minmax(320px, 1.8fr) minmax(260px, 1.35fr);
    gap: 0;
    border: 1px solid rgba(232, 220, 190, .18);
    background:
      linear-gradient(130deg, rgba(11,16,28,.92), rgba(7,10,17,.88) 55%, rgba(8,13,22,.94)),
      rgba(5,8,14,.86);
    box-shadow: 0 -14px 50px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05);
    backdrop-filter: blur(18px);
    pointer-events: auto;
  }
  .deck-section { min-width: 0; padding: 15px 17px; border-right: 1px solid rgba(225,236,255,.1); }
  .deck-section:last-child { border-right: 0; }
  .dossier-row { display: flex; gap: 12px; align-items: flex-start; }
  .dossier-icon {
    flex: 0 0 45px;
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.16);
    background: rgba(0,0,0,.25);
    overflow: hidden;
  }
  .dossier-icon img { width: 100%; height: 100%; object-fit: cover; opacity: .9; }
  .dossier-icon span { font: 700 12px/1 Georgia, serif; color: #fff7e7; }
  .dossier-copy { min-width: 0; flex: 1; }
  .dossier-copy h2 { margin: 0; font: 600 17px/1.05 Georgia, serif; color: #fff8ea; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dossier-copy p { margin: 5px 0 0; font-size: 10px; line-height: 1.34; color: rgba(228,236,249,.65); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .health-line { margin-top: 12px; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; color: rgba(237,245,255,.62); font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .1em; }
  .health-track { height: 5px; background: rgba(255,255,255,.1); overflow: hidden; }
  .health-value { height: 100%; box-shadow: 0 0 12px currentColor; }
  .unit-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 9px; }
  .unit-tag { border: 1px solid rgba(255,255,255,.12); color: rgba(236,244,255,.65); padding: 3px 5px; font: 700 8px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
  .stat-grid { display: grid; grid-template-columns: repeat(4, minmax(45px, 1fr)); gap: 8px; }
  .stat { min-width: 0; }
  .stat-label { display: flex; align-items: center; gap: 4px; color: rgba(229,238,255,.52); font-size: 8px; text-transform: uppercase; letter-spacing: .08em; }
  .stat-value { color: #fff7e7; font: 700 17px/1.15 Georgia, serif; margin-top: 4px; }
  .stat-meter { height: 3px; margin-top: 5px; background: rgba(255,255,255,.09); overflow: hidden; }
  .stat-meter i { display: block; height: 100%; }
  .section-label { display: flex; align-items: center; gap: 6px; color: rgba(230,239,255,.52); font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: .13em; margin-bottom: 11px; }
  .take-strip { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 4px; }
  .take-button {
    border: 1px solid rgba(232,242,255,.12);
    background: rgba(0,0,0,.2);
    color: rgba(229,239,255,.66);
    padding: 7px 9px;
    min-width: 71px;
    cursor: pointer;
    font-size: 8px;
    line-height: 1.15;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: .07em;
    transition: all .16s ease;
  }
  .take-button:hover { color: #fff; border-color: rgba(255,255,255,.4); }
  .take-button.is-selected { color: #101725; font-weight: 900; }
  .utility-row { display: flex; gap: 7px; margin-top: 12px; }
  .capture-button, .director-button {
    color: rgba(243,249,255,.84);
    min-height: 34px;
    border-color: rgba(232,242,255,.14);
    cursor: pointer;
    padding: 7px 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: .09em;
    text-transform: uppercase;
    transition: all .16s ease;
  }
  .capture-button:hover, .director-button:hover { color: #fff; background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.36); }
  .capture-button:disabled { opacity: .48; cursor: not-allowed; }
  .recording { color: #ff8e8e; border-color: rgba(255,100,100,.52); background: rgba(110,12,15,.28); }
  .studio-controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 9px; }
  .studio-control label { display: flex; justify-content: space-between; gap: 4px; color: rgba(228,238,255,.5); font-size: 8px; letter-spacing: .08em; }
  .studio-control output { color: rgba(255,247,228,.84); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .studio-control input { width: 100%; accent-color: var(--accent); margin-top: 6px; }
  @media (max-width: 920px) {
    .showcase-topbar { inset: 14px 16px auto; }
    .unit-header { left: 17px; top: 65px; max-width: min(360px, calc(100vw - 34px)); }
    .showcase-bottom { padding: 0 12px 13px; gap: 5px; }
    .command-deck { grid-template-columns: 1fr 1fr; }
    .deck-section:first-child { grid-column: 1 / -1; border-right: 0; border-bottom: 1px solid rgba(225,236,255,.1); }
    .deck-section:nth-child(2) { border-right: 1px solid rgba(225,236,255,.1); }
    .roster-ribbon { gap: 11px; }
  }
  @media (max-width: 620px) {
    .unit-header h1 { font-size: 30px; }
    .unit-header { top: 64px; }
    .unit-subtitle { font-size: 9px; margin-top: 8px; }
    .status-pip { padding: 7px; font-size: 8px; max-width: 144px; overflow: hidden; white-space: nowrap; }
    .return-button { padding: 8px; font-size: 0; }
    .return-button svg { width: 15px; height: 15px; }
    .showcase-bottom { padding: 0 7px 7px; }
    .roster-ribbon { padding: 4px 1px 2px; }
    .roster-group { gap: 4px; }
    .roster-heading { font-size: 8px; }
    .roster-unit { width: 65px; min-height: 33px; font-size: 8px; padding: 5px; }
    .command-deck { grid-template-columns: 1fr; max-height: 43vh; overflow-y: auto; }
    .deck-section, .deck-section:nth-child(2) { border-right: 0; border-bottom: 1px solid rgba(225,236,255,.1); padding: 11px; }
    .deck-section:last-child { border-bottom: 0; }
    .dossier-copy p { -webkit-line-clamp: 1; }
    .stat-grid { gap: 6px; }
    .stat-value { font-size: 15px; }
    .take-button { min-width: 65px; padding: 6px; }
    .studio-controls { gap: 6px; }
  }
`;

interface SliderProps {
  label: string;
  icon: LucideIcon;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function StudioSlider({ label, icon: Icon, value, min, max, step, onChange }: SliderProps) {
  return (
    <div className="studio-control">
      <label><span><Icon size={9} /> {label}</span><output>{value.toFixed(1)}</output></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} />
    </div>
  );
}

function Stat({ label, value, accent, icon: Icon }: { label: string; value: number; accent: string; icon: LucideIcon }) {
  return (
    <div className="stat">
      <div className="stat-label"><Icon size={9} /> {label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-meter"><i style={{ width: `${Math.min(100, value)}%`, background: accent }} /></div>
    </div>
  );
}

export function ShowcaseControlPanel({
  subjectGroups,
  dossier,
  accent,
  selectedSubjectId,
  selectedShotId,
  shotList,
  editorValues,
  isBusy = false,
  isRecording = false,
  status = 'ARCHIVE_READY',
  onSelectSubject,
  onSelectShot,
  onChangeEditorValue,
  onCaptureScreenshot,
  onToggleRecord,
  onReturn,
}: ShowcaseControlPanelProps) {
  const stats = dossier.stats;

  return (
    <>
      <style>{styles}</style>
      <main className="showcase-hud" style={{ '--accent': accent } as React.CSSProperties}>
        <div className="showcase-topbar">
          <button className="return-button" type="button" onClick={onReturn} aria-label="Return to base">
            <ArrowLeft size={15} /> Return to base
          </button>
          <div className="status-pip">
            <span className="status-dot" style={{ color: isRecording ? '#ff5e67' : accent, background: 'currentColor' }} />
            {status.replaceAll('_', ' ')}
          </div>
        </div>

        <header className="unit-header">
          <div className="unit-kicker"><Aperture size={13} /> Living archive / {dossier.alliance}</div>
          <h1>{dossier.name}</h1>
          <div className="unit-subtitle">
            <span><Target size={11} /> {dossier.faction}</span>
            <span><Layers size={11} /> {dossier.category ?? dossier.kind}</span>
            <span>{dossier.isRanged ? 'Ranged doctrine' : 'Melee doctrine'}</span>
          </div>
        </header>

        <div className="showcase-bottom">
          <nav className="roster-ribbon" aria-label="Unit roster">
            {subjectGroups.map(group => (
              <section className="roster-group" key={group.id}>
                <div className="roster-heading"><b>{group.name}</b><span>{group.alliance}</span></div>
                <div className="roster-items">
                  {group.subjects.map(subject => {
                    const selected = subject.id === selectedSubjectId;
                    return (
                      <button
                        className={`roster-unit${selected ? ' is-selected' : ''}`}
                        type="button"
                        key={subject.id}
                        onClick={() => onSelectSubject(subject.id)}
                        style={selected ? { background: accent, borderColor: accent } : undefined}
                        title={`${subject.name} · ${subject.race}`}
                      >
                        {subject.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <section className="command-deck">
            <article className="deck-section">
              <div className="dossier-row">
                <div className="dossier-icon">
                  {dossier.icon ? <img src={dossier.icon} alt="" /> : <span>{dossier.name.slice(0, 1)}</span>}
                </div>
                <div className="dossier-copy">
                  <h2>{dossier.name}</h2>
                  <p>{dossier.lore ?? 'A commander whose battlefield record is preserved in the alliance archive.'}</p>
                </div>
              </div>
              <div className="health-line">
                <span>VITALITY</span>
                <div className="health-track"><div className="health-value" style={{ width: '100%', background: accent, color: accent }} /></div>
                <strong>100%</strong>
              </div>
              <div className="unit-tags">
                <span className="unit-tag">{dossier.kind === 'hero' ? 'Commander' : dossier.category ?? 'Unit'}</span>
                {dossier.cost !== undefined && <span className="unit-tag"><Coins size={9} /> {dossier.cost} gold</span>}
                {dossier.maxSoldiers !== undefined && <span className="unit-tag">{dossier.maxSoldiers} strong</span>}
              </div>
            </article>

            <article className="deck-section">
              <div className="section-label"><Gauge size={11} /> Field profile</div>
              {stats ? (
                <div className="stat-grid">
                  <Stat label="Attack" value={stats.attack} accent={accent} icon={Swords} />
                  <Stat label="Defense" value={stats.defense} accent={accent} icon={Shield} />
                  <Stat label="Speed" value={stats.speed} accent={accent} icon={Wind} />
                  <Stat label="Range" value={stats.range} accent={accent} icon={Crosshair} />
                </div>
              ) : (
                <div className="stat-grid">
                  <Stat label="Command" value={100} accent={accent} icon={Swords} />
                  <Stat label="Resolve" value={100} accent={accent} icon={Shield} />
                  <Stat label="Presence" value={100} accent={accent} icon={Wind} />
                  <Stat label="Reach" value={45} accent={accent} icon={Crosshair} />
                </div>
              )}
              <div className="unit-tags">
                <span className="unit-tag">{dossier.race}</span>
                <span className="unit-tag">{dossier.alliance}</span>
              </div>
            </article>

            <article className="deck-section">
              <div className="section-label"><Camera size={11} /> Animation take</div>
              <div className="take-strip">
                {shotList.map(shot => {
                  const selected = shot.id === selectedShotId;
                  return (
                    <button
                      key={shot.id}
                      type="button"
                      className={`take-button${selected ? ' is-selected' : ''}`}
                      onClick={() => onSelectShot(shot.id)}
                      style={selected ? { background: accent, borderColor: accent } : undefined}
                    >
                      {shot.name}
                    </button>
                  );
                })}
              </div>
              <div className="utility-row">
                <button className="capture-button" type="button" disabled={isBusy} onClick={onCaptureScreenshot}>
                  <Camera size={12} /> Capture
                </button>
                <button className={`capture-button${isRecording ? ' recording' : ''}`} type="button" disabled={isBusy && !isRecording} onClick={onToggleRecord}>
                  {isRecording ? <Square size={11} fill="currentColor" /> : <Video size={12} />}
                  {isRecording ? 'Stop rec' : 'Record'}
                </button>
              </div>
              <div className="studio-controls">
                <StudioSlider label="Distance" icon={Maximize} value={editorValues.cameraDistance} min={4} max={28} step={0.5} onChange={value => onChangeEditorValue('cameraDistance', value)} />
                <StudioSlider label="Height" icon={Layers} value={editorValues.cameraHeight} min={1} max={12} step={0.5} onChange={value => onChangeEditorValue('cameraHeight', value)} />
                <StudioSlider label="Key" icon={Sun} value={editorValues.lightIntensity} min={0.5} max={5} step={0.1} onChange={value => onChangeEditorValue('lightIntensity', value)} />
              </div>
            </article>
          </section>
        </div>
      </main>
    </>
  );
}